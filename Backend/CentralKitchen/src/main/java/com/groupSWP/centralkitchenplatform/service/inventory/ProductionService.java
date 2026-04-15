package com.groupSWP.centralkitchenplatform.service.inventory;

import com.groupSWP.centralkitchenplatform.dto.kitchen.ProductionResponse;
import com.groupSWP.centralkitchenplatform.entities.kitchen.Formula;
import com.groupSWP.centralkitchenplatform.entities.kitchen.Ingredient;
import com.groupSWP.centralkitchenplatform.entities.kitchen.InventoryLog;
import com.groupSWP.centralkitchenplatform.entities.kitchen.ProductionRun;
import com.groupSWP.centralkitchenplatform.entities.logistic.Order;
import com.groupSWP.centralkitchenplatform.entities.logistic.OrderItem;
import com.groupSWP.centralkitchenplatform.entities.notification.Notification;
import com.groupSWP.centralkitchenplatform.entities.procurement.ImportItem;
import com.groupSWP.centralkitchenplatform.entities.product.Product;
import com.groupSWP.centralkitchenplatform.repositories.inventory.ImportItemRepository;
import com.groupSWP.centralkitchenplatform.repositories.inventory.InventoryLogRepository;
import com.groupSWP.centralkitchenplatform.repositories.inventory.ProductionRunRepository;
import com.groupSWP.centralkitchenplatform.repositories.order.OrderRepository;
import com.groupSWP.centralkitchenplatform.repositories.product.IngredientRepository;
import com.groupSWP.centralkitchenplatform.repositories.product.ProductRepository;
import com.groupSWP.centralkitchenplatform.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service quản lý các nghiệp vụ Sản xuất (Production Management) tại Bếp Trung Tâm.
 * Đã nâng cấp (Refactored) sang luồng Order-based (Sản xuất theo đơn).
 */
@Service
@RequiredArgsConstructor
public class ProductionService {

    private final ProductionRunRepository productionRunRepository;
    private final ProductRepository productRepository;
    private final IngredientRepository ingredientRepository;
    private final ImportItemRepository importItemRepository;
    private final InventoryLogRepository inventoryLogRepository;
    private final NotificationService notificationService;
    private final OrderRepository orderRepository;

    // =========================================================================
    // 🌟 1. TẠO PHIẾU NẤU TỪ DANH SÁCH ĐƠN HÀNG (THAY THẾ HÀM CŨ)
    // =========================================================================
    @Transactional
    public void createTicketsFromOrders(List<String> orderIds) {
        for (String id : orderIds) {
            Order order = orderRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + id));

            // Đổi trạng thái đơn thành PLANNED (Đã vào kế hoạch bếp)
            order.setStatus(Order.OrderStatus.PLANNED);

