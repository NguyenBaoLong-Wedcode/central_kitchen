package com.groupSWP.centralkitchenplatform.dto.kitchen;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class WastageResponse {
    private String runId;
    private String productId;
    private String productName;
    private BigDecimal plannedQty;
    private BigDecimal actualQty;
    private BigDecimal wasteQty;
    private String status;
    private String message;
}