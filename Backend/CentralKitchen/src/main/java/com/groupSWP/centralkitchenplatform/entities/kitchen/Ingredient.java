package com.groupSWP.centralkitchenplatform.entities.kitchen;

// [1] THÊM IMPORT NÀY
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.groupSWP.centralkitchenplatform.entities.common.UnitType;
import com.groupSWP.centralkitchenplatform.entities.procurement.ImportItem;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(name = "ingredients")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Ingredient {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String ingredientId;
    // [VŨ KHÍ MỚI] THÊM 2 DÒNG NÀY VÀO ĐỂ BẬT KHIÊN CHỐNG CHẠM DỮ LIỆU NHÉ
    @Version
    private Long version;
    private String name;
    private BigDecimal kitchenStock;
    // [2] SỬA DÒNG NÀY (Cũ là String -> Mới là UnitType + @Enumerated)
    @Enumerated(EnumType.STRING)
    private UnitType unit;
    private BigDecimal unitCost;
    private BigDecimal minThreshold;

    @JsonIgnore
    @OneToMany(mappedBy = "ingredient")
    private List<Formula> formulas;

    @JsonIgnore
    @OneToMany(mappedBy = "ingredient")
    private List<ImportItem> importItems;

    @JsonIgnore
    @OneToMany(mappedBy = "ingredient", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<UnitConversion> conversions;
}