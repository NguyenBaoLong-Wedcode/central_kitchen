//package com.groupSWP.centralkitchenplatform.service.inventory;
//
//import com.groupSWP.centralkitchenplatform.dto.kitchen.WastageRequest;
//import com.groupSWP.centralkitchenplatform.dto.kitchen.WastageResponse;
//import com.groupSWP.centralkitchenplatform.entities.kitchen.Formula;
//import com.groupSWP.centralkitchenplatform.entities.kitchen.Ingredient;
//import com.groupSWP.centralkitchenplatform.entities.kitchen.InventoryLog;
//import com.groupSWP.centralkitchenplatform.entities.kitchen.ProductionRun;
//import com.groupSWP.centralkitchenplatform.entities.notification.Notification; // 🔥 Thêm import
//import com.groupSWP.centralkitchenplatform.repositories.inventory.InventoryLogRepository;
//import com.groupSWP.centralkitchenplatform.repositories.product.FormulaRepository;
//import com.groupSWP.centralkitchenplatform.repositories.product.IngredientRepository;
//import com.groupSWP.centralkitchenplatform.repositories.inventory.ProductionRunRepository;
//import com.groupSWP.centralkitchenplatform.service.notification.NotificationService; // 🔥 Thêm import
//import lombok.RequiredArgsConstructor;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.math.BigDecimal;
//import java.util.ArrayList;
//import java.util.List;
//
//@Service
//@RequiredArgsConstructor
//public class WastageService {
//
//    private final ProductionRunRepository productionRunRepository;
//    private final FormulaRepository formulaRepository;
//    private final IngredientRepository ingredientRepository;
//    private final InventoryLogRepository inventoryLogRepository;
//    private final NotificationService notificationService; // 🔥 Tiêm NotificationService
//
//    @Transactional
//    public WastageResponse recordWastage(WastageRequest request) {
//
//        // 1. Tìm production run đang COOKING
//        ProductionRun run = productionRunRepository
//                .findByRunIdAndStatus(request.getRunId(), ProductionRun.ProductionStatus.COOKING)
//                .orElseThrow(() -> new IllegalArgumentException(
//                        "Không tìm thấy lượt sản xuất đang ở trạng thái ĐANG NẤU với id: " + request.getRunId()));
//
//        // 2. Validate waste không vượt planned
//        BigDecimal currentWaste = run.getWasteQty() != null ? run.getWasteQty() : BigDecimal.ZERO;
//        BigDecimal newWaste = currentWaste.add(request.getWasteQty());
//
//        if (newWaste.compareTo(run.getPlannedQty()) > 0) {
//            throw new IllegalArgumentException(
//                    "Số lượng hao hụt vượt quá số lượng dự kiến: " + run.getPlannedQty());
//        }
//
//        // 3. Cập nhật waste_qty và ghi chú (reason) vào production_run
//        run.setWasteQty(newWaste);
//        run.setNote(request.getReason());
//        productionRunRepository.save(run);
//
//        // 4. Trừ kho nguyên liệu CHUẨN THEO CÔNG THỨC (BOM)
//        List<Formula> formulas = formulaRepository.findByProduct_ProductId(run.getProduct().getProductId());
//
//        // Khai báo List để tối ưu hóa việc lưu Database (Batch Save)
//        List<Ingredient> ingredientsToUpdate = new ArrayList<>();
//        List<InventoryLog> logsToSave = new ArrayList<>();
//
//        for (Formula formula : formulas) {
//            Ingredient ingredient = formula.getIngredient();
//            BigDecimal actualIngredientWaste = request.getWasteQty().multiply(formula.getAmountNeeded());
//
//            // Đề phòng trường hợp kitchenStock bị null trong DB
//            BigDecimal currentStock = ingredient.getKitchenStock() != null ? ingredient.getKitchenStock() : BigDecimal.ZERO;
//            BigDecimal newStock = currentStock.subtract(actualIngredientWaste);
//
//            // VÁ LỖ HỔNG LOGIC: Trừ lố kho thì báo lỗi ngay, không tự động gán bằng 0
//            if (newStock.compareTo(BigDecimal.ZERO) < 0) {
//                throw new IllegalArgumentException(
//                        "Tồn kho nguyên liệu không đủ để trừ hao hụt! " +
//                                "Tồn hiện tại: " + currentStock + ", Cần trừ: " + actualIngredientWaste);
//            }
//
//            ingredient.setKitchenStock(newStock);
//            ingredientsToUpdate.add(ingredient); // Thêm vào danh sách chờ lưu
//
//            // 5. LƯU VẾT VÀO INVENTORY_LOG
//            InventoryLog log = new InventoryLog();
//            log.setIngredient(ingredient);
//            log.setProductionRun(run);
//            log.setQuantityDeducted(actualIngredientWaste);
//            log.setReferenceCode("WASTE-" + run.getRunId());
//            log.setNote("Hao hụt sản xuất. Lý do: " + request.getReason());
//            log.setCreatedAt(java.time.LocalDateTime.now());
//
//            // LƯU Ý: Vẫn đang để trống importItem ở đây (Cần check nullable = true trong Entity InventoryLog)
//
//            logsToSave.add(log); // Thêm vào danh sách chờ lưu
//        }
//
//        // TỐI ƯU PERFORMANCE: Lưu tất cả dữ liệu cùng 1 lúc ngoài vòng lặp
//        if (!ingredientsToUpdate.isEmpty()) {
//            ingredientRepository.saveAll(ingredientsToUpdate);
//            inventoryLogRepository.saveAll(logsToSave);
//        }
//
//        // 🔥 THÔNG BÁO: Báo cáo hao hụt lên cho Manager nắm tình hình thất thoát
//        notificationService.broadcastNotification(
//                List.of("MANAGER"),
//                "🗑️ BÁO CÁO HAO HỤT",
//                "Bếp vừa ghi nhận hao hụt " + request.getWasteQty() + " đơn vị cho mẻ nấu " + run.getRunId() + ". Lý do: " + request.getReason(),
//                Notification.NotificationType.WARNING
//        );
//
//        // 6. Trả về response
//        return WastageResponse.builder()
//                .runId(run.getRunId())
//                .productId(run.getProduct().getProductId())
//                .productName(run.getProduct().getProductName())
//                .plannedQty(run.getPlannedQty())
//                .actualQty(run.getActualQty())
//                .wasteQty(newWaste)
//                .status(run.getStatus().name())
//                .message("Ghi nhận hao hụt thành công")
//                .build();
//    }
//}