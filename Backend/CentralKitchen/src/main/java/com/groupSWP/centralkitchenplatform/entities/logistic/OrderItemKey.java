package com.groupSWP.centralkitchenplatform.entities.logistic;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;
import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemKey implements Serializable {

    @Column(name = "order_id")
    private String orderId;

    @Column(name = "product_id")
    private String productId;
}
