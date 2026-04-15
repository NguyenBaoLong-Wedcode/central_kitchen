package com.groupSWP.centralkitchenplatform.dto.cart;

import com.groupSWP.centralkitchenplatform.entities.logistic.Order; // Đảm bảo import đúng Enum của Sếp
import lombok.Data;

@Data
public class CheckoutRequest {
    private Order.OrderType orderType; // STANDARD hoặc URGENT
    private String note; // Ghi chú thêm cho Bếp
}