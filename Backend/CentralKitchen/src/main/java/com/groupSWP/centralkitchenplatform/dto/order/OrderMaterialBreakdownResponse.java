package com.groupSWP.centralkitchenplatform.dto.order;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class OrderMaterialBreakdownResponse {
    private String ingredientId;
    private String ingredientName;
    private String unit;
    private BigDecimal totalAmountNeeded;
}