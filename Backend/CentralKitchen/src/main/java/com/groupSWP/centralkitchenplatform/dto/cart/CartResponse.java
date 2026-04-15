package com.groupSWP.centralkitchenplatform.dto.cart;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class CartResponse {
    private String cartId;
    private String storeId;
    private List<CartItemDto> items;
    private java.math.BigDecimal totalAmount; // Tổng tiền tạm tính

    @Data
    @Builder
    public static class CartItemDto {
        private String productId;
        private String productName;
        private int quantity;
        private java.math.BigDecimal unitPrice;
        private java.math.BigDecimal subTotal;
    }
}