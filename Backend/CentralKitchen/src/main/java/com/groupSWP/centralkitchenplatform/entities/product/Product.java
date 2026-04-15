package com.groupSWP.centralkitchenplatform.entities.product;


import com.fasterxml.jackson.annotation.JsonIgnore;
import com.groupSWP.centralkitchenplatform.entities.common.BaseEntity;
import com.groupSWP.centralkitchenplatform.entities.common.UnitType;
import com.groupSWP.centralkitchenplatform.entities.kitchen.Formula;
import com.groupSWP.centralkitchenplatform.entities.kitchen.ProductionRun;
import com.groupSWP.centralkitchenplatform.entities.logistic.OrderItem;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(name = "products")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Builder
public class Product extends BaseEntity {
    @Id
    private String productId;
    private String productName;
    @ManyToOne
    @JoinColumn(name = "category_id", nullable = false) // Tạo cột category_id trong DB
    private Category category;

    private BigDecimal sellingPrice;
    private BigDecimal costPrice;
    @Enumerated(EnumType.STRING)
    private UnitType baseUnit;
    private boolean isActive;

    @OneToMany(mappedBy = "product")
    @JsonIgnore
    private List<Stock> stocks;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Formula> formulas; // BOM

//    @OneToMany(mappedBy = "product")
//    @JsonIgnore
//    private List<ProductionRun> productionRuns;

    @OneToMany(mappedBy = "product")
    @JsonIgnore
    private List<OrderItem> orderItems;
}