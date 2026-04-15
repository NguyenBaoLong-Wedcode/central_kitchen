package com.groupSWP.centralkitchenplatform.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChartDataPoint {
    private String timeLabel;       // Nhãn thời gian (Ngày/Tháng/Năm tùy bộ lọc FE chọn)
    private BigDecimal exportValue; // Tổng giá trị xuất kho
    private Long totalOrders;       // Số lượng đơn hàng
}