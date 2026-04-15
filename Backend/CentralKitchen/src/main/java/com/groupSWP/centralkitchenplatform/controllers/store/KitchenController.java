package com.groupSWP.centralkitchenplatform.controllers.store;

import com.groupSWP.centralkitchenplatform.dto.kitchen.PendingOrderResponse;
import com.groupSWP.centralkitchenplatform.dto.kitchen.ProductionResponse;
import com.groupSWP.centralkitchenplatform.entities.kitchen.ProductionRun.ProductionStatus;
import com.groupSWP.centralkitchenplatform.entities.logistic.Order;
import com.groupSWP.centralkitchenplatform.repositories.order.OrderRepository;
import com.groupSWP.centralkitchenplatform.service.inventory.ProductionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Controller quản lý các nghiệp vụ liên quan đến Bếp trung tâm.
 * <p>
 * Lớp này cung cấp các API chuyên dụng cho nhân viên Quản lý bếp
 * để thực hiện các giao dịch xem đơn hàng, gom đơn, quản lý các mẻ nấu
 * và thay đổi trạng thái sản xuất.
 * ĐÃ ĐƯỢC CẬP NHẬT THEO LUỒNG SẢN XUẤT MỚI: THEO ĐƠN HÀNG (Order-Based)
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 2.0.0
 * @since 2026-03-26
 */
@RestController
@RequestMapping("/api/kitchen")
@RequiredArgsConstructor
public class KitchenController {

    private final ProductionService productionService;
    private final OrderRepository orderRepository;

    /**
     * API Xem danh sách đơn hàng dành cho Bếp trung tâm (LUỒNG MỚI: DANH SÁCH CHỜ GOM).
     * <p>
     * Thay thế cho luồng gom sản phẩm cũ. API này trả về danh sách các đơn hàng
     * đang chờ Bếp xử lý. Hệ thống đã tự động sắp xếp ưu tiên các đơn hàng
     * Khẩn Cấp (URGENT / KCAP) lên đầu danh sách để Bếp trưởng dễ dàng ra quyết định.
     * ĐÃ SỬA LỖI VÒNG LẶP JSON BẰNG CÁCH MAP QUA DTO.
     * </p>
     *
     * @return Phản hồi HTTP 200 chứa danh sách đơn hàng đã được sắp xếp ưu tiên.
     */
    @GetMapping("/orders")
    @PreAuthorize("hasAnyAuthority('KITCHEN_MANAGER', 'ROLE_KITCHEN_MANAGER', 'MANAGER', 'ROLE_MANAGER', 'ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<List<PendingOrderResponse>> getKitchenOrders() {
        // 1. Lấy dữ liệu nguyên bản từ Database
        List<Order> orders = orderRepository.findOrdersToAggregate();

        // 2. Chặt đứt vòng lặp vô hạn: Bóc tách Entity sang DTO
        List<PendingOrderResponse> responseList = orders.stream().map(o ->
                PendingOrderResponse.builder()
                        .orderId(o.getOrderId())
                        // LƯU Ý: Nếu Entity Store của Sếp dùng getStoreName(), hãy sửa lại chỗ này nhé!
                        .storeName(o.getStore() != null ? o.getStore().getName() : "Unknown")
                        .orderType(o.getOrderType() != null ? o.getOrderType().name() : "STANDARD")
                        .status(o.getStatus().name())
                        .createdAt(o.getCreatedAt())
                        .items(o.getOrderItems().stream().map(i ->
                                PendingOrderResponse.Item.builder()
                                        .productId(i.getProduct().getProductId())
                                        .productName(i.getProduct().getProductName())
                                        .quantity(i.getQuantity())
                                        .build()
                        ).collect(Collectors.toList()))
                        .build()
        ).collect(Collectors.toList());

        // 3. Trả về cho FE dữ liệu sạch sẽ, không vòng lặp
        return ResponseEntity.ok(responseList);
    }

    /**
     * API Xóa công thức.
     *
     * @param id Mã định danh của công thức.
     * @return Phản hồi HTTP 200 thông báo đã xóa công thức.
     */
    @DeleteMapping("/formula/{id}")
    @PreAuthorize("hasAnyAuthority('ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<?> deleteFormula(@PathVariable Long id) {
        return ResponseEntity.ok("Đã xóa công thức");
    }

    /**
     * API Lấy danh sách tổng hợp số lượng cần nấu (Aggregation).
     * [ĐÃ NGỪNG SỬ DỤNG - DEPRECATED]
     * <p>
     * Do hệ thống đã chuyển sang mô hình Order-Based (nấu theo từng đơn riêng biệt),
     * API gom nhóm tổng số lượng món ăn này không còn được sử dụng để bảo vệ tính toàn vẹn
     * của quy trình xuất kho và giao nhận. FE vui lòng chuyển sang dùng API GET /orders.
     * </p>
     *
     * @return Thông báo API đã ngưng hoạt động.
     */
    @GetMapping("/aggregation")
    @PreAuthorize("hasAnyAuthority('KITCHEN_MANAGER', 'ROLE_KITCHEN_MANAGER', 'MANAGER', 'ROLE_MANAGER', 'ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<?> getPendingAggregation() {
        return ResponseEntity.status(410).body("API này đã ngưng hoạt động (Gone). Vui lòng sử dụng luồng Gom đơn theo Order-based tại GET /api/kitchen/orders");
    }

