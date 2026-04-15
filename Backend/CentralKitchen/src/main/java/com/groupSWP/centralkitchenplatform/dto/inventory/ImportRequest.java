package com.groupSWP.centralkitchenplatform.dto.inventory;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class ImportRequest {
    private String note;
    private String supplierId; // Bỏ comment nếu đã làm Supplier
    private List<ItemRequest> items;

    @Data
    public static class ItemRequest {
        private String ingredientId;
        private String unit;
        private BigDecimal quantity;
        private BigDecimal importPrice;
    }
}