package com.groupSWP.centralkitchenplatform.entities.product;

import jakarta.persistence.Embeddable;
import lombok.*;
import java.io.Serializable;

@Embeddable
@Data @NoArgsConstructor @AllArgsConstructor
public class StockKey implements Serializable {
    private String storeId;
    private String productId;
}
