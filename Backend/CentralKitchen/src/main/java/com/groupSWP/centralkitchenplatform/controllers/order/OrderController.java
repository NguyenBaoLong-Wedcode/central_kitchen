package com.groupSWP.centralkitchenplatform.controllers.order;

import com.groupSWP.centralkitchenplatform.dto.order.*;
import com.groupSWP.centralkitchenplatform.service.order.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller quản lý luồng Đơn hàng (Order Management) dành riêng cho cấp Quản lý (Admin/Manager).
 * <p>
 * Lớp này cung cấp các API mang tính chất "đặc quyền", cho phép Quản lý hệ thống có thể:
 * <ul>
 * <li>Tạo đơn hàng đặt hộ cho một Cửa hàng (Store) bất kỳ.</li>
 * <li>Tra cứu lịch sử đơn hàng của mọi cửa hàng trong hệ thống (không bị giới hạn dữ liệu).</li>
 * <li>Xem chi tiết hoặc can thiệp hủy đơn hàng nếu cần thiết.</li>
 * </ul>
 * </p>
 * <p>
 * <b>Phân quyền:</b> Toàn bộ class này được bảo vệ nghiêm ngặt, chỉ cho phép tài khoản
 * mang quyền {@code ADMIN} hoặc {@code MANAGER} truy cập.
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0.0
 * @since 2026-03-26
 */
