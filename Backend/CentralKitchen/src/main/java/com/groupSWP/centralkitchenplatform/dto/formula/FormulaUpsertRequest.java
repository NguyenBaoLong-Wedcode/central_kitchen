package com.groupSWP.centralkitchenplatform.dto.formula;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class FormulaUpsertRequest {
    private String productId;
    private List<Item> ingredients;

    @Data
    public static class Item {
        private String ingredientId;
        private BigDecimal amountNeeded;
    }
}