package com.groupSWP.centralkitchenplatform.entities.logistic;

import com.groupSWP.centralkitchenplatform.entities.auth.Account;
import com.groupSWP.centralkitchenplatform.entities.auth.SystemUser;
import com.groupSWP.centralkitchenplatform.entities.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "shipments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shipment extends BaseEntity {
    @Id
    private String shipmentId;
    private LocalDateTime deliveryDate;
    private String driverName;
    private String vehiclePlate;

    @Enumerated(EnumType.STRING)
    private ShipmentStatus status;

    @Enumerated(EnumType.STRING)
    private ShipmentType shipmentType;

    @ManyToOne
    @JoinColumn(name = "coord_id", columnDefinition = "VARCHAR(20)")
    private SystemUser coordinator;

    @OneToMany(mappedBy = "shipment")
    private List<Order> orders;


    // Thêm vào Shipment.java
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    private Account driver; // Liên kết tới bảng Account (User)

    @OneToMany(mappedBy = "shipment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default// Thêm cái này nếu dùng @Builder để tránh list bị null
    private List<ShipmentDetail> shipmentDetails = new ArrayList<>();

    public enum ShipmentStatus {
        PENDING,       // Chờ xử lý
        SHIPPING,      // Đang giao
        DELIVERED,     // Đã giao đủ
        ISSUE_REPORTED,// Đã giao nhưng có báo cáo thiếu/sai hàng
        RESOLVED       // Đã xử lý xong sự cố (đã lên đơn bù)
    }

    // [ĐÃ SỬA CHỖ NÀY]: Cập nhật theo đúng chuẩn Spec mới
    public enum ShipmentType {
        MAIN_ROUTE,    // Chuyến xe chở đơn STANDARD (Gom nhiều đơn, giao sáng hôm sau)
        EXPRESS,       // Chuyến xe chở đơn URGENT (Giao gấp trong 2 tiếng)
        REPLACEMENT    // Chuyến xe đền bù (Giữ lại cho luồng xử lý sự cố)
    }
    private LocalDateTime resolvedAt;
    private LocalDateTime deliveredAt;
}
