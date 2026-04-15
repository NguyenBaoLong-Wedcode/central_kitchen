package com.groupSWP.centralkitchenplatform.dto.kitchen;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ProductionResponse {
    private String runId;
    private String orderId;
    private String storeName;
    private String orderType; // STANDARD / URGENT (KCAP)
    private String status;

    // 🌟 EM ĐÃ TRẢ LẠI BIẾN NÀY CHO SẾP (Hết đỏ bên Service ngay!)
    private LocalDateTime productionDate;

    private List<OrderItemDetail> items;

    @Data
    @Builder
    public static class OrderItemDetail {
        private String productId;
        private String productName;
        private int quantity;
        private boolean isCooked; // Để FE hiển thị checkbox "Đã nấu"
        private List<FormulaDetail> formulas; // Hiện công thức nấu ở màn chi tiết
    }

    @Data
    @Builder
    public static class FormulaDetail {
        private String ingredientName;
        private BigDecimal amountNeeded;
        private String unit;
    }
}