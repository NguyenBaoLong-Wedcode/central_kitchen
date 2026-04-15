package com.groupSWP.centralkitchenplatform.repositories.notification;

import com.groupSWP.centralkitchenplatform.entities.notification.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByAccount_AccountIdOrderByCreatedAtDesc(UUID accountId);

    long countByAccount_AccountIdAndIsReadFalse(UUID accountId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.account.accountId = :accountId AND n.isRead = false")
    void markAllAsRead(@Param("accountId") UUID accountId);

    // 🔥 ĐÃ FIX: Thêm câu Query cập nhật trực tiếp 1 thông báo cho nhẹ máy
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.id = :notificationId")
    void markAsReadById(@Param("notificationId") UUID notificationId);
}