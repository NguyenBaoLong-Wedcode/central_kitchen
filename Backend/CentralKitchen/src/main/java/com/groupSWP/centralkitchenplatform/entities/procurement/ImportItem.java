package com.groupSWP.centralkitchenplatform.entities.procurement;

import com.groupSWP.centralkitchenplatform.entities.kitchen.Ingredient;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "import_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ImportItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private BigDecimal quantity;

    // 🔥 NEW: Số lượng còn lại để chạy vòng lặp FIFO
    @Column(nullable = false)
    private BigDecimal remainingQuantity;

    @Column(nullable = false)
    private BigDecimal importPrice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id")
    private ImportTicket importTicket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id")
    private Ingredient ingredient;
}