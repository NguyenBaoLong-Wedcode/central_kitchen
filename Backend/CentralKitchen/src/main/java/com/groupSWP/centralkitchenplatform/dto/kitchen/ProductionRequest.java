package com.groupSWP.centralkitchenplatform.dto.kitchen;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ProductionRequest {
    private String productId;
    private BigDecimal quantity; // Số lượng cần nấu
    private String note;
}