@Slf4j
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
// 🔥 ĐÃ FIX LỖI 403: Chuyển sang hasAnyAuthority để bao trọn mọi trường hợp Token
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public class OrderController {

    private final OrderService orderService;

    // =======================================================
    // 1. MANAGER TẠO ĐƠN GIÚP CỬA HÀNG (Cần truyền storeId)
    // =======================================================

    /**
     * API Tạo đơn hàng Tiêu chuẩn (Standard Order) đặt hộ Cửa hàng.
     * <p>
     * Dùng trong trường hợp Cửa hàng trưởng gặp sự cố không thể tự đặt hàng,
     * Quản lý hội sở sẽ dùng API này để khởi tạo đơn hàng thay cho họ.
     * Bắt buộc phải truyền mã cửa hàng ({@code storeId}) trong payload.
     * </p>
     *
     * @param request Payload chứa danh sách món, số lượng và {@code storeId} của cửa hàng cần đặt.
     * @return Phản hồi HTTP 200 chứa thông tin đơn hàng vừa được tạo.
     * @throws IllegalArgumentException nếu thiếu thông tin {@code storeId}.
     * @throws RuntimeException nếu quá trình lưu đơn hàng vào cơ sở dữ liệu gặp sự cố.
     */
    @PostMapping("/standard")
    public ResponseEntity<OrderResponse> createStandardOrder(@RequestBody OrderRequest request) {
        if (request.getStoreId() == null || request.getStoreId().isEmpty()) {
            throw new IllegalArgumentException("Manager/Admin khi tạo đơn hộ phải chỉ định rõ mã cửa hàng (storeId)!");
        }
        log.info("Manager/Admin đang tạo đơn STANDARD cho cửa hàng {}", request.getStoreId());

        return ResponseEntity.ok(orderService.createOrder(request, false));
    }

    /**
     * API Tạo đơn hàng Khẩn cấp (Urgent Order) đặt hộ Cửa hàng.
     * <p>
     * Tương tự đơn tiêu chuẩn nhưng luồng xử lý sẽ ưu tiên đẩy nhanh tốc độ chuẩn bị
     * tại Bếp trung tâm. Phục vụ các trường hợp cửa hàng bị cháy hàng đột xuất.
     * </p>
     *
     * @param request Payload chứa danh sách món, số lượng và {@code storeId}.
     * @return Phản hồi HTTP 200 chứa thông tin đơn hàng khẩn cấp vừa được tạo.
     * @throws IllegalArgumentException nếu thiếu thông tin {@code storeId}.
     * @throws RuntimeException nếu quá trình thiết lập độ ưu tiên khẩn cấp gặp lỗi.
     */
    @PostMapping("/urgent")
    public ResponseEntity<OrderResponse> createUrgentOrder(@RequestBody OrderRequest request) {
        if (request.getStoreId() == null || request.getStoreId().isEmpty()) {
            throw new IllegalArgumentException("Manager/Admin khi tạo đơn hộ phải chỉ định rõ mã cửa hàng (storeId)!");
        }
        log.info("Manager/Admin đang tạo đơn URGENT cho cửa hàng {}", request.getStoreId());

        return ResponseEntity.ok(orderService.createOrder(request, true));
    }

    // =======================================================
    // 2. MANAGER XEM LỊCH SỬ ĐƠN (Của 1 tiệm cụ thể)
    // =======================================================

    /**
     * API Tra cứu lịch sử toàn bộ đơn hàng của một cửa hàng cụ thể.
     * <p>
     * Quản lý có thể chọn một cửa hàng từ giao diện để xem chi tiết tình hình đặt hàng
     * của cửa hàng đó qua các thời kỳ. Nếu không truyền tham số {@code storeId},
     * hệ thống sẽ tự động chặn lại với lỗi HTTP 400.
     * </p>
     *
     * @param storeId Mã định danh của Cửa hàng (truyền qua Query Parameter).
     * @return Phản hồi HTTP 200 chứa danh sách lịch sử đơn hàng của cửa hàng đó.
     * @throws IllegalArgumentException Nếu tham số storeId không hợp lệ hoặc bị bỏ trống.
     */
    @GetMapping("/history")
    public ResponseEntity<List<OrderHistoryResponse>> getOrderHistory(
            @RequestParam(required = true) String storeId) {
        // Lưu ý BA: @RequestParam(required = true) sẽ tự động ném lỗi HTTP 400 nếu Manager quên truyền storeId
        log.info("Manager/Admin đang xem lịch sử đơn của cửa hàng {}", storeId);

        return ResponseEntity.ok(orderService.getOrderHistory(storeId));
    }

    // =======================================================
    // 3. MANAGER XEM CHI TIẾT BẤT KỲ ĐƠN NÀO
    // =======================================================

    /**
     * API Xem chi tiết một đơn hàng cụ thể.
     * <p>
     * Nhờ đặc quyền của Quản lý, API này có thể truy xuất bất kỳ mã đơn hàng ({@code orderId}) nào
     * trong toàn bộ hệ thống mà không bị giới hạn bởi phạm vi dữ liệu như phía Cửa hàng trưởng.
     * </p>
     *
     * @param orderId Mã đơn hàng cần xem chi tiết.
     * @return Phản hồi HTTP 200 chứa danh sách các mặt hàng, trạng thái và tổng tiền của đơn.
     * @throws RuntimeException Nếu mã đơn hàng không tồn tại trong hệ thống.
     */
    @GetMapping("/{orderId}")
    public ResponseEntity<OrderDetailResponse> getOrderDetail(@PathVariable String orderId) {
        log.info("Manager/Admin đang xem chi tiết đơn hàng {}", orderId);

        // Cứ thế mà lấy, không bị vướng rào cản "hàng xóm" như bên Cửa hàng
        return ResponseEntity.ok(orderService.getOrderDetail(orderId));
    }

    // =======================================================
    // 4. MANAGER HỦY BẤT KỲ ĐƠN NÀO (NẾU CÒN MỚI)
    // =======================================================

    /**
     * API Hủy bỏ một đơn hàng.
     * <p>
     * Cho phép Quản lý can thiệp đình chỉ một đơn hàng. Thông thường, nghiệp vụ này
     * chỉ được phép thực hiện khi đơn hàng còn ở trạng thái "Mới" (NEW), chưa được
     * Bếp trung tâm bắt tay vào chế biến.
     * </p>
     *
     * @param orderId Mã đơn hàng cần hủy.
     * @return Phản hồi HTTP 200 kèm thông báo quá trình hủy đơn thành công.
     * @throws RuntimeException Nếu đơn hàng đã chuyển sang trạng thái đang nấu hoặc đã giao, không thể hủy.
     */
    @PutMapping("/{orderId}/cancel")
    public ResponseEntity<String> cancelOrder(@PathVariable String orderId) {
        log.info("Manager/Admin đang thực hiện hủy đơn hàng {}", orderId);

        orderService.cancelOrder(orderId);
        return ResponseEntity.ok("Đã hủy đơn hàng " + orderId + " thành công!");
    }
    // =======================================================
    // 5. BÓC TÁCH ĐỊNH MỨC NGUYÊN VẬT LIỆU (BOM)
    // =======================================================

    /**
     * API Bóc tách và tính toán định mức nguyên vật liệu của một đơn hàng.
     * <p>
     * Cho phép Quản lý Bếp hoặc Cửa hàng xem trước tổng khối lượng nguyên liệu thô
     * (thịt, rau củ, gia vị...) cần thiết để chế biến toàn bộ các thành phẩm trong đơn hàng.
     * Hệ thống sẽ tự động quét qua Công thức (BOM) của từng món và cộng dồn định lượng.
     * </p>
     * <p>
     * <b>Ghi chú Phân quyền:</b> API này được ghi đè quyền truy cập, mở rộng thêm cho
     * {@code KITCHEN_MANAGER} để phục vụ nghiệp vụ tại xưởng.
     * </p>
     *
     * @param orderId Mã đơn hàng cần bóc tách nguyên vật liệu.
     * @return Phản hồi HTTP 200 kèm danh sách chi tiết các nguyên vật liệu và tổng khối lượng cần thiết.
     * @throws RuntimeException Nếu cấu trúc công thức (BOM) của sản phẩm bị thiếu hoặc lỗi tham chiếu.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'KITCHEN_MANAGER')")
    @GetMapping("/{orderId}/materials")
    public ResponseEntity<List<OrderMaterialBreakdownResponse>> getOrderMaterialBreakdown(
            @PathVariable String orderId) {

        List<OrderMaterialBreakdownResponse> breakdown =
                orderService.getOrderMaterialBreakdown(orderId);

        return ResponseEntity.ok(breakdown);
    }
}