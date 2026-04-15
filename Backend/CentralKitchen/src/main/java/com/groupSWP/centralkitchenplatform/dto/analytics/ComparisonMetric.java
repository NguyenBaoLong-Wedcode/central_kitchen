package com.groupSWP.centralkitchenplatform.dto.analytics;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class ComparisonMetric {
    private BigDecimal currentValue;    // Số liệu kỳ này (VD: Từ 01/03 - 15/03)
    private BigDecimal previousValue;   // Số liệu kỳ trước (VD: Từ 15/02 - 28/02)
    private Double growthPercentage;    // % Tăng/Giảm (VD: 15.5%)
    private String trend;               // "UP" (Tăng), "DOWN" (Giảm), "FLAT" (Đi ngang)
}