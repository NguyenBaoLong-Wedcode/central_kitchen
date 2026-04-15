package com.groupSWP.centralkitchenplatform.entities.kitchen;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.groupSWP.centralkitchenplatform.entities.common.UnitType;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "unit_conversions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Builder
public class UnitConversion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Link ngược về Ingredient
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id", nullable = false)
    @JsonIgnore
    private Ingredient ingredient;

    // Đơn vị quy đổi (VD: THUNG)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UnitType unit;

    // Hệ số quy đổi ra đơn vị gốc
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal conversionFactor;
}