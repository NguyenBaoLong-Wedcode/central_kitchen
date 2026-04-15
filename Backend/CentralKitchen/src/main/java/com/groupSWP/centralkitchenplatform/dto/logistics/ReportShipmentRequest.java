package com.groupSWP.centralkitchenplatform.dto.logistics;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportShipmentRequest {

    // Đổi tên biến để hứng danh sách các món ăn thay vì đơn hàng
    private List<ItemReport> reportedItems;

    @Data
    @NoArgsConstructor   // Cần thiết để Spring Boot (Jackson) đọc được file JSON gửi lên
    @AllArgsConstructor  // Khuyên dùng cho các class DTO
    public static class ItemReport {
        private String productId;      // Mã món ăn/nguyên liệu bị thiếu
        private int receivedQuantity;  // Số lượng Cửa hàng thực tế đếm được lúc nhận
        private String note;           // Ghi chú lỗi (VD: "Bị đổ 2 hộp thịt", "Thiếu 1 túi sốt")
    }
}