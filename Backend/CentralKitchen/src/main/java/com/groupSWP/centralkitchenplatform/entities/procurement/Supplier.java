package com.groupSWP.centralkitchenplatform.entities.procurement;

import com.groupSWP.centralkitchenplatform.entities.common.BaseEntity;
import com.groupSWP.centralkitchenplatform.entities.procurement.ImportTicket;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "suppliers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Supplier extends BaseEntity {

    @Id
    @Column(name = "supplier_id")
    private String supplierId; // VD: SUP_01

    @Column(nullable = false)
    private String name;       // VD: Công ty Thực phẩm CP

    @Column(name = "contact_person")
    private String contactPerson; // Người liên hệ

    private String phone;
    private String email;
    private String address;

    @OneToMany(mappedBy = "supplier", cascade = CascadeType.ALL)
    private List<ImportTicket> importTickets;
}