            // Khởi tạo Phiếu nấu nháp (Chưa trừ kho)
            ProductionRun run = new ProductionRun();
            run.setRunId("TICKET-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            run.setOrder(order);
            run.setCookedProductIds(new ArrayList<>()); // Danh sách rỗng ban đầu
            run.setTotalCostAtProduction(BigDecimal.ZERO);
            run.setProductionDate(LocalDateTime.now());
            run.setStatus(ProductionRun.ProductionStatus.PLANNED);

            productionRunRepository.save(run);
        }
    }

    // =========================================================================
    // 🌟 2. NÚT TICK CHỌN NẤU TỪNG MÓN -> TRỪ KHO FIFO VÀ TÍNH TIỀN
    // =========================================================================
    @Transactional
    public void cookSpecificItems(String runId, List<String> productIdsToCook) {
        ProductionRun run = productionRunRepository.findById(runId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Phiếu nấu: " + runId));
        Order order = run.getOrder();
        BigDecimal currentRunCost = run.getTotalCostAtProduction() != null ? run.getTotalCostAtProduction() : BigDecimal.ZERO;

        for (String productId : productIdsToCook) {
            // Bỏ qua nếu món này đã được tick nấu trước đó rồi (Chống trừ kho 2 lần)
            if (run.getCookedProductIds().contains(productId)) continue;

            OrderItem item = order.getOrderItems().stream()
                    .filter(oi -> oi.getProduct().getProductId().equals(productId))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Món " + productId + " không nằm trong đơn hàng này!"));

            Product product = item.getProduct();

            // Lôi công thức ra và bắt đầu TRỪ KHO FIFO (Bê y nguyên logic cũ của Sếp vào đây)
            for (Formula formula : product.getFormulas()) {
                Ingredient ingredient = formula.getIngredient();
                // Tính lượng cần: Định lượng 1 món * Số lượng khách đặt
                BigDecimal totalNeeded = formula.getAmountNeeded().multiply(new BigDecimal(item.getQuantity()));
                BigDecimal currentStock = ingredient.getKitchenStock() != null ? ingredient.getKitchenStock() : BigDecimal.ZERO;

                // Chốt chặn an toàn
                if (currentStock.compareTo(totalNeeded) < 0) {
                    throw new RuntimeException("Không đủ nguyên liệu: " + ingredient.getName() +
                            ". Cần: " + totalNeeded + " " + ingredient.getUnit() +
                            ", Hiện có: " + currentStock);
                }

                // Chạy hàm FIFO trừ kho và tính tiền
                BigDecimal ingredientCost = deductIngredientWithFIFO(ingredient, totalNeeded, run);
                currentRunCost = currentRunCost.add(ingredientCost);

                // 🔥 THÔNG BÁO: Cảnh báo tồn kho (Giữ nguyên)
                if (ingredient.getMinThreshold() != null && ingredient.getKitchenStock().compareTo(ingredient.getMinThreshold()) < 0) {
                    notificationService.broadcastNotification(
                            List.of("MANAGER"),
                            "📉 CẢNH BÁO TỒN KHO",
                            "Nguyên liệu " + ingredient.getName() + " vừa rớt xuống mức " + ingredient.getKitchenStock() + ". Cần nhập hàng!",
                            Notification.NotificationType.WARNING
                    );
                }
            }

            // Đánh dấu món này đã nấu xong
            run.getCookedProductIds().add(productId);
        }

        // Cập nhật giá vốn
        run.setTotalCostAtProduction(currentRunCost);

        // Tự động chuyển trạng thái Đơn hàng sang Đang Chuẩn Bị nếu đây là món đầu tiên được nấu
        if (run.getStatus() == ProductionRun.ProductionStatus.PLANNED) {
            run.setStatus(ProductionRun.ProductionStatus.COOKING);
            order.setStatus(Order.OrderStatus.PREPARING);
        }

        productionRunRepository.save(run);
    }

    // =========================================================================
    // 🌟 3. CẬP NHẬT TRẠNG THÁI PHIẾU NẤU (HOÀN TẤT)
    // =========================================================================
    @Transactional
    public ProductionResponse changeProductionStatus(String runId, ProductionRun.ProductionStatus newStatus) {
        ProductionRun run = productionRunRepository.findById(runId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mẻ nấu ID: " + runId));

        ProductionRun.ProductionStatus oldStatus = run.getStatus();
        if (oldStatus == newStatus) return mapToResponse(run);

        // Chặn lùi trạng thái
        if (oldStatus == ProductionRun.ProductionStatus.COOKING && newStatus == ProductionRun.ProductionStatus.PLANNED) {
            throw new RuntimeException("Mẻ nấu đang diễn ra, không thể lùi về Kế Hoạch!");
        }

        Order order = run.getOrder();

        // NẤU XONG -> Cập nhật Order và Gọi xe (Fix triệt để lỗi quét nhầm đơn)
        if (newStatus == ProductionRun.ProductionStatus.COMPLETED) {
            order.setStatus(Order.OrderStatus.READY_TO_SHIP);
            orderRepository.save(order);

            // Reo chuông cho Điều phối viên (Coordinator) ra xếp xe
            notificationService.broadcastNotification(
                    List.of("COORDINATOR"),
                    "✅ ĐƠN HÀNG SẴN SÀNG",
                    "Đơn hàng [" + order.getOrderId() + "] của " + order.getStore().getName() + " đã nấu xong. Vui lòng điều phối xe!",
                    Notification.NotificationType.INFO
            );
        }

        run.setStatus(newStatus);
        ProductionRun savedRun = productionRunRepository.save(run);
        return mapToResponse(savedRun);
    }

    // =========================================================================
    // 🌟 4. LẤY DANH SÁCH MẺ ĐANG HOẠT ĐỘNG
    // =========================================================================
    public List<ProductionResponse> getActiveProductionRuns() {
        List<ProductionRun.ProductionStatus> activeStatuses = Arrays.asList(
                ProductionRun.ProductionStatus.PLANNED,
                ProductionRun.ProductionStatus.COOKING
        );
        List<ProductionRun> activeRuns = productionRunRepository.findByStatusInOrderByProductionDateDesc(activeStatuses);
        return activeRuns.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    // =========================================================================
    // 🌟 5. HELPER: MAPPER TRẢ DATA CHO FRONTEND (BỌC THÉP CHỐNG LỖI 100%)
    // =========================================================================
    private ProductionResponse mapToResponse(ProductionRun run) {
        Order order = run.getOrder();

        // 🛡️ CHỐT CHẶN 1: Nếu Phiếu nấu là "bóng ma" cũ không có Order -> Trả data rỗng ngay!
        if (order == null) {
            return ProductionResponse.builder()
                    .runId(run.getRunId())
                    .orderId("N/A")
                    .storeName("⚠️ Dữ liệu cũ (Bóng ma)")
                    .orderType("STANDARD")
                    .status(run.getStatus() != null ? run.getStatus().name() : "UNKNOWN")
                    .productionDate(run.getProductionDate())
                    .items(new ArrayList<>()) // Mảng rỗng để FE không bị vòng lặp / crash
                    .build();
        }

        // 🛡️ CHỐT CHẶN 2: Phòng hờ Order không có OrderItems (Tránh NullPointerException)
        List<ProductionResponse.OrderItemDetail> itemDetails = new ArrayList<>();
        if (order.getOrderItems() != null) {
            itemDetails = order.getOrderItems().stream().map(item -> {
                Product p = item.getProduct();

                // 🛡️ CHỐT CHẶN 3: Phòng hờ Món ăn bị xóa mất Công thức (BOM)
                List<ProductionResponse.FormulaDetail> formulas = new ArrayList<>();
                if (p != null && p.getFormulas() != null) {
                    formulas = p.getFormulas().stream().map(f ->
                            ProductionResponse.FormulaDetail.builder()
                                    .ingredientName(f.getIngredient().getName())
                                    .amountNeeded(f.getAmountNeeded())
                                    .unit(f.getIngredient().getUnit() != null ? f.getIngredient().getUnit().name() : "")
                                    .build()
                    ).collect(Collectors.toList());
                }

                return ProductionResponse.OrderItemDetail.builder()
                        .productId(p != null ? p.getProductId() : "N/A")
                        .productName(p != null ? p.getProductName() : "Món đã bị xóa")
                        .quantity(item.getQuantity())
                        // Phòng hờ list cookedProductIds bị null ở dưới Database
                        .isCooked(run.getCookedProductIds() != null && run.getCookedProductIds().contains(p != null ? p.getProductId() : ""))
                        .formulas(formulas)
                        .build();
            }).collect(Collectors.toList());
        }

        // Trả về DTO chuẩn mực
        return ProductionResponse.builder()
                .runId(run.getRunId())
                .orderId(order.getOrderId())
                // Lưu ý: Nếu Entity Store của Sếp xài getName() thay vì getStoreName() thì đổi ở đây nhé!
                .storeName(order.getStore() != null ? order.getStore().getName() : "Unknown")
                .orderType(order.getOrderType() != null ? order.getOrderType().name() : "STANDARD")
                .status(run.getStatus().name())
                .productionDate(run.getProductionDate())
                .items(itemDetails)
                .build();
    }

    // =========================================================================
    // 🌟 6. HÀM TRỪ KHO FIFO (PHIÊN BẢN HOÀN CHỈNH CỦA SẾP - GIỮ NGUYÊN 100%)
    // =========================================================================
    private BigDecimal deductIngredientWithFIFO(Ingredient ingredient, BigDecimal quantityNeeded, ProductionRun run) {
        BigDecimal remainingToDeduct = quantityNeeded;
        BigDecimal totalIngredientCost = BigDecimal.ZERO;

        List<ImportItem> availableBatches = importItemRepository
                .findByIngredientAndRemainingQuantityGreaterThanOrderByIdAsc(ingredient, BigDecimal.ZERO);

        for (ImportItem batch : availableBatches) {
            if (remainingToDeduct.compareTo(BigDecimal.ZERO) <= 0) break;

            BigDecimal batchQty = batch.getRemainingQuantity();
            BigDecimal deductedAmount;

            if (batchQty.compareTo(remainingToDeduct) >= 0) {
                batch.setRemainingQuantity(batchQty.subtract(remainingToDeduct));
                deductedAmount = remainingToDeduct;
                remainingToDeduct = BigDecimal.ZERO;
            } else {
                batch.setRemainingQuantity(BigDecimal.ZERO);
                deductedAmount = batchQty;
                remainingToDeduct = remainingToDeduct.subtract(batchQty);
            }
            importItemRepository.save(batch);

            BigDecimal costForThisBatch = deductedAmount.multiply(batch.getImportPrice());
            totalIngredientCost = totalIngredientCost.add(costForThisBatch);

            InventoryLog log = InventoryLog.builder()
                    .importItem(batch)
                    .ingredient(ingredient)
                    .productionRun(run)
                    .quantityDeducted(deductedAmount)
                    .note("Trừ kho tự động FIFO cho mẻ nấu: " + run.getRunId())
                    .createdAt(LocalDateTime.now())
                    .build();
            inventoryLogRepository.save(log);
        }

        if (remainingToDeduct.compareTo(BigDecimal.ZERO) > 0) {
            throw new RuntimeException("LỖI NGHIÊM TRỌNG: Tồn kho các lô không khớp với tổng tồn. Thiếu: " + remainingToDeduct);
        }

        ingredient.setKitchenStock(ingredient.getKitchenStock().subtract(quantityNeeded));
        ingredientRepository.save(ingredient);

        return totalIngredientCost;
    }
}