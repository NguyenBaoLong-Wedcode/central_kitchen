package com.groupSWP.centralkitchenplatform.controllers.store;

import com.groupSWP.centralkitchenplatform.dto.order.OrderDetailResponse;
import com.groupSWP.centralkitchenplatform.dto.order.OrderHistoryResponse;
import com.groupSWP.centralkitchenplatform.entities.auth.Account;
import com.groupSWP.centralkitchenplatform.repositories.auth.AccountRepository;
import com.groupSWP.centralkitchenplatform.service.order.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.groupSWP.centralkitchenplatform.dto.order.OrderRequest;
import com.groupSWP.centralkitchenplatform.dto.order.OrderResponse;

import java.security.Principal;
import java.util.List;

/**
 * Controller chuyên trách xử lý các nghiệp vụ liên quan đến Đơn hàng (Order) tại khu vực Cửa hàng (Store).
 * <p>
 * Lớp này là điểm chạm (endpoint) quan trọng để các Quản lý Cửa hàng (Store Manager) tương tác với
 * hệ thống Bếp Trung Tâm (Central Kitchen). Nó cung cấp đầy đủ các tính năng từ việc tra cứu lịch sử,
 * xem chi tiết đơn hàng, cho đến việc khởi tạo các yêu cầu nhập hàng mới (đơn tiêu chuẩn hoặc khẩn cấp).
 * </p>
 * <p>
 * <b>Điểm nhấn về Bảo mật:</b> Controller này áp dụng triệt để cơ chế chống lỗ hổng IDOR
 * (Insecure Direct Object Reference). Thay vì tin tưởng tham số Store ID do Frontend truyền lên,
 * toàn bộ các API đều tự động trích xuất Store ID trực tiếp từ Token định danh (Principal) của
 * người dùng đang đăng nhập. Điều này đảm bảo tuyệt đối rằng một cửa hàng chỉ có quyền xem
 * và thao tác trên chính dữ liệu của mình.
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0
 * @since 2026-03-29
 */
@Slf4j
@RestController
@RequestMapping("/api/store/orders")
@RequiredArgsConstructor
public class StoreOrderController {

    private final OrderService orderService;
    private final AccountRepository accountRepository;

    /**
     * Hàm Helper: Lấy Store ID từ Token đăng nhập.
     * <p>Đảm bảo an toàn bảo mật IDOR bằng cách luôn lấy ID cửa hàng từ danh tính thật của người dùng.</p>
     *
     * @param principal Đối tượng bảo mật của Spring Security chứa thông tin User đang gọi API.
     * @return Chuỗi Store ID tương ứng với tài khoản.
     * @throws RuntimeException Nếu tài khoản không tồn tại hoặc chưa được gán vào cửa hàng nào.
     */
    private String getStoreIdFromPrincipal(Principal principal) {
        String username = principal.getName();
        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại!"));

        if (account.getStore() == null) {
            throw new RuntimeException("Tài khoản chưa được liên kết với Cửa hàng nào!");
        }
        return account.getStore().getStoreId();
    }

    /**
     * API Lấy danh sách lịch sử đơn hàng của Cửa hàng.
     * <p>Hệ thống tự động nhận diện cửa hàng thông qua Token đăng nhập.</p>
     *
     * @param principal Đối tượng bảo mật chứa danh tính người gọi.
     * @return Phản hồi HTTP 200 chứa danh sách lịch sử đơn hàng.
     */
    @GetMapping
    public ResponseEntity<?> getOrderHistory(Principal principal) {
        try {
            String storeId = getStoreIdFromPrincipal(principal);
            log.info("Cửa hàng {} đang xem lịch sử đơn hàng", storeId);

            List<OrderHistoryResponse> history = orderService.getOrderHistory(storeId);
            return ResponseEntity.ok(history);
        } catch (RuntimeException e) {
            log.error("Lỗi khi xem lịch sử đơn hàng: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * API Xem chi tiết một đơn hàng cụ thể.
     * <p>
     * Tích hợp cơ chế chống xem trộm (IDOR Protection), chặn đứng mọi hành vi
     * truy cập vào đơn hàng thuộc về Cửa hàng khác.
     * </p>
     *
     * @param principal Đối tượng bảo mật chứa danh tính người gọi.
     * @param orderId   Mã định danh của đơn hàng.
     * @return Phản hồi HTTP 200 chứa chi tiết đơn hàng hoặc 403 nếu cố tình vi phạm.
     */
    @GetMapping("/{orderId}")
    public ResponseEntity<?> getOrderDetail(Principal principal, @PathVariable String orderId) {
        try {
            String storeId = getStoreIdFromPrincipal(principal);
            log.info("Cửa hàng {} đang xem chi tiết đơn {}", storeId, orderId);

            OrderDetailResponse detail = orderService.getOrderDetail(orderId);

            if (!detail.getStoreId().equals(storeId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Lỗi bảo mật: Bạn không có quyền xem đơn hàng của cửa hàng khác!");
            }

            return ResponseEntity.ok(detail);
        } catch (RuntimeException e) {
            log.error("Lỗi khi xem chi tiết đơn {}: {}", orderId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * API Khởi tạo Đơn hàng Tiêu chuẩn (Standard Order).
     *
     * @param principal Đối tượng bảo mật chứa danh tính người gọi.
     * @param request   Payload chứa danh sách các mặt hàng cần đặt.
     * @return Phản hồi HTTP 200 chứa đối tượng Đơn hàng vừa tạo thành công.
     */
    @PostMapping("/standard")
    public ResponseEntity<?> createStandardOrder(Principal principal, @RequestBody OrderRequest request) {
        try {
            String realStoreId = getStoreIdFromPrincipal(principal);
            request.setStoreId(realStoreId);

            log.info("Cửa hàng {} bóp cò đơn STANDARD", realStoreId); // Giữ nguyên log theo ý thích nhóm Dev

            OrderResponse response = orderService.createOrder(request, false);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("🔥 Lỗi tạo đơn Standard: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    /**
     * API Khởi tạo Đơn hàng Khẩn cấp (Urgent Order).
     *
     * @param principal Đối tượng bảo mật chứa danh tính người gọi.
     * @param request   Payload chứa danh sách các mặt hàng cần đặt gấp.
     * @return Phản hồi HTTP 200 chứa đối tượng Đơn hàng khẩn cấp vừa tạo.
     */
    @PostMapping("/urgent")
    public ResponseEntity<?> createUrgentOrder(Principal principal, @RequestBody OrderRequest request) {
        try {
            String realStoreId = getStoreIdFromPrincipal(principal);
            request.setStoreId(realStoreId);

            log.info("Cửa hàng {} bóp cò đơn URGENT", realStoreId);

            OrderResponse response = orderService.createOrder(request, true);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("🔥 Lỗi tạo đơn Urgent: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}