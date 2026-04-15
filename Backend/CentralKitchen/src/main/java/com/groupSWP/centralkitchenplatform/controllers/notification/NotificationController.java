package com.groupSWP.centralkitchenplatform.controllers.notification;

import com.groupSWP.centralkitchenplatform.dto.notification.BroadcastRequest;
import com.groupSWP.centralkitchenplatform.dto.notification.NotificationResponse;
import com.groupSWP.centralkitchenplatform.entities.auth.Account;
import com.groupSWP.centralkitchenplatform.entities.notification.Notification;
import com.groupSWP.centralkitchenplatform.repositories.auth.AccountRepository;
import com.groupSWP.centralkitchenplatform.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;
    private final AccountRepository accountRepository; // Bơm vào để lấy thông tin Account từ Token

    // 🔥 HÀM HELPER: Bóc tách Account ID từ Token của người đang đăng nhập
    private UUID getAccountIdFromPrincipal(Principal principal) {
        String username = principal.getName();
        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại!"));
        return account.getAccountId();
    }

    // =========================================================================
    // 1. NGƯỜI DÙNG XEM DANH SÁCH THÔNG BÁO CỦA MÌNH
    // =========================================================================
    @GetMapping
    @PreAuthorize("isAuthenticated()") // 🔥 Bắt buộc đăng nhập
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(Principal principal) {
        UUID accountId = getAccountIdFromPrincipal(principal);
        return ResponseEntity.ok(notificationService.getUserNotifications(accountId));
    }

    // =========================================================================
    // 2. LẤY SỐ LƯỢNG CHƯA ĐỌC (HIỂN THỊ CHẤM ĐỎ)
    // =========================================================================
    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Long> getUnreadCount(Principal principal) {
        UUID accountId = getAccountIdFromPrincipal(principal);
        return ResponseEntity.ok(notificationService.getUnreadCount(accountId));
    }

    // =========================================================================
    // 3. ĐÁNH DẤU ĐÃ ĐỌC TẤT CẢ (Làm mất hết chấm đỏ)
    // =========================================================================
    @PutMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> markAllAsRead(Principal principal) {
        UUID accountId = getAccountIdFromPrincipal(principal);
        notificationService.markAllAsRead(accountId);
        return ResponseEntity.ok("Đã dọn dẹp sạch sẽ, không còn cái chấm đỏ nào!");
    }

    // =========================================================================
    // 4. ĐÁNH DẤU ĐÃ ĐỌC 1 THÔNG BÁO CỤ THỂ (Khi User click vào 1 dòng)
    // =========================================================================
    @PutMapping("/{notificationId}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> markAsRead(@PathVariable UUID notificationId, Principal principal) {
        // Vẫn cần Principal để đảm bảo Endpoint này chỉ xài khi đã Login
        notificationService.markAsRead(notificationId);
        return ResponseEntity.ok("Đã xem thông báo: " + notificationId);
    }

    // =========================================================================
    // 5. [ĐẶC QUYỀN ADMIN] PHÁT LOA THÔNG BÁO TOÀN HỆ THỐNG
    // =========================================================================
    @PostMapping("/broadcast")
    @PreAuthorize("hasAnyRole('ADMIN')") // 🔥 Giữ nguyên đặc quyền Admin
    public ResponseEntity<String> broadcastNotification(@RequestBody BroadcastRequest request) {
        log.info("📢 Admin đang lên sóng phát loa...");

        Notification.NotificationType type = Notification.NotificationType.valueOf(request.getType());
        notificationService.broadcastNotification(request.getTargetRoles(), request.getTitle(), request.getMessage(), type);

        return ResponseEntity.ok("Phát loa thông báo thành công rực rỡ!");
    }
}