package com.groupSWP.centralkitchenplatform.entities.procurement;

import com.groupSWP.centralkitchenplatform.entities.auth.SystemUser;
import com.groupSWP.centralkitchenplatform.entities.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Entity
@Table(name = "import_tickets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ImportTicket extends BaseEntity {
    @Id
    private String ticketId;
    private BigDecimal totalAmount;
    private String note;

    @Enumerated(EnumType.STRING)
    private ImportStatus status;

    public enum ImportStatus { DRAFT, COMPLETED, CANCELLED }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @ManyToOne
    @JoinColumn(name = "created_by", columnDefinition = "VARCHAR(20)")
    private SystemUser createdBy;

    @OneToMany(mappedBy = "importTicket", cascade = CascadeType.ALL)
    private List<ImportItem> importItems;
}
