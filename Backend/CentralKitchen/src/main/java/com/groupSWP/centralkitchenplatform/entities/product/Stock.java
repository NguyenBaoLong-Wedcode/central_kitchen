package com.groupSWP.centralkitchenplatform.entities.product;

import com.groupSWP.centralkitchenplatform.entities.auth.Store;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "stocks")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Builder
public class Stock {
    @EmbeddedId
    private StockKey id;

    private int quantity;
    private LocalDateTime lastUpdated;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("storeId")
    @JoinColumn(name = "store_id")
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("productId")
    @JoinColumn(name = "product_id")
    private Product product;
}