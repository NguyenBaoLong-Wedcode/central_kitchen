package com.groupSWP.centralkitchenplatform.dto.order;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class OrderDetailResponse {
    private String orderId;
    private String storeId;
    private String orderType;
    private String status;

    // --- 🚚 LỊCH GIAO HÀNG ---
    private LocalDate deliveryDate;
    private String deliveryWindow;

    private String note;
    private BigDecimal totalAmount;
    private BigDecimal surcharge;
    private LocalDateTime createdAt;

    private List<OrderItemDto> items;

    @Data
    @Builder
    public static class OrderItemDto {
        private String productId;
        private String productName;
        private Integer quantity;
        private BigDecimal price;
        private BigDecimal lineTotal;
    }
}