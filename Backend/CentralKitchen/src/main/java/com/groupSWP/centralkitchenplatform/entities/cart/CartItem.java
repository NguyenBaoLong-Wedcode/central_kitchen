package com.groupSWP.centralkitchenplatform.entities.cart;

import com.groupSWP.centralkitchenplatform.entities.product.Product;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cart_item")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CartItem {

    @EmbeddedId
    private CartItemKey id;

    @Column(nullable = false)
    private int quantity; // Số lượng muốn mua

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("cartId")
    @JoinColumn(name = "cart_id")
    private Cart cart;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("productId")
    @JoinColumn(name = "product_id")
    private Product product;
}