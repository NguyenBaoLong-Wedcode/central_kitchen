package com.groupSWP.centralkitchenplatform.dto.order;

import com.groupSWP.centralkitchenplatform.entities.logistic.Order;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class OrderResponse {
    private String orderId;
    private String status;
    private BigDecimal totalAmount;
    private String message;
    private String storeId;
    private Order.OrderType orderType;
    private String note;
    private BigDecimal surcharge;

    // --- 🚚 CẶP BÀI TRÙNG THÔNG BÁO LỊCH GIAO HÀNG ---
    private LocalDate deliveryDate;
    private Order.DeliveryWindow deliveryWindow;

    private List<OrderItemDto> items;

    @Data
    @Builder
    public static class OrderItemDto {
        private String productId;
        private String productName;
        private Integer quantity;
        private BigDecimal priceAtOrder;
        private BigDecimal subTotal;
    }
}