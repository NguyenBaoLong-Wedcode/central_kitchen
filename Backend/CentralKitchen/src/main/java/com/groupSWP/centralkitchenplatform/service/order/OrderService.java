package com.groupSWP.centralkitchenplatform.service.order;

import com.groupSWP.centralkitchenplatform.dto.kitchen.KitchenAggregationResponse;
import com.groupSWP.centralkitchenplatform.dto.kitchen.ProductionRequest;
import com.groupSWP.centralkitchenplatform.dto.order.*;
import com.groupSWP.centralkitchenplatform.entities.kitchen.Formula;
import com.groupSWP.centralkitchenplatform.entities.auth.Store;
import com.groupSWP.centralkitchenplatform.entities.cart.CartItem;
import com.groupSWP.centralkitchenplatform.entities.logistic.Order;
import com.groupSWP.centralkitchenplatform.entities.logistic.OrderItem;
import com.groupSWP.centralkitchenplatform.entities.logistic.OrderItemKey;
import com.groupSWP.centralkitchenplatform.entities.notification.Notification;
import com.groupSWP.centralkitchenplatform.entities.product.Product;
import com.groupSWP.centralkitchenplatform.repositories.order.OrderRepository;
import com.groupSWP.centralkitchenplatform.repositories.product.FormulaRepository;
import com.groupSWP.centralkitchenplatform.repositories.product.ProductRepository;
import com.groupSWP.centralkitchenplatform.repositories.store.StoreRepository;
import com.groupSWP.centralkitchenplatform.service.inventory.ProductionService;
import com.groupSWP.centralkitchenplatform.service.notification.NotificationService;
import com.groupSWP.centralkitchenplatform.service.system.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final ProductionService productionService;
    private final FormulaRepository formulaRepository;
    private final SystemConfigService systemConfigService;

    private final NotificationService notificationService;

    // =========================================================================
    // HÀM HELPER: KHỞI TẠO ĐƠN HÀNG VÀ CHẶN GIỜ GIẤC (DÙNG CHUNG)
    // =========================================================================
    private Order initializeOrder(Store store, boolean isUrgent, String note) {
        LocalTime now = LocalTime.now();
        LocalTime OPEN_TIME = systemConfigService.getLocalTimeConfig("OPEN_TIME", "08:00");
        LocalTime URGENT_CUTOFF = systemConfigService.getLocalTimeConfig("URGENT_CUTOFF_TIME", "10:30");
        LocalTime STANDARD_CUTOFF = systemConfigService.getLocalTimeConfig("STANDARD_CUTOFF_TIME", "13:00");
        BigDecimal URGENT_SURCHARGE = systemConfigService.getBigDecimalConfig("URGENT_SURCHARGE", "100000");

//        if (now.isBefore(OPEN_TIME)) {
//            throw new RuntimeException("Hệ thống chưa mở cửa (" + OPEN_TIME + " AM mới nhận đơn nha Sếp)!");
//        }
//        if (isUrgent && now.isAfter(URGENT_CUTOFF)) {
//            throw new RuntimeException("Đã quá " + URGENT_CUTOFF + " AM, Bếp ngưng nhận đơn GẤP rồi ạ!");
//        }
//        if (!isUrgent && now.isAfter(STANDARD_CUTOFF)) {
//            throw new RuntimeException("Đã quá " + STANDARD_CUTOFF + " PM, vui lòng chờ mai đặt đơn THƯỜNG Sếp nhé!");
//        }

        Order order = new Order();
        order.setStore(store);

        // 🔥 ĐÃ SỬA: Mới tạo đơn thì trạng thái là Chờ Thanh Toán, chưa đưa cho Bếp
        order.setStatus(Order.OrderStatus.PENDING_PAYMENT);
        order.setPaymentStatus(Order.PaymentStatus.UNPAID);

        order.setNote(note);

        BigDecimal surcharge = BigDecimal.ZERO;
        String prefix = "STD";
        if (isUrgent) {
            order.setOrderType(Order.OrderType.URGENT);
            order.setDeliveryWindow(Order.DeliveryWindow.AFTERNOON);
            order.setDeliveryDate(LocalDate.now());
            surcharge = URGENT_SURCHARGE;
            prefix = "URG";
        } else {
            order.setOrderType(Order.OrderType.STANDARD);
            order.setDeliveryWindow(Order.DeliveryWindow.MORNING);
            order.setDeliveryDate(LocalDate.now().plusDays(1));
        }

        order.setSurcharge(surcharge);
        order.setOrderId(generateSmartOrderId(prefix, store.getStoreId()));
        return order;
    }

    // =========================================================================
    // 1. TẠO ĐƠN TRỰC TIẾP "ALL IN ONE" (TỪ API MANAGER)
    // =========================================================================
    @Transactional
    public OrderResponse createOrder(OrderRequest request, boolean isUrgent) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("Giỏ hàng đang trống! Sếp vui lòng chọn ít nhất 1 món trước khi chốt đơn nhé!");
        }

        Store store = storeRepository.findById(request.getStoreId())
                .orElseThrow(() -> new RuntimeException("Cửa hàng không tồn tại: " + request.getStoreId()));

        // GỌI HÀM HELPER ĐỂ KHỞI TẠO
        Order order = initializeOrder(store, isUrgent, request.getNote());

        List<String> productIds = request.getItems().stream()
                .map(OrderRequest.OrderItemRequest::getProductId)
                .collect(Collectors.toList());

        Map<String, Product> productMap = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getProductId, p -> p));

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();

        for (OrderRequest.OrderItemRequest itemReq : request.getItems()) {
            Product product = productMap.get(itemReq.getProductId());
            if (product == null) throw new RuntimeException("Sản phẩm không hợp lệ: " + itemReq.getProductId());

            OrderItem orderItem = new OrderItem();
            orderItem.setId(new OrderItemKey(order.getOrderId(), product.getProductId()));
            orderItem.setOrder(order);
            orderItem.setProduct(product);
            orderItem.setQuantity(itemReq.getQuantity());
            orderItem.setPriceAtOrder(product.getSellingPrice());

            totalAmount = totalAmount.add(product.getSellingPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity())));
            orderItems.add(orderItem);
        }

        order.setTotalAmount(totalAmount.add(order.getSurcharge()));
        order.setOrderItems(orderItems);
        Order savedOrder = orderRepository.save(order);

        // 🔥 ĐÃ SỬA: Comment/Xóa đoạn thông báo này đi vì đơn chưa được thanh toán
        /*
        notificationService.broadcastNotification(
                List.of("KITCHEN_MANAGER", "MANAGER"),
                isUrgent ? "🚨 ĐƠN HÀNG KHẨN CẤP" : "📦 Đơn hàng mới",
                "Cửa hàng " + store.getName() + " vừa đặt đơn " + savedOrder.getOrderId(),
                isUrgent ? Notification.NotificationType.URGENT : Notification.NotificationType.INFO
        );
        */

        // 🔥 ĐÃ SỬA: Thay đổi câu thông báo trả về cho FE
        return buildOrderResponse(savedOrder, isUrgent ? "Tạo đơn KHẨN CẤP thành công! Vui lòng thanh toán để Bếp chuẩn bị." : "Tạo đơn TIÊU CHUẨN thành công! Vui lòng thanh toán để Bếp chuẩn bị.");
    }

    // =========================================================================
    // 2. TẠO ĐƠN TRỰC TIẾP TỪ GIỎ HÀNG (TỪ API STORE)
    // =========================================================================
    @Transactional(rollbackFor = Exception.class)
    public OrderResponse createOrderFromCart(Store store, List<CartItem> cartItems, String note, boolean isUrgent) {

        // GỌI HÀM HELPER ĐỂ KHỞI TẠO
        Order order = initializeOrder(store, isUrgent, note);

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();

        for (CartItem cItem : cartItems) {
            Product product = cItem.getProduct();

            OrderItem orderItem = new OrderItem();
            orderItem.setId(new OrderItemKey(order.getOrderId(), product.getProductId()));
            orderItem.setOrder(order);
            orderItem.setProduct(product);
            orderItem.setQuantity(cItem.getQuantity());
            orderItem.setPriceAtOrder(product.getSellingPrice());

            totalAmount = totalAmount.add(product.getSellingPrice().multiply(BigDecimal.valueOf(cItem.getQuantity())));
            orderItems.add(orderItem);
        }

        order.setTotalAmount(totalAmount.add(order.getSurcharge()));
        order.setOrderItems(orderItems);
        Order savedOrder = orderRepository.save(order);

        // 🔥 ĐÃ SỬA: Comment/Xóa đoạn thông báo này đi
        /*
        notificationService.broadcastNotification(
                List.of("KITCHEN_MANAGER", "MANAGER"),
                isUrgent ? "🚨 ĐƠN HÀNG KHẨN CẤP (TỪ GIỎ)" : "📦 Đơn hàng mới",
                "Cửa hàng " + store.getName() + " chốt đơn " + savedOrder.getOrderId(),
                isUrgent ? Notification.NotificationType.URGENT : Notification.NotificationType.INFO
        );
        */

        // 🔥 ĐÃ SỬA: Thay đổi câu thông báo trả về cho FE
        return buildOrderResponse(savedOrder, isUrgent ? "Chốt đơn KHẨN CẤP thành công! Vui lòng thanh toán để Bếp chuẩn bị." : "Chốt đơn TIÊU CHUẨN thành công! Vui lòng thanh toán để Bếp chuẩn bị.");
    }

    // HÀM HELPER: MAP DỮ LIỆU TRẢ VỀ CHO FRONTEND
    private OrderResponse buildOrderResponse(Order order, String message) {
        return OrderResponse.builder()
                .orderId(order.getOrderId())
                .status(order.getStatus().name())
                .totalAmount(order.getTotalAmount())
                .message(message)
                .storeId(order.getStore().getStoreId())
                .orderType(order.getOrderType())
                .note(order.getNote())
                .surcharge(order.getSurcharge())
                .deliveryDate(order.getDeliveryDate())
                .deliveryWindow(order.getDeliveryWindow())
                .items(order.getOrderItems().stream().map(item ->
                        OrderResponse.OrderItemDto.builder()
                                .productId(item.getProduct().getProductId())
                                .productName(item.getProduct().getProductName())
                                .quantity(item.getQuantity())
                                .priceAtOrder(item.getPriceAtOrder())
                                .subTotal(item.getPriceAtOrder().multiply(BigDecimal.valueOf(item.getQuantity())))
                                .build()
                ).collect(Collectors.toList()))
                .build();
    }

    private String generateSmartOrderId(String prefix, String storeId) {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyMMdd"));
        String randomPart = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return String.format("%s-%s-%s-%s", prefix, storeId, datePart, randomPart);
    }

    // =========================================================================
    // CÁC HÀM XEM LỊCH SỬ, CHI TIẾT, HỦY, GOM ĐƠN (GIỮ NGUYÊN)
    // =========================================================================
    public List<OrderHistoryResponse> getOrderHistory(String storeId) {
        List<Order> orders = orderRepository.findByStore_StoreIdOrderByCreatedAtDesc(storeId);
        return orders.stream()
                .map(order -> OrderHistoryResponse.builder()
                        .orderId(order.getOrderId())
                        .orderType(order.getOrderType().name())
                        .status(order.getStatus().name())
                        .totalAmount(order.getTotalAmount())
                        .createdAt(order.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    public OrderDetailResponse getOrderDetail(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với mã: " + orderId));

        List<OrderDetailResponse.OrderItemDto> itemDtos = order.getOrderItems().stream()
                .map(item -> OrderDetailResponse.OrderItemDto.builder()
                        .productId(item.getProduct().getProductId())
                        .productName(item.getProduct().getProductName())
                        .quantity(item.getQuantity())
                        .price(item.getPriceAtOrder())
                        .lineTotal(item.getPriceAtOrder().multiply(BigDecimal.valueOf(item.getQuantity())))
                        .build())
                .collect(Collectors.toList());

        return OrderDetailResponse.builder()
                .orderId(order.getOrderId())
                .storeId(order.getStore().getStoreId())
                .orderType(order.getOrderType().name())
                .status(order.getStatus().name())
                .deliveryDate(order.getDeliveryDate())
                .deliveryWindow(order.getDeliveryWindow() != null ? order.getDeliveryWindow().name() : null)
                .note(order.getNote())
                .totalAmount(order.getTotalAmount())
                .surcharge(order.getSurcharge())
                .createdAt(order.getCreatedAt())
                .items(itemDtos)
                .build();
    }

    @Transactional
    public void cancelOrder(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với mã: " + orderId));

        if (!order.getStatus().name().equals("NEW") && !order.getStatus().name().equals("PENDING_PAYMENT")) {
            throw new IllegalStateException("Không thể hủy! Đơn hàng đang ở trạng thái: " + order.getStatus().name());
        }

        order.setStatus(Order.OrderStatus.CANCELLED);
        orderRepository.save(order);

        // 🔥 GỬI THÔNG BÁO: Báo cho Bếp và Manager biết đơn đã bị hủy
        notificationService.broadcastNotification(
                List.of("KITCHEN_MANAGER", "MANAGER"),
                "❌ ĐƠN HÀNG ĐÃ HỦY",
                "Cửa hàng " + order.getStore().getName() + " vừa hủy đơn " + order.getOrderId(),
                Notification.NotificationType.WARNING
        );
    }

    // =========================================================================
    // [ĐÃ XÓA]: API 1 & API 2 (Gom nấu theo món)
    // Hệ thống đã cập nhật sang luồng mới: Gom nấu theo Đơn hàng (Order-based).
    // Toàn bộ logic chốt nấu đã được chuyển sang ProductionService.java
    // để khắc phục triệt để lỗi báo đỏ "createProductionRun".
    // =========================================================================

    // =========================================================================
    // TÍNH NĂNG VIP: BÓC TÁCH NGUYÊN VẬT LIỆU CỦA 1 ĐƠN HÀNG (CLEAN CODE VERSION)
    // =========================================================================
    @Transactional(readOnly = true)
    public List<OrderMaterialBreakdownResponse> getOrderMaterialBreakdown(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + orderId));

        Map<String, OrderMaterialBreakdownResponse> materialMap = new HashMap<>();

        for (OrderItem item : order.getOrderItems()) {
            Product product = item.getProduct();
            int orderQuantity = item.getQuantity();

            List<Formula> formulas = formulaRepository.findByProduct_ProductId(product.getProductId());

            for (Formula formula : formulas) {
                String ingId = formula.getIngredient().getIngredientId();
                BigDecimal totalNeeded = formula.getAmountNeeded().multiply(BigDecimal.valueOf(orderQuantity));

                if (materialMap.containsKey(ingId)) {
                    OrderMaterialBreakdownResponse existing = materialMap.get(ingId);
                    existing.setTotalAmountNeeded(existing.getTotalAmountNeeded().add(totalNeeded));
                } else {
                    materialMap.put(ingId, OrderMaterialBreakdownResponse.builder()
                            .ingredientId(ingId)
                            .ingredientName(formula.getIngredient().getName())
                            .unit(formula.getIngredient().getUnit().name())
                            .totalAmountNeeded(totalNeeded)
                            .build());
                }
            }
        }
        return new ArrayList<>(materialMap.values());
    }
}