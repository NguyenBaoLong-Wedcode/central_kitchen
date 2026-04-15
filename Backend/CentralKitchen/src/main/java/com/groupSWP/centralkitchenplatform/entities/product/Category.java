package com.groupSWP.centralkitchenplatform.entities.product;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.groupSWP.centralkitchenplatform.entities.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Table(name = "categories")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Category extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Dùng Long tự tăng cho đơn giản (1, 2, 3...)

    @Column(nullable = false, unique = true)
    private String name; // Ví dụ: "Món Nước", "Cơm", "Tráng Miệng"

    private String description;

    // Quan hệ 1-N: Một danh mục có nhiều sản phẩm
    @OneToMany(mappedBy = "category", fetch = FetchType.LAZY)
    @JsonIgnore // Tránh vòng lặp khi in Category ra JSON
    private List<Product> products;
}