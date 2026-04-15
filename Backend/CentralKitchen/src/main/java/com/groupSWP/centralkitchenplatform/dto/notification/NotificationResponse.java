package com.groupSWP.centralkitchenplatform.dto.notification;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class NotificationResponse {
    private UUID id;
    private String title;
    private String message;
    private String type;           // INFO, SUCCESS, WARNING, URGENT
    private boolean isRead;        // FE dựa vào đây để tô đậm/nhạt
    private String referenceLink;
    private LocalDateTime createdAt;
}