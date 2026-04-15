package com.groupSWP.centralkitchenplatform.entities.kitchen;

import jakarta.persistence.Embeddable;
import lombok.*;
import java.io.Serializable;

@Embeddable
@Data @NoArgsConstructor @AllArgsConstructor
public class FormulaKey implements Serializable {
    private String productId;
    private String ingredientId;
}