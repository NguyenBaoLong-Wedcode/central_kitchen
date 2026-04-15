package com.groupSWP.centralkitchenplatform.dto.inventory;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ImportTicketResponse {
    private String ticketId;
    private LocalDateTime importDate;
    private String note;
    private BigDecimal totalAmount;
    private String status;
    private String createdByName; // Chỉ trả về tên nhân viên, không trả về Account/Password
    private List<ImportItemResponse> items;

    @Data
    @Builder
    public static class ImportItemResponse {
        private String ingredientName;
        private String unit;
        private BigDecimal quantity;
        private BigDecimal importPrice;
        private BigDecimal totalPrice; // Thành tiền = sl * giá
    }
}