package com.groupSWP.centralkitchenplatform.entities.logistic;

import com.groupSWP.centralkitchenplatform.entities.auth.Store;
import com.groupSWP.centralkitchenplatform.entities.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Order extends BaseEntity {
    @Id
    private String orderId;

    // 1. Giữ lại bộ này (Có EnumType.STRING là chuẩn bài)
    @Enumerated(EnumType.STRING)
    @Column(name = "status", columnDefinition = "VARCHAR(50)")
    private OrderStatus status;

    private BigDecimal totalAmount;
    private String note;

    // 2. Giữ lại bộ này
    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", columnDefinition = "VARCHAR(50)")
    private OrderType orderType;

    @Enumerated(EnumType.STRING)
    private DeliveryWindow deliveryWindow;

    @Column(name = "delivery_date")
    private java.time.LocalDate deliveryDate;

    private BigDecimal surcharge;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id")
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shipment_id")
    private Shipment shipment;

    @Column(name = "shipping_start_time")
    private LocalDateTime shippingStartTime;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> orderItems = new ArrayList<>();

    public enum OrderStatus {
        NEW,
        PLANNED,          // 🔥 THÊM TRẠNG THÁI NÀY: Đã gom đơn, chờ mang đi nấu
        PREPARING,        // Bếp đang nấu
        SHIPPING,         // Đang trên xe giao đến cửa hàng
        DELIVERED,        // Xe đã tới nơi (Chờ Store Manager đếm hàng)
        PARTIAL_RECEIVED, // Cửa hàng báo THIẾU HÀNG (Chờ Bếp lên đơn bù)
        DONE,             // Cửa hàng báo NHẬN ĐỦ
        CANCELLED,
        READY_TO_SHIP,
        PENDING_PAYMENT
    }
    public enum OrderType { STANDARD, URGENT, COMPENSATION }
    public enum DeliveryWindow { MORNING, AFTERNOON }

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", columnDefinition = "VARCHAR(50)")
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID; // Mặc định tạo đơn là chưa trả tiền

    @Column(name = "transaction_id")
    private String transactionId; // Lưu mã giao dịch của VNPay (vnp_TransactionNo) để đối soát kế toán

    @Column(name = "payment_date")
    private LocalDateTime paymentDate; // Ghi nhận thời điểm tiền thực sự ting ting vào tài khoản

    // ... các khóa ngoại và liên kết bảng giữ nguyên ...

    // Khai báo Enum PaymentStatus ngay dưới OrderStatus
    public enum PaymentStatus {
        UNPAID,     // Chưa thanh toán (Đợi thanh toán hoặc trả tiền mặt)
        PAID,       // Đã thanh toán thành công qua cổng thanh toán
        FAILED,     // Thanh toán thất bại (Khách hủy ngang, thẻ hết tiền)
        REFUNDED    // Đã hoàn tiền (Do hủy đơn)
    }
}