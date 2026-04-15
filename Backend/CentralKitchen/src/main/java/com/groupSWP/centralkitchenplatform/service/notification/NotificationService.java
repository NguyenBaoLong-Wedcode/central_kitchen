package com.groupSWP.centralkitchenplatform.service.notification;

import com.groupSWP.centralkitchenplatform.dto.notification.NotificationResponse;
import com.groupSWP.centralkitchenplatform.entities.auth.Account;
import com.groupSWP.centralkitchenplatform.entities.notification.Notification;
import com.groupSWP.centralkitchenplatform.repositories.auth.AccountRepository;
import com.groupSWP.centralkitchenplatform.repositories.notification.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate; // 🔥 Thêm import WebSocket
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map; // 🔥 Thêm import Map
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final AccountRepository accountRepository; // Để Admin lôi danh sách nhân viên ra phát loa

    // 🔥 Tiêm vũ khí bắn Real-time WebSocket vào đây
    private final SimpMessagingTemplate messagingTemplate;

    // =========================================================================
    // 1. HÀM LÕI: TẠO VÀ LƯU THÔNG BÁO CHO 1 NGƯỜI (DÙNG NỘI BỘ)
    // =========================================================================
    @Transactional
    public void sendNotification(Account account, String title, String message, Notification.NotificationType type, String referenceLink) {
        Notification notification = Notification.builder()
                .account(account)
                .title(title)
                .message(message)
                .type(type)
                .isRead(false)
                .referenceLink(referenceLink)
                .build();

        // LƯU VÀO DB TRƯỚC (Bộ nhớ dài hạn)
        Notification savedNote = notificationRepository.save(notification);
        log.info("Đã lưu chuông báo cho user {}: {}", account.getUsername(), title);

        // 🔥 ĐÃ GIẢI QUYẾT TODO: Bắn tín hiệu Real-time qua WebSocket (Ting Ting!)
        try {
            // Kênh nhận của FE: /user/{username}/topic/notifications
            String destination = "/user/" + account.getUsername() + "/topic/notifications";

            // 👉 CHỐT HẠ ĐỈNH CAO: Dùng luôn DTO có sẵn của Sếp, vứt Map đi! IDE hết dám cãi.
            NotificationResponse payload = NotificationResponse.builder()
                    .id(savedNote.getId())
                    .title(title)
                    .message(message)
                    .type(type.name())
                    .isRead(false)
                    .referenceLink(referenceLink)
                    .createdAt(savedNote.getCreatedAt() != null ? savedNote.getCreatedAt() : java.time.LocalDateTime.now())
                    .build();

            messagingTemplate.convertAndSend(destination, payload);
            log.info("🚀 Đã bắn Ting-Ting thành công tới user {}", account.getUsername());

        } catch (Exception e) {
            log.error("❌ Lỗi khi bắn WebSocket tới {}: {}", account.getUsername(), e.getMessage());
        }
    }

    // =========================================================================
    // 2. ADMIN PHÁT LOA TỚI NHIỀU ROLE HOẶC TOÀN HỆ THỐNG
    // =========================================================================
    @Transactional
    public void broadcastNotification(List<String> roles, String title, String message, Notification.NotificationType type) {
        List<Account> targetAccounts;

        if (roles == null || roles.isEmpty()) {
            // Nếu không truyền role gì -> Gửi cho TẤT CẢ mọi người
            targetAccounts = accountRepository.findAll();
        } else {
            List<Account.Role> enumRoles = roles.stream()
                    .map(Account.Role::valueOf)
                    .collect(Collectors.toList());

            // Gọi hàm mới chuẩn xác 100%
            targetAccounts = accountRepository.findByRoleIn(enumRoles);
        }

        for (Account acc : targetAccounts) {
            sendNotification(acc, title, message, type, null);
        }
        log.info("Admin đã phát loa thông báo tới {} nhân viên!", targetAccounts.size());
    }

    // =========================================================================
    // 3. API CHO FRONTEND: LẤY DANH SÁCH THÔNG BÁO CỦA MÌNH
    // =========================================================================
    public List<NotificationResponse> getUserNotifications(UUID accountId) {
        List<Notification> notifications = notificationRepository.findByAccount_AccountIdOrderByCreatedAtDesc(accountId);

        return notifications.stream().map(n -> NotificationResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType().name())
                .isRead(n.isRead())
                .referenceLink(n.getReferenceLink())
                .createdAt(n.getCreatedAt())
                .build()).collect(Collectors.toList());
    }

    // =========================================================================
    // 4. API CHO FRONTEND: ĐẾM SỐ CHƯA ĐỌC (Làm dấu chấm đỏ)
    // =========================================================================
    public long getUnreadCount(UUID accountId) {
        return notificationRepository.countByAccount_AccountIdAndIsReadFalse(accountId);
    }

    // =========================================================================
    // 5. API CHO FRONTEND: ĐÁNH DẤU ĐÃ ĐỌC TẤT CẢ
    // =========================================================================
    @Transactional
    public void markAllAsRead(UUID accountId) {
        notificationRepository.markAllAsRead(accountId);
    }

    // =========================================================================
    // 6. API CHO FRONTEND: ĐÁNH DẤU ĐÃ ĐỌC 1 CÁI (Khi bấm vào xem chi tiết)
    // =========================================================================
    // 🔥 ĐÃ FIX: Gọi thẳng câu Query Update cho nhẹ máy, bỏ FindById
    @Transactional
    public void markAsRead(UUID notificationId) {
        notificationRepository.markAsReadById(notificationId);
    }
}