package com.groupSWP.centralkitchenplatform.dto.kitchen;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PendingOrderResponse {
    private String orderId;
    private String storeName;
    private String orderType; // Dùng để FE tô màu đơn URGENT
    private String status;
    private LocalDateTime createdAt;
    private List<Item> items; // Lôi tên món ra cho FE vẽ list

    @Data
    @Builder
    public static class Item {
        private String productId;
        private String productName;
        private int quantity;
    }
}