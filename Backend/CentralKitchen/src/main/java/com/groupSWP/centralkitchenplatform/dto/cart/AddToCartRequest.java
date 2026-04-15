package com.groupSWP.centralkitchenplatform.dto.cart;

import lombok.Data;

@Data
public class AddToCartRequest {
    private String productId;
    private int quantity; // Số lượng muốn THÊM vào (VD: +5)
}