package com.groupSWP.centralkitchenplatform.dto.order;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class OrderHistoryResponse {
    private String orderId;
    private String orderType;       // STANDARD hay URGENT
    private String status;          // NEW, PROCESSING, SHIPPING, DONE...
    private BigDecimal totalAmount; // Tổng tiền (bao gồm cả phụ phí nếu có)
    private LocalDateTime createdAt; // Ngày giờ đặt
}