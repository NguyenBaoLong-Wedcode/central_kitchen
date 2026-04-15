package com.groupSWP.centralkitchenplatform.entities.logistic;

import com.groupSWP.centralkitchenplatform.entities.product.Product;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class OrderItem {
    @EmbeddedId
    private OrderItemKey id;

    private int quantity;
    private BigDecimal priceAtOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("orderId")
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("productId")
    @JoinColumn(name = "product_id")
    private Product product;
}
