package com.groupSWP.centralkitchenplatform.dto.formula;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class FormulaResponse {
    private String productId;
    private String productName;
    private List<Item> ingredients;

    @Data
    @Builder
    public static class Item {
        private String ingredientId;
        private String ingredientName;
        // THÊM ĐÚNG 1 DÒNG NÀY LÀ HẾT BÁO LỖI ĐỎ NHA SẾP
        private String unit;
        private BigDecimal amountNeeded;
    }
}