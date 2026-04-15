package com.groupSWP.centralkitchenplatform.entities.kitchen;

import com.groupSWP.centralkitchenplatform.entities.procurement.ImportItem;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InventoryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 🔥 UPDATE: Trỏ cứng về Lô hàng bị trừ (Thay vì Long importItemId)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_item_id")
    private ImportItem importItem;

    // 🔥 UPDATE: Trỏ cứng về Nguyên liệu (Thay vì String ingredientId)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    // 🔥 UPDATE: Trỏ cứng về Mẻ nấu (Thay vì String referenceCode)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "run_id")
    private ProductionRun productionRun;

    @Column(nullable = false)
    private BigDecimal quantityDeducted; // Bị trừ bao nhiêu?

    private String note;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "reference_code")
    private String referenceCode;

    @Column(name = "created_by")
    private String createdBy;
}