package com.groupSWP.centralkitchenplatform.entities.kitchen;

import com.groupSWP.centralkitchenplatform.entities.product.Product;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "formulas")
@Getter
@Setter @NoArgsConstructor @AllArgsConstructor
public class Formula {
    @EmbeddedId
    private FormulaKey id;

    private BigDecimal amountNeeded;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("productId")
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("ingredientId")
    @JoinColumn(name = "ingredient_id")
    private Ingredient ingredient;
}
