package com.groupSWP.centralkitchenplatform.service.inventory;

import com.groupSWP.centralkitchenplatform.dto.inventory.StocktakeRequest;
import com.groupSWP.centralkitchenplatform.entities.auth.Account; // 🔥 Thêm import Account
import com.groupSWP.centralkitchenplatform.entities.kitchen.Ingredient;
import com.groupSWP.centralkitchenplatform.entities.kitchen.InventoryLog;
import com.groupSWP.centralkitchenplatform.entities.notification.Notification;
import com.groupSWP.centralkitchenplatform.entities.procurement.ImportItem;
import com.groupSWP.centralkitchenplatform.repositories.auth.AccountRepository; // 🔥 Thêm import Account Repo
import com.groupSWP.centralkitchenplatform.repositories.inventory.ImportItemRepository;
import com.groupSWP.centralkitchenplatform.repositories.inventory.InventoryLogRepository;
import com.groupSWP.centralkitchenplatform.repositories.product.IngredientRepository;
import com.groupSWP.centralkitchenplatform.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StocktakeService {

    private final IngredientRepository ingredientRepository;
    private final ImportItemRepository importItemRepository;
    private final InventoryLogRepository inventoryLogRepository;
    private final NotificationService notificationService;
    private final AccountRepository accountRepository; // 👉 Bổ sung Repo lấy tên

    @Transactional
    public void processStocktake(StocktakeRequest request, String username) { // 👉 Yêu cầu Controller truyền username vào đây
        log.info("Manager bắt đầu xử lý Kiểm kê kho định kỳ...");
        int totalDiscrepancies = 0;
        boolean hasSevereLoss = false; // Cờ theo dõi xem có vụ mất cắp/hao hụt nghiêm trọng nào không

        // 👉 LẤY ĐÍCH DANH TÊN NGƯỜI KIỂM KÊ TỪ DATABASE
        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản người dùng!"));
        String performerName = account.getSystemUser() != null ? account.getSystemUser().getFullName() : username;

        // 🌟 TẠO MÃ PHIÊN KIỂM KÊ (SESSION CODE) DUY NHẤT CHO ĐỢT NÀY
        // Format: KK-YYMMDD-RANDOM (VD: KK-260327-A8F2)
        String dateStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyMMdd"));
        String randomSuffix = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        String sessionCode = "KK-" + dateStr + "-" + randomSuffix;

        for (StocktakeRequest.StocktakeItem item : request.getItems()) {
            Ingredient ingredient = ingredientRepository.findById(item.getIngredientId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy nguyên liệu: " + item.getIngredientId()));

            BigDecimal systemQty = ingredient.getKitchenStock() != null ? ingredient.getKitchenStock() : BigDecimal.ZERO;
            BigDecimal actualQty = item.getActualQty();

            // Tính độ chênh lệch: Hệ thống - Thực tế đếm bằng tay
            BigDecimal discrepancy = systemQty.subtract(actualQty);

            // =========================================================
            // 🔥 CHỐT CHẶN: VƯỢT RÀO HAO HỤT NGHIÊM TRỌNG (FORCE CONFIRM)
            // =========================================================
            if (systemQty.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal variancePercentage = discrepancy.abs()
                        .divide(systemQty, 4, java.math.RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("100"));

                // Nếu lệch > 50% MÀ KHÔNG CÓ CỜ FORCE CONFIRM -> Chặn lại báo cho Manager
                if (variancePercentage.compareTo(new BigDecimal("50")) > 0 && !item.isForceConfirm()) {
                    throw new RuntimeException("🛑 CẢNH BÁO: Số lượng kiểm kê của [" + ingredient.getName() + "] chênh lệch tới " + variancePercentage.intValue() + "% so với hệ thống! Nếu đây là hao hụt THỰC TẾ, Quản lý vui lòng tick chọn 'Xác nhận hao hụt bất thường' để tiếp tục ghi đè!");
                }

                // Nếu được phép vượt rào -> Bật cờ báo động đỏ
                if (variancePercentage.compareTo(new BigDecimal("50")) > 0 && item.isForceConfirm()) {
                    hasSevereLoss = true;
                }
            }
            // =========================================================

            // NẾU CÓ HAO HỤT (Hệ thống > Thực tế) -> Chạy FIFO để trừ bớt các lô hàng cũ
            if (discrepancy.compareTo(BigDecimal.ZERO) > 0) {
                log.warn("Phát hiện hao hụt nguyên liệu {}: Hệ thống = {}, Thực tế = {}", ingredient.getName(), systemQty, actualQty);

                // Thuật toán FIFO y chang lúc nấu ăn để tiền vốn khớp 100%
                // 🌟 Truyền sessionCode vào để gom nhóm log
                deductIngredientWithFIFO(ingredient, discrepancy, item.getNote(), sessionCode, performerName); // 👉 Thêm performerName

                // Cập nhật lại tồn kho tổng
                ingredient.setKitchenStock(actualQty);
                ingredientRepository.save(ingredient);

                totalDiscrepancies++;
            }
            // NẾU KIỂM KÊ KHỚP HOẶC DƯ
            else if (discrepancy.compareTo(BigDecimal.ZERO) < 0) {
                ingredient.setKitchenStock(actualQty);
                ingredientRepository.save(ingredient);

                // Ghi log đơn giản là điều chỉnh tăng kho
                InventoryLog logEntry = InventoryLog.builder()
                        .ingredient(ingredient)
                        .quantityDeducted(discrepancy) // Số âm thể hiện việc cộng thêm vào
                        .note(item.getNote() != null && !item.getNote().isEmpty() ? item.getNote() : "Không có ghi chú") // 👉 CHỈ LƯU ĐÚNG GHI CHÚ
                        .createdBy(performerName) // 👉 LƯU TÊN NGƯỜI KIỂM KÊ
                        .createdAt(LocalDateTime.now())
                        .referenceCode(sessionCode) // 🌟 Gán mã sessionCode cho hàng Dư kho
                        .build();
                inventoryLogRepository.save(logEntry);
            }
        }

        // =========================================================
        // 🔥 GỬI THÔNG BÁO TỚI BẾP TRƯỞNG & ADMIN (MANAGER LÀ NGƯỜI LÀM NÊN KHÔNG NHẬN)
        // =========================================================
        if (hasSevereLoss) {
            // CÓ HAO HỤT LỚN (>50%) -> Báo động đỏ URGENT
            notificationService.broadcastNotification(
                    List.of("ADMIN", "KITCHEN_MANAGER"),
                    "🚨 BÁO ĐỘNG: HAO HỤT KHO NGHIÊM TRỌNG",
                    "Phát hiện nguyên liệu bị thất thoát trên 50% sau kiểm kê. Quản lý (" + performerName + ") đã phải dùng quyền Ghi đè hệ thống. Bếp trưởng vui lòng rà soát lại nhân viên ngay lập tức!",
                    Notification.NotificationType.URGENT
            );
        } else if (totalDiscrepancies > 0) {
            // HAO HỤT NHỎ BÌNH THƯỜNG -> Báo vàng WARNING
            notificationService.broadcastNotification(
                    List.of("ADMIN", "KITCHEN_MANAGER"),
                    "⚠️ BÁO CÁO KIỂM KÊ KHO",
                    "Quản lý (" + performerName + ") vừa hoàn tất kiểm kê định kỳ (" + sessionCode + "). Phát hiện " + totalDiscrepancies + " nguyên liệu có sự chênh lệch (Hao hụt nhẹ) so với sổ sách.",
                    Notification.NotificationType.WARNING
            );
        }
    }

    // =========================================================================
    // HÀM TRỪ KHO FIFO DÀNH RIÊNG CHO KIỂM KÊ
    // =========================================================================
    // 🌟 Thêm tham số sessionCode vào hàm này
    private void deductIngredientWithFIFO(Ingredient ingredient, BigDecimal quantityNeeded, String userNote, String sessionCode, String performerName) { // 👉 Thêm performerName
        BigDecimal remainingToDeduct = quantityNeeded;

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

            // 👉 Xóa dòng nối chuỗi cũ để tách dữ liệu sạch sẽ cho FE
            InventoryLog logEntry = InventoryLog.builder()
                    .importItem(batch)
                    .ingredient(ingredient)
                    .quantityDeducted(deductedAmount)
                    .note(userNote != null && !userNote.isEmpty() ? userNote : "Không có ghi chú") // 👉 CHỈ LƯU GHI CHÚ
                    .createdBy(performerName) // 👉 LƯU TÊN NGƯỜI KIỂM KÊ
                    .createdAt(LocalDateTime.now())
                    .referenceCode(sessionCode) // 🌟 Thay vì tự sinh mã mới, dùng mã truyền vào
                    .build();
            inventoryLogRepository.save(logEntry);
        }

        // =========================================================
        // 🌟 FIX LỖI FE BÁO: CHẤP NHẬN TRỪ LỐ (OVER-DEDUCT) DỮ LIỆU RÁC
        // Nếu đã vét sạch các lô mà vẫn còn số lượng cần trừ, ép tạo Log!
        // =========================================================
        if (remainingToDeduct.compareTo(BigDecimal.ZERO) > 0) {
            log.error("CẢNH BÁO: Hao hụt nhiều hơn cả số lượng trong các lô hàng. Đã trừ sạch các lô, phần còn dư sẽ gán vào Lô ảo!");

            InventoryLog fallbackLog = InventoryLog.builder()
                    .importItem(null) // 👉 Lô hàng ảo (Ép lưu log dù không có lô hàng gốc)
                    .ingredient(ingredient)
                    .quantityDeducted(remainingToDeduct) // Trừ nốt phần còn thiếu
                    .note(userNote != null && !userNote.isEmpty() ? userNote : "Không có ghi chú")
                    .createdBy(performerName)
                    .createdAt(LocalDateTime.now())
                    .referenceCode(sessionCode)
                    .build();
            inventoryLogRepository.save(fallbackLog);
        }
    }

    // =========================================================
    // 🌟 API 2: LẤY CHI TIẾT KIỂM KÊ (ĐÃ XỬ LÝ GOM NHÓM FIFO & ĐẢO DẤU)
    // =========================================================
    @Transactional(readOnly = true)
    public List<java.util.Map<String, Object>> getStocktakeDetails(String sessionCode) {
        List<InventoryLog> details = inventoryLogRepository.findByReferenceCode(sessionCode);

        if (details.isEmpty()) {
            throw new RuntimeException("Không tìm thấy dữ liệu cho mã kiểm kê: " + sessionCode);
        }

        java.util.Map<String, java.util.Map<String, Object>> groupedData = new java.util.HashMap<>();

        for (InventoryLog log : details) {
            String ingId = log.getIngredient().getIngredientId();

            // 🌟 ĐẢO DẤU CHO FE: Dư là (+), Hao hụt là (-)
            BigDecimal displayChange = log.getQuantityDeducted().negate();

            if (groupedData.containsKey(ingId)) {
                java.util.Map<String, Object> existingItem = groupedData.get(ingId);

                // 🌟 Lấy ra và cộng dồn bằng biến mới quantityChange
                BigDecimal currentQty = (BigDecimal) existingItem.get("quantityChange");
                existingItem.put("quantityChange", currentQty.add(displayChange));

            } else {
                java.util.Map<String, Object> newItem = new java.util.HashMap<>();
                newItem.put("logId", log.getId());

                // 🌟 Lưu bằng key quantityChange
                newItem.put("quantityChange", displayChange);

                newItem.put("note", log.getNote() != null ? log.getNote() : "Không có ghi chú");
                newItem.put("createdBy", log.getCreatedBy() != null ? log.getCreatedBy() : "Hệ thống");

                newItem.put("ingredient", java.util.Map.of(
                        "id", ingId,
                        "name", log.getIngredient().getName()
                ));

                groupedData.put(ingId, newItem);
            }
        }

        // Trả về List thuần túy sau khi xào nấu xong
        return new java.util.ArrayList<>(groupedData.values());
    }
}