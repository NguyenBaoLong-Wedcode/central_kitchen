package com.groupSWP.centralkitchenplatform.controllers.order;

import com.groupSWP.centralkitchenplatform.service.inventory.ShipmentService;
import com.groupSWP.centralkitchenplatform.service.order.LogisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller quản lý luồng điều phối và theo dõi vận chuyển (Logistics Management).
 * <p>
 * Lớp này cung cấp các giao diện lập trình (API) chuyên biệt dành cho bộ phận Điều phối viên
 * (Coordinator) hoặc Quản lý (Manager). Các nghiệp vụ chính bao gồm:
 * <ul>
 * <li>Truy xuất danh sách đơn hàng đã nấu xong, sẵn sàng bốc xếp.</li>
 * <li>Theo dõi trạng thái các chuyến xe đang lưu thông trên đường.</li>
 * <li>Thực hiện ghép đơn, tạo chuyến xe và phân bổ tài xế thủ công.</li>
 * </ul>
 * </p>
 * <p>
 * <b>Vai trò Nghiệp vụ:</b> Hệ thống Logistics trong Central Kitchen đóng vai trò như mạch máu
 * kết nối giữa khu vực sản xuất (Bếp) và các điểm bán lẻ (Stores). Việc điều phối hiệu quả
 * không chỉ giúp đảm bảo độ tươi ngon của thực phẩm (đặc biệt là các đơn hàng nóng/lạnh)
 * mà còn tối ưu hóa chi phí nhiên liệu thông qua cơ chế ghép đơn (Order Consolidation).
 * Controller này cho phép Điều phối viên can thiệp trực tiếp vào lộ trình vận chuyển,
 * giải quyết các vấn đề phát sinh trong thực tế mà các thuật toán tự động có thể chưa xử lý kịp.
 * </p>
 * <p>
 * <b>Cơ chế Giám sát:</b> Mọi dữ liệu về chuyến xe và tài xế đều được theo dõi theo thời gian thực (Real-time),
 * giúp giảm thiểu rủi ro thất thoát hàng hóa và đảm bảo tính minh bạch trong quá trình bàn giao
 * hàng hóa giữa tài xế và Quản lý cửa hàng tại điểm cuối của hành trình.
 * </p>
 * <p>
 * <b>Bảo mật:</b> Toàn bộ API trong Controller này yêu cầu Token hợp lệ và
 * quyền truy cập tối thiểu từ cấp độ {@code COORDINATOR} trở lên.
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0
 * @since 2026-03-29
 */
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'COORDINATOR')")
@RestController
@RequestMapping("/api/logistics/orders")
@RequiredArgsConstructor
public class LogisticsController {

    /**
     * Service chuyên trách truy vấn và xử lý logic về trạng thái đơn hàng và lịch sử vận chuyển.
     */
    private final LogisticsService logisticsService;

    /**
     * Service chuyên trách xử lý các nghiệp vụ về Shipment (tạo chuyến xe, phân bổ lộ trình).
     */
    private final ShipmentService shipmentService;

    /**
     * API Lấy danh sách các đơn hàng đang chờ bốc xếp.
     * <p>
     * Truy xuất các đơn hàng có trạng thái {@code READY_TO_SHIP} và chưa được gán
     * vào bất kỳ chuyến xe (Shipment) nào. Dữ liệu này được Frontend sử dụng để
     * hiển thị danh sách cho Điều phối viên chọn và ghép chuyến, đảm bảo các đơn hàng
     * được ưu tiên theo thời gian nấu xong hoặc mức độ khẩn cấp (Urgent/Standard).
     * </p>
     *
     * @return Phản hồi HTTP 200 chứa danh sách các đơn hàng (Mã đơn, Tên cửa hàng, Loại đơn, Trạng thái).
     */
    @GetMapping("/ready")
    public ResponseEntity<List<Map<String, Object>>> getReadyOrders() {
        return ResponseEntity.ok(logisticsService.getReadyOrders());
    }

    /**
     * API Lấy danh sách các chuyến xe đang hoạt động.
     * <p>
     * Phục vụ màn hình giám sát (Tracking) của Điều phối viên. Truy xuất các chuyến xe
     * có trạng thái {@code PENDING} (Chờ xuất phát) hoặc {@code SHIPPING} (Đang giao).
     * Giúp quản lý nắm bắt được bao nhiêu phương tiện đang lưu hành và tiến độ giao hàng tổng thể.
     * </p>
     *
     * @return Phản hồi HTTP 200 chứa danh sách chuyến xe đang chạy (Mã xe, Tên tài xế, Biển số, Trạng thái).
     */
    @GetMapping("/active")
    public ResponseEntity<List<Map<String, Object>>> getActiveShipments() {
        return ResponseEntity.ok(logisticsService.getActiveShipments());
    }

