package com.groupSWP.centralkitchenplatform.entities.auth;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "accounts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "account_id", columnDefinition = "BINARY(16)")
    private UUID accountId;

    @Column(unique = true)
    private String username;
    private String password; // Mật khẩu CHỈ để ở đây

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 30)
    // Lưu dưới dạng VARCHAR(30) trong MySQL: "ADMIN", "KITCHEN_STAFF",...
    private Role role;

    public enum Role {
        ADMIN,              // 1. Quản trị hệ thống
        MANAGER,            // 2. Quản lý vận hành (Sếp to)
        COORDINATOR,        // 3. Điều phối cung ứng (Logistics)
        KITCHEN_MANAGER,      // 4. Nhân viên quản lý bếp trung tâm
        STORE_MANAGER         // 5. Nhân viên quản lý cửa hàng (Franchise)
    }

    // Liên kết 1-1 với thông tin chi tiết người dùng
    @OneToOne(mappedBy = "account", cascade = CascadeType.ALL)
    @JsonIgnore
    private SystemUser systemUser;

    @Column(name = "active_token", length = 512) // Token JWT thường khá dài
    private String activeToken;

    @Column(name = "is_active")
    private boolean isActive = true;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", unique = true)
    private Store store;
}