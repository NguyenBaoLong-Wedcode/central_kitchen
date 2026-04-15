package com.groupSWP.centralkitchenplatform.dto.analytics;

import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
public class ProductReportDto {
    private String productId;
    private String productName;
    private BigDecimal totalQuantity;
    private BigDecimal totalValue;

    // 🌟 VŨ KHÍ TỐI THƯỢNG: Dùng 'Number' để làm cái rổ hứng mọi loại số (Long, Double, BigDecimal...) từ DB ném ra
    public ProductReportDto(String productId, String productName, Number totalQuantity, Number totalValue) {
        this.productId = productId;
        this.productName = productName;

        // Chuyển đổi an toàn mọi loại số về BigDecimal chuẩn xác để tính tiền
        this.totalQuantity = totalQuantity != null ? new BigDecimal(totalQuantity.toString()) : BigDecimal.ZERO;
        this.totalValue = totalValue != null ? new BigDecimal(totalValue.toString()) : BigDecimal.ZERO;
    }
}