    /**
     * API Xem chi tiết danh sách hàng hóa trên một chuyến xe cụ thể.
     * <p>
     * Giúp Điều phối viên kiểm tra xem chuyến xe này đang chở tổng cộng bao nhiêu món,
     * số lượng từng món là bao nhiêu để đối chiếu trước khi xe lăn bánh.
     * Đây là bước kiểm soát chất lượng (QC) cuối cùng trước khi hàng hóa rời khỏi Bếp trung tâm.
     * </p>
     *
     * @param shipmentId Mã định danh của chuyến xe (Shipment ID).
     * @return Phản hồi HTTP 200 chứa danh sách chi tiết các mặt hàng trên xe.
     */
    @GetMapping("/{shipmentId}/details")
    public ResponseEntity<List<Map<String, Object>>> getShipmentDetails(@PathVariable String shipmentId) {
        return ResponseEntity.ok(logisticsService.getShipmentDetails(shipmentId));
    }

    // =========================================================================
    // 5. TẠO CHUYẾN XE BẰNG TAY (THAY THẾ CHO AI)
    // =========================================================================
    /**
     * API Tạo chuyến xe giao hàng thủ công (Manual Allocation).
     * <p>
     * Nhận một danh sách các mã đơn hàng (Order IDs) do Điều phối viên tick chọn trên giao diện.
     * Hệ thống sẽ tự động khởi tạo một chuyến xe mới (Shipment) và gán tất cả các đơn hàng này vào xe đó.
     * Thao tác này cực kỳ hữu ích khi có các tình huống phát sinh đột xuất mà AI không thể dự đoán lộ trình tối ưu.
     * </p>
     *
     * @param payload Chuỗi JSON chứa danh sách các mã đơn hàng cần ghép.
     * Ví dụ: {@code {"orderIds": ["ORD-001", "ORD-002"]}}.
     * @return Phản hồi HTTP 200 thông báo tạo chuyến xe thành công kèm tin nhắn xác nhận.
     */
    @PostMapping("/manual-allocate")
    public ResponseEntity<Map<String, String>> allocateManualRoutes(@RequestBody Map<String, List<String>> payload) {
        List<String> orderIds = payload.get("orderIds");

        // 🔥 Tối ưu: Xóa try-catch. Gọi thẳng Service, lỗi ném ra sẽ được GlobalExceptionHandler bắt gọn
        String message = shipmentService.createManualShipment(orderIds);

        return ResponseEntity.ok(Map.of("status", "success", "message", message));
    }

    /**
     * API Lấy lịch sử các chuyến xe đã hoàn tất.
     * <p>
     * Phục vụ cho mục đích đối soát, thống kê và xem lại luồng công việc.
     * Lọc ra các chuyến xe có trạng thái {@code DELIVERED} (Đã giao) hoặc {@code RESOLVED} (Đã xử lý xong sự cố).
     * Giúp bộ phận quản lý phân tích hiệu suất giao hàng (KPI) của tài xế và thời gian vận chuyển trung bình.
     * </p>
     *
     * @return Phản hồi HTTP 200 chứa danh sách lịch sử chuyến xe, sắp xếp theo thời gian mới nhất.
     */
    @GetMapping("/history")
    public ResponseEntity<List<Map<String, Object>>> getCompletedShipments() {
        return ResponseEntity.ok(logisticsService.getCompletedShipments());
    }

    /**
     * API Lấy danh sách nhân sự có thể đảm nhiệm vai trò giao hàng.
     * <p>
     * Lọc ra danh sách các tài khoản có Role là {@code COORDINATOR} để hiển thị lên
     * Dropdown cho Điều phối viên chọn người lái xe (gán tài xế vào chuyến).
     * Việc chuẩn hóa dữ liệu giúp đảm bảo chỉ những nhân sự có thẩm quyền mới được phép vận hành phương tiện.
     * </p>
     *
     * @return Phản hồi HTTP 200 chứa danh sách ID, Username và Role của các nhân sự khả dụng.
     */
    @GetMapping("/coordinators-list")
    public ResponseEntity<List<Map<String, Object>>> getCoordinatorAccounts() {
        return ResponseEntity.ok(logisticsService.getCoordinatorAccounts());
    }
}