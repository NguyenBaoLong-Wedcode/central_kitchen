package com.groupSWP.centralkitchenplatform.controllers.order;

import com.groupSWP.centralkitchenplatform.service.order.OrderDeliveryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller xử lý luồng trạng thái giao nhận và chuẩn bị đơn hàng (Delivery Flow).
 * <p>
 * Lớp này cung cấp các API để cập nhật tiến độ của một đơn hàng cụ thể
 * (từ lúc tiếp nhận, chuẩn bị trong bếp, cho đến khi sẵn sàng giao).
 * Thường được sử dụng bởi bộ phận Bếp trung tâm (Kitchen) để báo cáo tiến độ thực tế.
 * </p>
 * <p>
 * <b>Chi tiết luồng vận hành (State Machine):</b>
 * Việc cập nhật tuần tự các trạng thái này đóng vai trò sống còn trong việc
 * đồng bộ hóa dữ liệu giữa Bếp trung tâm, hệ thống Logistics và ứng dụng của Cửa hàng.
 * Đảm bảo tính minh bạch về thời gian thực (Real-time tracking).
 * </p>
 * * @author Đạt, Huy, Triển
 * @version 1.0
 * @since 2026-03-26
 */
@RestController
@RequestMapping("/api/orders/delivery")
@RequiredArgsConstructor
public class DeliveryFlowController {

    private final OrderDeliveryService deliveryService;

    // Kitchen Manager gọi
    /**
     * API Cập nhật trạng thái đơn hàng thành "Đang chuẩn bị" (PREPARING).
     * <p>
     * Hành động này đánh dấu việc Bếp trung tâm đã tiếp nhận đơn hàng (từ trạng thái PLANNED) và
     * bắt đầu quá trình nấu nướng, xuất kho nguyên liệu hoặc đóng gói.
     * </p>
     * <p>
     * <b>Ghi chú nghiệp vụ:</b> Khi API này kích hoạt, hệ thống sẽ bắt đầu tính toán
     * thời gian chuẩn bị thực tế (Actual Lead Time) để làm cơ sở đo lường KPI hiệu suất
     * của ca trực tại Bếp trung tâm.
     * </p>
     *
     * @param orderId Mã đơn hàng cần cập nhật trạng thái. Đảm bảo mã này tồn tại trong hệ thống.
     * @return Phản hồi HTTP 200 kèm thông báo đã cập nhật thành công dưới dạng JSON.
     * @throws IllegalArgumentException Nếu tham số orderId bị bỏ trống hoặc không hợp lệ.
     */
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','KITCHEN_MANAGER')")
    @PostMapping("/{orderId}/preparing")
    public ResponseEntity<?> setPreparing(@PathVariable String orderId) {
        deliveryService.markAsPreparing(orderId);
        return ResponseEntity.ok(Map.of("message", "Đã cập nhật trạng thái: Đang chuẩn bị"));
    }

    /**
     * API Cập nhật trạng thái đơn hàng thành "Sẵn sàng giao" (READY_TO_SHIP).
     * <p>
     * Bếp trưởng bấm nút này khi món ăn đã nấu xong và đóng gói hoàn tất.
     * Lúc này, đơn hàng sẽ chính thức xuất hiện trên màn hình của Điều phối viên (Logistics)
     * để chờ được gép vào xe và đi giao.
     * </p>
     * <p>
     * <b>Tác động hệ thống:</b> Đây là điểm chuyển giao trách nhiệm (Handover point)
     * từ bộ phận Bếp sang bộ phận Vận chuyển. Hệ thống Routing có thể bắt đầu xếp tài xế.
     * </p>
     *
     * @param orderId Mã đơn hàng đã hoàn tất khâu chuẩn bị (Bắt buộc phải đang ở trạng thái PREPARING).
     * @return Phản hồi HTTP 200 xác nhận đơn hàng đã sẵn sàng lên xe.
     * @throws IllegalStateException Nếu đơn hàng nhảy cóc trạng thái (ví dụ chưa nấu mà đã bấm sẵn sàng).
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'KITCHEN_MANAGER')")
    @PostMapping("/{orderId}/ready")
    public ResponseEntity<?> setReadyToShip(@PathVariable String orderId) {
        // Gọi xuống tầng Service để xử lý logic đổi trạng thái
        deliveryService.markAsReadyToShip(orderId);
        return ResponseEntity.ok(Map.of("message", "Đã nấu xong! Đơn hàng đang chờ xe tới lấy (READY_TO_SHIP)."));
    }
}