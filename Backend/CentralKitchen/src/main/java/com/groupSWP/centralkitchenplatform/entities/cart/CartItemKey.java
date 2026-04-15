package com.groupSWP.centralkitchenplatform.entities.cart;

import jakarta.persistence.Embeddable;
import lombok.*;
import java.io.Serializable;

@Embeddable
@Data @NoArgsConstructor @AllArgsConstructor
public class CartItemKey implements Serializable {
    private String cartId;
    private String productId;
}