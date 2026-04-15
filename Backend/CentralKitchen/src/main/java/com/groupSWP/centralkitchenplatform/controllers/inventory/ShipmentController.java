package com.groupSWP.centralkitchenplatform.controllers.inventory;

import com.groupSWP.centralkitchenplatform.dto.logistics.ReportShipmentRequest;
import com.groupSWP.centralkitchenplatform.entities.auth.Account;
import com.groupSWP.centralkitchenplatform.repositories.auth.AccountRepository;
import com.groupSWP.centralkitchenplatform.service.inventory.ShipmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

/**
 * Controller quản lý luồng vận hành giao nhận hàng hóa (Logistics & Shipment).
 * <p>
 * Lớp này chịu trách nhiệm điều phối và theo dõi toàn bộ vòng đời của một chuyến xe.
 * Bao gồm việc gán tài xế, xác nhận giao hàng, chốt số lượng thực nhận tại cửa hàng,
 * và xử lý các sự cố phát sinh cần giao bù.
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0.0
 * @since 2026-03-27
 */
@RestController
@RequestMapping("/api/shipments")
@RequiredArgsConstructor
public class ShipmentController {

    private final ShipmentService shipmentService;
    private final AccountRepository accountRepository; // Bơm thêm repo để kiểm tra Role và Store

    /**
     * Trích xuất mã cửa hàng (Store ID) từ thông tin xác thực của người dùng.
     *
     * @param principal Đối tượng chứa thông tin xác thực của người dùng hiện tại (Token).
     * @return Mã cửa hàng dạng chuỗi, hoặc chuỗi rỗng nếu tài khoản không gắn với cửa hàng nào.
     * @throws RuntimeException Nếu không tìm thấy tài khoản tương ứng với username trong Token.
     */
    // Hàm Helper lấy ID cửa hàng từ Token
    private String getStoreIdFromPrincipal(Principal principal) {
        if (principal == null) return null;
        Account account = accountRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại!"));
        return account.getStore() != null ? account.getStore().getStoreId() : "";
    }

    /**
     * API Gán tài xế cho chuyến xe.
     *
     * @param shipmentId Mã chuyến xe cần điều phối.
     * @param payload Map chứa thông tin accountId của tài xế.
     * @return Phản hồi HTTP kèm thông báo gán tài xế thành công hoặc lỗi.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'COORDINATOR')")
    @PostMapping("/{shipmentId}/assign")
    public ResponseEntity<?> assignDriver(@PathVariable String shipmentId, @RequestBody Map<String, String> payload) {
        String accountId = payload.get("accountId");

        if (accountId == null || accountId.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng truyền accountId của tài xế!"));
        }

        try {
            shipmentService.assignDriverToShipment(shipmentId, accountId);
            return ResponseEntity.ok(Map.of("message", "Gán tài xế thành công! Bắt đầu tính giờ giao hàng."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * API Xác nhận tài xế đã đến cửa hàng.
     *
     * @param principal Thông tin tài khoản người đang thực hiện xác nhận.
     * @param shipmentId Mã chuyến xe vừa đến đích.
     * @return Phản hồi HTTP kèm thông báo xác nhận thành công.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'COORDINATOR')") // Thêm Role tài xế vào đây nếu bạn có Role riêng cho họ nhé
    @PostMapping("/{shipmentId}/delivered")
    public ResponseEntity<?> markAsDelivered(Principal principal, @PathVariable String shipmentId) { // 🔥 Thêm Principal
        try {
            // Truyền username xuống để kiểm tra chính chủ
            shipmentService.markShipmentAsDelivered(shipmentId, principal.getName());
            return ResponseEntity.ok(Map.of("message", "Đã xác nhận xe tới nơi! Chờ Cửa hàng trưởng kiểm tra."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }


    /**
     * API Cửa hàng xem danh sách các chuyến xe ĐÃ ĐẾN NƠI và đang chờ mình xác nhận.
     * <p>API này tự động lấy storeId từ Token, cửa hàng nào chỉ thấy xe của cửa hàng đó.</p>
     *
     * @param principal Thông tin tài khoản Cửa hàng trưởng đang đăng nhập.
     * @return Phản hồi HTTP chứa danh sách các chuyến xe chờ xác nhận.
     */
    @PreAuthorize("hasRole('STORE_MANAGER')")
    @GetMapping("/pending-report")
    public ResponseEntity<?> getShipmentsPendingReport(Principal principal) {
        try {
            // Lấy ID cửa hàng của người đang gọi API
            String storeId = getStoreIdFromPrincipal(principal);

            // Trả về danh sách
            return ResponseEntity.ok(shipmentService.getPendingReportShipmentsForStore(storeId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * API Cửa hàng trưởng chốt số lượng hàng thực nhận.
     *
     * @param principal Thông tin tài khoản người đang chốt biên bản.
     * @param shipmentId Mã chuyến xe cần báo cáo.
     * @param request Chi tiết báo cáo hàng lỗi/hư hỏng (không bắt buộc).
     * @return Phản hồi HTTP kèm kết quả gửi báo cáo.
     */
    @PreAuthorize("hasAnyRole('STORE_MANAGER', 'ADMIN')")
    @PostMapping("/{shipmentId}/report")
    public ResponseEntity<?> reportReceivedShipment(
            Principal principal, // 🔥 Thêm Principal
            @PathVariable String shipmentId,
            @RequestBody(required = false) ReportShipmentRequest request) {

        try {
            boolean isAdmin = false;
            if (principal != null) {
                Account account = accountRepository.findByUsername(principal.getName()).orElse(null);
                if (account != null && account.getRole() == Account.Role.ADMIN) {
                    isAdmin = true;
                }
            }

            // Gán chữ ADMIN hoặc lấy ID Cửa hàng thực tế
            String requestingStoreId = isAdmin ? "ADMIN" : getStoreIdFromPrincipal(principal);

            // Gọi service truyền đủ 3 tham số
            String result = shipmentService.reportIssue(shipmentId, requestingStoreId, request);
            return ResponseEntity.ok(Map.of("message", result));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * API Bếp trung tâm xác nhận sự cố và lên đơn giao bù.
     *
     * @param shipmentId Mã chuyến xe có phát sinh sự cố.
     * @return Phản hồi HTTP kèm thông báo tạo chuyến xe đền bù.
     */
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @PostMapping("/{shipmentId}/resolve-replacement")
    public ResponseEntity<?> resolveAndCreateReplacement(@PathVariable String shipmentId) {
        try {
            String result = shipmentService.createReplacementShipment(shipmentId);
            return ResponseEntity.ok(Map.of("message", result));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * API Lấy danh sách các chuyến xe bị Cửa hàng báo cáo thiếu hàng.
     * <p>Giúp Bếp trung tâm và Điều phối viên nắm được danh sách cần đền bù.</p>
     *
     * @return Phản hồi HTTP chứa danh sách các chuyến xe bị report.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'KITCHEN_MANAGER', 'COORDINATOR')")
    @GetMapping("/reported")
    public ResponseEntity<?> getReportedShipments() {
        try {
            return ResponseEntity.ok(shipmentService.getReportedShipments());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}