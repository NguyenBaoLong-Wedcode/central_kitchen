package com.groupSWP.centralkitchenplatform.dto.kitchen;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class KitchenAggregationResponse {
    private String productId;
    private String productName;
    private Integer totalQuantity; // Tổng số lượng cần nấu của món này
    private String orderType;
}