package com.groupSWP.centralkitchenplatform.entities.kitchen;

import com.groupSWP.centralkitchenplatform.entities.common.BaseEntity;
import com.groupSWP.centralkitchenplatform.entities.logistic.Order;
import com.groupSWP.centralkitchenplatform.entities.product.Product;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "production_runs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductionRun extends BaseEntity {
    @Id
    private String runId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", unique = true)
    private Order order; // 🌟 1 Phiếu nấu phục vụ cho 1 Đơn hàng duy nhất

    @ElementCollection
    @CollectionTable(name = "production_run_cooked_items", joinColumns = @JoinColumn(name = "run_id"))
    @Column(name = "product_id")
    private List<String> cookedProductIds = new ArrayList<>(); // 🌟 Lưu ID các món đã tick chọn nấu xong

    private BigDecimal totalCostAtProduction;
    private LocalDateTime productionDate;
    private String note;

    @Enumerated(EnumType.STRING)
    private ProductionStatus status;

    public enum ProductionStatus { PLANNED, COOKING, COMPLETED, CANCELLED }
}