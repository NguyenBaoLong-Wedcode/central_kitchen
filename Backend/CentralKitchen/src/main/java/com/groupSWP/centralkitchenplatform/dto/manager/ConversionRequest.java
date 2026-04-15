package com.groupSWP.centralkitchenplatform.dto.manager;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ConversionRequest {
    // Nguyên liệu nào? (VD: "ING_DAU_AN")
    private String ingredientId;

    // Đơn vị quy đổi là gì? (VD: "THUNG")
    // Frontend gửi String, mình sẽ validate xem có trong Enum không
    private String unitName;

    // Hệ số quy đổi ra đơn vị gốc (VD: 20)
    private BigDecimal conversionFactor;
}