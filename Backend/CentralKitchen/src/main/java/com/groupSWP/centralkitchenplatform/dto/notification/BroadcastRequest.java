package com.groupSWP.centralkitchenplatform.dto.notification;

import lombok.Data;
import java.util.List;

@Data
public class BroadcastRequest {
    private String title;
    private String message;
    private String type; // INFO, WARNING...

    // Gửi cho những Role nào? VD: ["STORE_MANAGER", "KITCHEN_MANAGER"].
    // Nếu để rỗng hoặc null là gửi cho TẤT CẢ mọi người.
    private List<String> targetRoles;
}