    /**
     * API Chốt sổ gom đơn (Confirm Aggregation - TẠO PHIẾU NẤU THEO ĐƠN).
     * <p>
     * Nhận danh sách các ID Đơn hàng (Order ID) từ Bếp trưởng và khởi tạo các
     * Phiếu Nấu (Production Ticket) tương ứng với trạng thái PLANNED.
     * Lúc này tồn kho vật lý vẫn an toàn, chưa bị trừ liệu.
     * </p>
     *
     * @param selectedKeys Danh sách mã ID của các đơn hàng được chọn.
     * @return Phản hồi HTTP 200 thông báo khởi tạo kế hoạch sản xuất thành công.
     */
    @PostMapping("/aggregation/confirm")
    @PreAuthorize("hasAnyAuthority('KITCHEN_MANAGER', 'ROLE_KITCHEN_MANAGER', 'MANAGER', 'ROLE_MANAGER', 'ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<String> confirmProduction(@RequestBody List<String> selectedKeys) {
        // Truyền list Order ID mà FE gửi xuống cho Service xử lý tạo Phiếu nấu
        productionService.createTicketsFromOrders(selectedKeys);
        return ResponseEntity.ok("Đã chốt sổ thành công! Hệ thống đã tạo danh sách các Phiếu Nấu (PLANNED) cho " + selectedKeys.size() + " đơn hàng.");
    }

    /**
     * API Xem danh sách các mẻ đang chờ nấu hoặc đang nấu (Active Productions).
     * <p>
     * Hiển thị danh sách các Phiếu Nấu kèm theo Tên Cửa Hàng và Phân loại Đơn (Thường/Khẩn cấp).
     * </p>
     *
     * @return Phản hồi HTTP 200 chứa danh sách các mẻ nấu hiện hành.
     */
    @GetMapping("/productions/active")
    @PreAuthorize("hasAnyAuthority('KITCHEN_MANAGER', 'ROLE_KITCHEN_MANAGER', 'MANAGER', 'ROLE_MANAGER', 'ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<List<ProductionResponse>> getActiveProductions() {
        return ResponseEntity.ok(productionService.getActiveProductionRuns());
    }

    /**
     * API Thay đổi trạng thái 1 mẻ nấu.
     * <p>
     * Dùng để hoàn tất phiếu nấu (COMPLETED), kích hoạt tự động đổi trạng thái Đơn hàng
     * thành READY_TO_SHIP và reo chuông báo cho Điều phối viên xếp xe.
     * </p>
     *
     * @param runId  Mã định danh của mẻ nấu (Phiếu Nấu).
     * @param status Trạng thái đích muốn chuyển sang.
     * @return Phản hồi HTTP 200 chứa thông tin mẻ nấu sau khi cập nhật.
     */
    @PutMapping("/productions/{runId}/status")
    @PreAuthorize("hasAnyAuthority('KITCHEN_MANAGER', 'ROLE_KITCHEN_MANAGER', 'MANAGER', 'ROLE_MANAGER', 'ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<ProductionResponse> changeProductionStatus(
            @PathVariable String runId,
            @RequestParam ProductionStatus status) {

        ProductionResponse response = productionService.changeProductionStatus(runId, status);
        return ResponseEntity.ok(response);
    }

    /**
     * 🌟 API MỚI BỔ SUNG: NẤU TỪNG MÓN CỤ THỂ TRONG PHIẾU (XUẤT KHO FIFO)
     * <p>
     * Nhận danh sách Product ID của những món mà Bếp trưởng vừa ĐÁNH DẤU HOÀN THÀNH (Tick chọn).
     * Hệ thống sẽ móc Công thức (BOM) của các món này ra và thực hiện Thuật toán FIFO Trừ Kho.
     * Các món chưa được tick sẽ vẫn nằm yên, kho vẫn an toàn.
     * </p>
     *
     * @param runId      Mã định danh của mẻ nấu.
     * @param productIds Danh sách mã món ăn đã nấu xong.
     * @return Phản hồi HTTP 200 thông báo kết quả xuất kho.
     */
    @PutMapping("/productions/{runId}/cook-items")
    @PreAuthorize("hasAnyAuthority('KITCHEN_MANAGER', 'ROLE_KITCHEN_MANAGER', 'MANAGER', 'ROLE_MANAGER', 'ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<String> cookSpecificItems(
            @PathVariable String runId,
            @RequestBody List<String> productIds) {

        productionService.cookSpecificItems(runId, productIds);
        return ResponseEntity.ok("Đã ghi nhận nấu xong " + productIds.size() + " món và cập nhật tồn kho tự động (FIFO) thành công!");
    }

    /**
     * API Cập nhật trạng thái mẻ nấu hàng loạt (Bulk Update).
     * <p>Cho phép chọn nhiều phiếu cùng lúc để đánh dấu hoàn tất.</p>
     *
     * @param runIds Danh sách các mã định danh mẻ nấu (JSON Array).
     * @param status Trạng thái đích muốn chuyển sang.
     * @return Phản hồi HTTP 200 chứa danh sách các mẻ nấu đã được cập nhật.
     */
    @PutMapping("/productions/status/bulk")
    @PreAuthorize("hasAnyAuthority('KITCHEN_MANAGER', 'ROLE_KITCHEN_MANAGER', 'MANAGER', 'ROLE_MANAGER', 'ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<List<ProductionResponse>> changeBulkProductionStatus(
            @RequestBody List<String> runIds,
            @RequestParam ProductionStatus status) {

        List<ProductionResponse> updatedRuns = new ArrayList<>();
        for (String runId : runIds) {
            ProductionResponse response = productionService.changeProductionStatus(runId, status);
            updatedRuns.add(response);
        }

        return ResponseEntity.ok(updatedRuns);
    }
}