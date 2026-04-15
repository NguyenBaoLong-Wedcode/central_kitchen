package com.groupSWP.centralkitchenplatform.dto.inventory;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Interface Projection dùng để hứng kết quả gom nhóm (Group By) từ DB.
 * Hoàn toàn KHÔNG tạo bảng mới, giúp tối ưu hiệu năng và không gian lưu trữ.
 */
public interface StocktakeHistoryProjection {
    String getSessionCode();              // Mã đợt (VD: KK-260327-A8F2)
    LocalDateTime getStocktakeDate();     // Lấy ngày nhỏ nhất làm ngày chốt phiên
    Integer getTotalIngredientsChanged(); // Tổng số món bị lệch
    BigDecimal getTotalQuantityVariance();// Tổng số lượng hao hụt/dư
}