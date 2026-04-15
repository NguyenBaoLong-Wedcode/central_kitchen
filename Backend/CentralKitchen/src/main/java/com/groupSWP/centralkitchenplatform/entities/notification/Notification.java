package com.groupSWP.centralkitchenplatform.entities.notification;

import com.groupSWP.centralkitchenplatform.entities.auth.Account;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Liên kết với tài khoản người nhận (Ai là người nhận cái chuông này)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    // Tiêu đề ngắn gọn (VD: "🚨 Có đơn khẩn cấp!")
    @Column(nullable = false)
    private String title;

    // 🔥 ĐÃ FIX: Dùng TEXT để lưu nội dung dài tẹt ga, không bị gò bó 500 ký tự nữa
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    // Phân loại thông báo để Frontend tô màu (INFO: xanh dương, URGENT: đỏ, WARNING: vàng, SUCCESS: xanh lá)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    // Đánh dấu người dùng đã bấm vào xem chưa (Để hiện chấm đỏ trên chuông)
    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    // Đường dẫn để khi user click vào thông báo thì nhảy tới trang chi tiết (Tùy chọn)
    @Column(name = "reference_link")
    private String referenceLink;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum NotificationType {
        INFO,       // Thông báo chung chung
        SUCCESS,    // Giao hàng thành công, chốt đơn xong
        WARNING,    // Sắp hết nguyên liệu, cảnh báo lỗi hệ thống
        URGENT      // Đơn khẩn cấp, cần xử lý ngay lập tức
    }
}