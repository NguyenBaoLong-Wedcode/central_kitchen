package com.groupSWP.centralkitchenplatform.service.inventory;

import com.groupSWP.centralkitchenplatform.dto.logistics.ReportShipmentRequest;
import com.groupSWP.centralkitchenplatform.entities.auth.Account;
import com.groupSWP.centralkitchenplatform.entities.auth.Store;
import com.groupSWP.centralkitchenplatform.entities.logistic.*;
import com.groupSWP.centralkitchenplatform.entities.notification.Notification; // 🔥
import com.groupSWP.centralkitchenplatform.entities.product.Stock;
import com.groupSWP.centralkitchenplatform.entities.product.StockKey;

import com.groupSWP.centralkitchenplatform.repositories.auth.AccountRepository;
import com.groupSWP.centralkitchenplatform.repositories.inventory.StockRepository;
import com.groupSWP.centralkitchenplatform.repositories.logistic.ShipmentRepository;
import com.groupSWP.centralkitchenplatform.repositories.logistic.ShipmentDetailRepository;
import com.groupSWP.centralkitchenplatform.repositories.order.OrderRepository;
import com.groupSWP.centralkitchenplatform.service.notification.NotificationService; // 🔥
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShipmentService {

    private final ShipmentRepository shipmentRepository;
    private final ShipmentDetailRepository shipmentDetailRepository;
    private final OrderRepository orderRepository;
    private final AccountRepository accountRepository;
    private final StockRepository stockRepository;
    private final NotificationService notificationService;

    // =========================================================================
    // 🔥 TỰ ĐỘNG CHỐT ĐƠN VÀ CỘNG KHO SAU 6 TIẾNG QUÁ HẠN (CRON JOB)
    // =========================================================================
    @Transactional
    @Scheduled(cron = "0 */30 * * * *")
    public void autoResolveOverdueShipments() {
        LocalDateTime sixHoursAgo = LocalDateTime.now().minusHours(6);
        List<Shipment> overdueShipments = shipmentRepository.findByStatusAndDeliveredAtBefore(
                Shipment.ShipmentStatus.DELIVERED, sixHoursAgo
        );

        if (overdueShipments.isEmpty()) return;

        int count = 0;
        for (Shipment shipment : overdueShipments) {
            try {
                // Nhận tự động với tư cách ADMIN để bypass
                reportIssue(shipment.getShipmentId(), "ADMIN", null);
                count++;

                // 🔥 THÔNG BÁO SAU KHI ROBOT CHỐT ĐƠN THÀNH CÔNG
                if (shipment.getOrders() != null && !shipment.getOrders().isEmpty()) {
                    Store targetStore = shipment.getOrders().get(0).getStore();

                    // 1. Báo cáo lên cho MANAGER nắm tình hình (Biết chi nhánh nào đang lười)
                    notificationService.broadcastNotification(
                            List.of("MANAGER"),
                            "🤖 TỰ ĐỘNG CHỐT ĐƠN QUÁ HẠN",
                            "Chuyến xe " + shipment.getShipmentId() + " của cửa hàng " + targetStore.getName() + " đã quá hạn 6 tiếng. Hệ thống đã tự động chốt sổ và cộng kho!",
                            Notification.NotificationType.WARNING
                    );

                    // 2. Cảnh cáo trực tiếp ông Cửa hàng trưởng của tiệm đó
                    if (targetStore.getAccount() != null) {
                        notificationService.sendNotification(
                                targetStore.getAccount(),
                                "⏰ QUÁ HẠN XÁC NHẬN HÀNG",
                                "Bạn đã quên xác nhận chuyến xe " + shipment.getShipmentId() + " quá 6 tiếng. Hệ thống đã tự động chốt nhận ĐỦ 100% hàng vào kho. Bạn không thể khiếu nại thiếu hàng cho chuyến này nữa!",
                                Notification.NotificationType.WARNING,
                                null
                        );
                    }
                }

            } catch (Exception e) {
                log.error("Lỗi khi tự động chốt chuyến xe {}: {}", shipment.getShipmentId(), e.getMessage());
            }
        }
        log.info("Đã tự động chốt và cộng kho thành công cho {} chuyến xe quá hạn 6 tiếng.", count);
    }

    // =========================================================================
    // 🔥 BÁO CÁO CỘNG KHO - BẢO MẬT CHÍNH CHỦ
    // =========================================================================
    @Transactional
    public String reportIssue(String shipmentId, String requestingStoreId, ReportShipmentRequest request) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến giao hàng!"));

        if (shipment.getOrders() == null || shipment.getOrders().isEmpty()) {
            throw new RuntimeException("Chuyến xe rỗng, không thể xác định cửa hàng nhận!");
        }

        Store targetStore = shipment.getOrders().get(0).getStore();

        if (!"ADMIN".equals(requestingStoreId) && !targetStore.getStoreId().equals(requestingStoreId)) {
            throw new RuntimeException("Lỗi bảo mật: Bạn không có quyền xem hoặc xác nhận cho chuyến xe của cửa hàng khác!");
        }

        if (shipment.getStatus() != Shipment.ShipmentStatus.DELIVERED) {
            throw new RuntimeException("Chuyến xe chưa được đánh dấu là Đã Tới Nơi!");
        }

        boolean hasIssue = false;
        List<String> missingItemNames = new ArrayList<>();

        // ==============================================================
        // 1. TẠO BẢN ĐỒ CÁC MÓN BỊ BÁO CÁO THIẾU TỪ FRONTEND
        // ==============================================================
        Map<String, Integer> reportedQuantities = new HashMap<>();
        Map<String, String> reportedNotes = new HashMap<>();

        if (request != null && request.getReportedItems() != null) {
            for (ReportShipmentRequest.ItemReport report : request.getReportedItems()) {
                reportedQuantities.put(report.getProductId(), report.getReceivedQuantity());
                reportedNotes.put(report.getProductId(), report.getNote());
            }
        }

        // ==============================================================
        // 🔥 2. DUYỆT QUA TẤT CẢ CÁC MÓN TRÊN XE ĐỂ CẬP NHẬT CHÍNH XÁC
        // ==============================================================
        for (ShipmentDetail detail : shipment.getShipmentDetails()) {
            String productId = detail.getProduct().getProductId();

            if (reportedQuantities.containsKey(productId)) {
                // TRƯỜNG HỢP A: Có gửi báo cáo -> Cập nhật số lượng thực nhận từ FE
                detail.setReceivedQuantity(reportedQuantities.get(productId));
                detail.setIssueNote(reportedNotes.get(productId));
            } else {
                // TRƯỜNG HỢP B: FE không nhắc tới -> Tự động đánh dấu nhận đủ 100%
                detail.setReceivedQuantity(detail.getExpectedQuantity());
                detail.setIssueNote("Nhận đủ");
            }

            // Gọi hàm getMissingQuantity() của Entity để kiểm tra xem có thiếu hay không
            if (detail.getMissingQuantity() > 0) {
                hasIssue = true;
                missingItemNames.add(detail.getProduct().getProductName() + " (Thiếu: " + detail.getMissingQuantity() + ")");
            }
        }

        // ==============================================================
        // 3. CỘNG DỒN KHO CHO CỬA HÀNG (Chỉ cộng những món có Thực nhận > 0)
        // ==============================================================
        String storeId = targetStore.getStoreId();
        List<StockKey> stockKeys = shipment.getShipmentDetails().stream()
                .filter(d -> d.getReceivedQuantity() > 0)
                .map(d -> new StockKey(storeId, d.getProduct().getProductId()))
                .toList();

        Map<StockKey, Stock> existingStocksMap = stockRepository.findAllById(stockKeys)
                .stream()
                .collect(Collectors.toMap(Stock::getId, s -> s));

        List<Stock> stocksToSave = new ArrayList<>();

        for (ShipmentDetail detail : shipment.getShipmentDetails()) {
            if (detail.getReceivedQuantity() > 0) {
                StockKey key = new StockKey(storeId, detail.getProduct().getProductId());
                Stock stock = existingStocksMap.getOrDefault(key, new Stock());

                if (stock.getId() == null) {
                    stock.setId(key);
                    stock.setQuantity(0);
                    stock.setStore(targetStore);
                    stock.setProduct(detail.getProduct());
                }

                // Cộng dồn đúng số lượng thực tế cửa hàng nhận được
                stock.setQuantity(stock.getQuantity() + detail.getReceivedQuantity());
                stocksToSave.add(stock);
            }
        }

        stockRepository.saveAll(stocksToSave);
        log.info("Đã cập nhật kho cho cửa hàng {} từ chuyến xe {}", storeId, shipmentId);

        // ==============================================================
        // 4. CẬP NHẬT TRẠNG THÁI VÀ BẮN THÔNG BÁO
        // ==============================================================
        shipment.setStatus(hasIssue ? Shipment.ShipmentStatus.ISSUE_REPORTED : Shipment.ShipmentStatus.RESOLVED);
        shipmentRepository.save(shipment);

        Order.OrderStatus finalOrderStatus = hasIssue ? Order.OrderStatus.PARTIAL_RECEIVED : Order.OrderStatus.DONE;
        if (shipment.getOrders() != null) {
            shipment.getOrders().forEach(o -> o.setStatus(finalOrderStatus));
            orderRepository.saveAll(shipment.getOrders());
        }

        if (hasIssue) {
            String missingDetails = String.join(", ", missingItemNames);
            notificationService.broadcastNotification(
                    List.of("COORDINATOR", "KITCHEN_MANAGER","MANAGER"),
                    "⚠️ KHIẾU NẠI THIẾU HÀNG",
                    "Cửa hàng " + targetStore.getName() + " vừa báo thiếu hàng tại chuyến " + shipmentId + ". Chi tiết: " + missingDetails + ". Vui lòng xử lý đền bù!",
                    Notification.NotificationType.WARNING
            );
            return "Đã ghi nhận sự cố thiếu hàng. Đã báo cho Bếp trung tâm lên đơn bù!";
        } else {
            return "Xác nhận nhận đủ hàng. Kho cửa hàng đã được cập nhật!";
        }
    }

    // =========================================================================
    // 🔥 TẠO ĐƠN ĐỀN BÙ (CÁCH 1: QUY TRÌNH CHẶT CHẼ - BẾP PHẢI NẤU LẠI)
    // =========================================================================
    @Transactional
    public String createReplacementShipment(String originalShipmentId) {
        Shipment originalShipment = shipmentRepository.findById(originalShipmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến hàng gốc!"));

        if (originalShipment.getStatus() != Shipment.ShipmentStatus.ISSUE_REPORTED) {
            throw new RuntimeException("Chuyến hàng này không có báo cáo thiếu/lỗi để bù!");
        }

        // 1. TẠO ĐƠN HÀNG BÙ (Không tạo chuyến xe vội)
        Order compensationOrder = new Order();
        String compOrderId = "COMP-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        compensationOrder.setOrderId(compOrderId);
        compensationOrder.setOrderType(Order.OrderType.COMPENSATION);
        compensationOrder.setStatus(Order.OrderStatus.NEW); // 🔥 Trạng thái NEW để Bếp nhìn thấy và lấy đi nấu
        compensationOrder.setNote("Đơn bù hàng thiếu cho chuyến xe: " + originalShipmentId);
        compensationOrder.setTotalAmount(java.math.BigDecimal.ZERO); // Hàng bù nên tổng tiền đơn = 0

        if (originalShipment.getOrders() != null && !originalShipment.getOrders().isEmpty()) {
            compensationOrder.setStore(originalShipment.getOrders().get(0).getStore());
        } else {
            throw new RuntimeException("Không xác định được cửa hàng để tạo đơn bù!");
        }

        List<OrderItem> compItems = new ArrayList<>();
        boolean hasMissingItems = false;

        // Quét các món bị thiếu để đưa vào Đơn bù
        for (ShipmentDetail oldDetail : originalShipment.getShipmentDetails()) {
            int missingQty = oldDetail.getMissingQuantity();
            if (missingQty > 0) {
                hasMissingItems = true;

                OrderItem item = new OrderItem();
                // Dùng OrderItemKey ghép từ ID Đơn bù và ID Sản phẩm
                item.setId(new OrderItemKey(compOrderId, oldDetail.getProduct().getProductId()));
                item.setOrder(compensationOrder);
                item.setProduct(oldDetail.getProduct());
                item.setQuantity(missingQty); // Đòi đúng số lượng bị thiếu
                item.setPriceAtOrder(java.math.BigDecimal.ZERO); // Đơn giá = 0

                compItems.add(item);
            }
        }

        if (!hasMissingItems) {
            throw new RuntimeException("Không tìm thấy sản phẩm nào bị thiếu để tạo đơn bù!");
        }

        compensationOrder.setOrderItems(compItems);

        // Lưu Đơn hàng bù xuống DB (Hibernate sẽ tự động lưu các OrderItem nếu có cascade)
        orderRepository.save(compensationOrder);

        // 2. ĐÓNG HỒ SƠ CHUYẾN XE CŨ (RESOLVED)
        originalShipment.setStatus(Shipment.ShipmentStatus.RESOLVED);
        originalShipment.setResolvedAt(LocalDateTime.now());
        shipmentRepository.save(originalShipment);

        // ===================================================================
        // 🔥 THÔNG BÁO: BÁO TIN VUI CHO CỬA HÀNG TRƯỞNG LÀ ĐÃ DUYỆT ĐƠN ĐỀN BÙ
        // ===================================================================
        if (originalShipment.getOrders() != null && !originalShipment.getOrders().isEmpty()) {
            Account storeAcc = originalShipment.getOrders().get(0).getStore().getAccount();
            if (storeAcc != null) {
                notificationService.sendNotification(
                        storeAcc,
                        "🎁 ĐƠN ĐỀN BÙ ĐÃ TẠO",
                        "Khiếu nại thiếu hàng của bạn tại chuyến " + originalShipmentId + " đã được duyệt! Đơn đền bù mã " + compOrderId + " đã được chuyển xuống Bếp để xử lý.",
                        Notification.NotificationType.SUCCESS,
                        null
                );
            }
        }

        return "Đã tạo ĐƠN BÙ thành công! Mã đơn: " + compOrderId + ". Đơn đã được đẩy về hàng đợi (NEW) chờ Bếp Trung Tâm xử lý và trừ kho.";
    }

    // =========================================================================
    // 🔥 GÁN TÀI XẾ
    // =========================================================================
    @Transactional
    public void assignDriverToShipment(String shipmentId, String accountId) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến xe: " + shipmentId));

        if (shipment.getStatus() != Shipment.ShipmentStatus.PENDING) {
            throw new RuntimeException("Lỗi: Chỉ có thể gán tài xế cho chuyến xe đang ở trạng thái PENDING (Chờ xuất phát)!");
        }

        Account driver = accountRepository.findById(UUID.fromString(accountId))
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản tài xế!"));

        shipment.setDriver(driver);
        shipment.setDriverName(driver.getUsername());
        shipment.setVehiclePlate(null);

        shipment.setStatus(Shipment.ShipmentStatus.SHIPPING);

        if (shipment.getOrders() != null && !shipment.getOrders().isEmpty()) {
            LocalDateTime now = LocalDateTime.now();
            shipment.getOrders().forEach(order -> {
                order.setStatus(Order.OrderStatus.SHIPPING);
                order.setShippingStartTime(now);
            });
            orderRepository.saveAll(shipment.getOrders());
        }

        shipmentRepository.save(shipment);
        log.info("Đã gán tài xế {} cho chuyến xe {}.", driver.getUsername(), shipmentId);

        // 🔥 THÔNG BÁO: Báo cho Store Manager là xe bắt đầu chạy
        if (shipment.getOrders() != null && !shipment.getOrders().isEmpty()) {
            Account storeAcc = shipment.getOrders().get(0).getStore().getAccount();
            if (storeAcc != null) {
                notificationService.sendNotification(
                        storeAcc,
                        "🛵 TÀI XẾ ĐANG TỚI",
                        "Chuyến xe " + shipmentId + " đã được gán tài xế " + driver.getUsername() + " và đang trên đường đến!",
                        Notification.NotificationType.INFO,
                        null
                );
            }
        }
    }

    // =========================================================================
    // 🔥 TÀI XẾ BẤM "GIAO XONG" - BẢO MẬT CHÍNH CHỦ
    // =========================================================================
    @Transactional
    public void markShipmentAsDelivered(String shipmentId, String currentUsername) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chuyến xe: " + shipmentId));

        if (shipment.getStatus() != Shipment.ShipmentStatus.SHIPPING) {
            throw new RuntimeException("Chuyến xe này không ở trạng thái ĐANG GIAO (SHIPPING)!");
        }

        Account currentUser = accountRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản người dùng!"));

        // 🔥 ĐÃ FIX LỖI Ở ĐÂY: Mở cửa cho cả ADMIN, MANAGER và COORDINATOR qua trạm kiểm soát
        boolean isHighLevelManager = currentUser.getRole() == Account.Role.ADMIN ||
                currentUser.getRole() == Account.Role.MANAGER ||
                currentUser.getRole() == Account.Role.COORDINATOR;

        if (!isHighLevelManager) {
            if (shipment.getDriver() == null || !shipment.getDriver().getAccountId().equals(currentUser.getAccountId())) {
                throw new RuntimeException("Lỗi bảo mật: Bạn không phải là tài xế được phân công cho chuyến xe này!");
            }
        }

        // Cập nhật trạng thái chuyến xe
        shipment.setStatus(Shipment.ShipmentStatus.DELIVERED);
        shipment.setDeliveredAt(LocalDateTime.now()); // LƯU MỐC ĐẾM GIỜ CHỐT TỰ ĐỘNG

        // Cập nhật trạng thái từng đơn hàng trong xe
        if (shipment.getOrders() != null) {
            shipment.getOrders().forEach(o -> o.setStatus(Order.OrderStatus.DELIVERED));
            orderRepository.saveAll(shipment.getOrders());
        }

        shipmentRepository.save(shipment);
        log.info("Chuyến xe {} đã tới nơi an toàn!", shipmentId);

        // 🔥 ĐÃ THÊM: Bắn thông báo cho Cửa hàng trưởng ra nhận hàng
        if (shipment.getOrders() != null && !shipment.getOrders().isEmpty()) {
            Account storeAcc = shipment.getOrders().get(0).getStore().getAccount();
            if (storeAcc != null) {
                notificationService.sendNotification(
                        storeAcc,
                        "🚚 XE ĐÃ TỚI NƠI",
                        "Chuyến xe " + shipmentId + " đã cập bến. Sếp vui lòng ra kiểm tra và chốt số lượng thực nhận trên hệ thống nhé!",
                        Notification.NotificationType.INFO,
                        null
                );
            }
        }
    }

    // =========================================================================
    // 🔥 1 ĐƠN HÀNG = 1 CHUYẾN ĐI (SHOPEE STYLE)
    // =========================================================================
    @Transactional
    public String createManualShipment(List<String> orderIds) {
        if (orderIds == null || orderIds.isEmpty()) {
            throw new RuntimeException("Vui lòng chọn ít nhất 1 đơn hàng để điều phối!");
        }

        List<Order> orders = orderRepository.findAllById(orderIds);

        boolean allReady = orders.stream().allMatch(o ->
                o.getStatus() == Order.OrderStatus.READY_TO_SHIP && o.getShipment() == null);

        if (!allReady) {
            throw new RuntimeException("Có đơn hàng không hợp lệ (đã được gán tài xế hoặc chưa ở trạng thái READY_TO_SHIP)!");
        }

        int shipmentCount = 0;
        List<Order> ordersToUpdate = new ArrayList<>();

        for (Order o : orders) {
            String timeStamp = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyMMddHHmmssSSS")) + shipmentCount;

            Shipment individualShipment = Shipment.builder()
                    .shipmentId("SHP-" + timeStamp)
                    .shipmentType(Shipment.ShipmentType.MAIN_ROUTE)
                    .status(Shipment.ShipmentStatus.PENDING)
                    .shipmentDetails(new ArrayList<>())
                    .orders(new ArrayList<>())
                    .build();

            Shipment savedShipment = shipmentRepository.save(individualShipment);

            o.setShipment(savedShipment);
            ordersToUpdate.add(o);

            List<ShipmentDetail> detailsToSave = new ArrayList<>();
            if (o.getOrderItems() != null) {
                for (OrderItem item : o.getOrderItems()) {
                    ShipmentDetail detail = ShipmentDetail.builder()
                            .shipment(savedShipment)
                            .product(item.getProduct())
                            .productName(item.getProduct().getProductName())
                            .expectedQuantity(item.getQuantity())
                            .receivedQuantity(0)
                            .build();
                    detailsToSave.add(detail);
                }
            }
            shipmentDetailRepository.saveAll(detailsToSave);
            shipmentCount++;
        }

        orderRepository.saveAll(ordersToUpdate);
        return "Đã tách và tạo thành công " + shipmentCount + " chuyến giao hàng độc lập cho từng đơn!";
    }

    // =========================================================================
    //  LẤY DANH SÁCH CÁC CHUYẾN XE BỊ BÁO CÁO THIẾU HÀNG (KÈM CHI TIẾT)
    // =========================================================================
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getReportedShipments() {
        // Lấy tất cả chuyến xe đang ở trạng thái CÓ VẤN ĐỀ
        List<Shipment> reportedShipments = shipmentRepository.findByStatus(Shipment.ShipmentStatus.ISSUE_REPORTED);

        List<Map<String, Object>> responseList = new ArrayList<>();

        for (Shipment shipment : reportedShipments) {
            Map<String, Object> shipmentData = new HashMap<>();
            shipmentData.put("shipmentId", shipment.getShipmentId());
            shipmentData.put("status", shipment.getStatus().name());
            shipmentData.put("updatedAt", shipment.getUpdatedAt());

            // Móc thông tin Cửa hàng từ Đơn hàng
            String storeName = "Không xác định";
            String storeId = "";
            if (shipment.getOrders() != null && !shipment.getOrders().isEmpty()) {
                Store store = shipment.getOrders().get(0).getStore();
                storeName = store.getName();
                storeId = store.getStoreId();
            }
            shipmentData.put("storeId", storeId);
            shipmentData.put("storeName", storeName);

            // Lọc ra CHỈ NHỮNG MÓN BỊ THIẾU để hiển thị
            List<Map<String, Object>> missingItems = new ArrayList<>();
            for (ShipmentDetail detail : shipment.getShipmentDetails()) {
                if (detail.getMissingQuantity() > 0) {
                    Map<String, Object> itemData = new HashMap<>();
                    itemData.put("productId", detail.getProduct().getProductId());
                    itemData.put("productName", detail.getProductName());
                    itemData.put("expectedQuantity", detail.getExpectedQuantity());
                    itemData.put("receivedQuantity", detail.getReceivedQuantity());
                    itemData.put("missingQuantity", detail.getMissingQuantity());
                    itemData.put("issueNote", detail.getIssueNote());
                    missingItems.add(itemData);
                }
            }
            shipmentData.put("missingItems", missingItems);

            responseList.add(shipmentData);
        }

        return responseList;
    }

    // =========================================================================
    // 🔥 CỬA HÀNG: LẤY DANH SÁCH CHUYẾN XE ĐÃ ĐẾN NƠI (CHỜ KIỂM ĐẾM)
    // =========================================================================
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPendingReportShipmentsForStore(String storeId) {
        if (storeId == null || storeId.isEmpty()) {
            throw new RuntimeException("Lỗi: Không xác định được Cửa hàng của bạn!");
        }

        // Tìm các chuyến xe đang đậu trước cửa (DELIVERED) của chính cửa hàng này
        List<Shipment> deliveredShipments = shipmentRepository.getShipmentsForStore(
                Shipment.ShipmentStatus.DELIVERED, storeId
        );

        List<Map<String, Object>> responseList = new ArrayList<>();

        for (Shipment shipment : deliveredShipments) {
            Map<String, Object> shipmentData = new HashMap<>();
            shipmentData.put("shipmentId", shipment.getShipmentId());
            shipmentData.put("driverName", shipment.getDriverName());
            shipmentData.put("deliveredAt", shipment.getDeliveredAt()); // Giờ xe tới nơi

            // Tính số phút đã trôi qua kể từ lúc xe tới (Giúp FE hiện cảnh báo sắp bị hệ thống tự chốt)
            long minutesElapsed = 0;
            if (shipment.getDeliveredAt() != null) {
                minutesElapsed = java.time.Duration.between(shipment.getDeliveredAt(), LocalDateTime.now()).toMinutes();
            }
            shipmentData.put("minutesElapsed", minutesElapsed);

            // Móc danh sách các món cần phải đếm
            List<Map<String, Object>> itemsToCheck = new ArrayList<>();
            for (ShipmentDetail detail : shipment.getShipmentDetails()) {
                Map<String, Object> itemData = new HashMap<>();
                itemData.put("productId", detail.getProduct().getProductId());
                itemData.put("productName", detail.getProductName());
                itemData.put("expectedQuantity", detail.getExpectedQuantity()); // Số lượng Bếp gửi đi
                itemsToCheck.add(itemData);
            }
            shipmentData.put("items", itemsToCheck);

            responseList.add(shipmentData);
        }

        return responseList;
    }
}