package com.groupSWP.centralkitchenplatform.entities.auth;


import com.groupSWP.centralkitchenplatform.entities.common.BaseEntity;
import com.groupSWP.centralkitchenplatform.entities.logistic.Order;
import com.groupSWP.centralkitchenplatform.entities.product.Stock;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "stores")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Store extends BaseEntity {
    @Id
//    @GeneratedValue(strategy = GenerationType.UUID)
    private String storeId; // ST01
    private String name;
    private String address;
    private String phone;

    @Column(name = "type")
    private String type;

    private boolean isActive = true;

    @OneToOne(mappedBy = "store", cascade = CascadeType.ALL) //, orphanRemoval = true)
    private Account account;

    @OneToMany(mappedBy = "store", cascade = CascadeType.ALL)
    private List<Stock> stocks;

    @OneToMany(mappedBy = "store")
    private List<Order> orders;
}