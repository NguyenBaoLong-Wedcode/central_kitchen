package com.groupSWP.centralkitchenplatform.controllers.order;

import com.groupSWP.centralkitchenplatform.dto.cart.AddToCartRequest;
import com.groupSWP.centralkitchenplatform.dto.cart.CartResponse;
import com.groupSWP.centralkitchenplatform.dto.cart.CheckoutRequest;
import com.groupSWP.centralkitchenplatform.dto.order.OrderResponse;
import com.groupSWP.centralkitchenplatform.service.order.CartService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

/**
 * Controller quản lý luồng Giỏ hàng (Cart Management) của Cửa hàng trưởng.
 * <p>
 * Đóng vai trò như một trạm trung chuyển (Drafting Station), cho phép các Cửa hàng trưởng
 * thoải mái thêm, bớt, sửa số lượng các mặt hàng trước khi quyết định chốt thành
 * một Đơn đặt hàng (Order) chính thức gửi về Bếp trung tâm.
 * </p>
 * <p>
 * <b>Tính bảo mật:</b> Không nhận định danh người dùng từ Payload gửi lên. Mọi thao tác
 * đều được trích xuất danh tính trực tiếp từ {@link Principal} (thông qua JWT Token)
 * để đảm bảo tính định danh tuyệt đối.
 * </p>
 * <p>
 * <b>Kiến trúc và Luồng Dữ liệu:</b> Việc sử dụng giỏ hàng đóng vai trò như một bộ đệm (buffer)
 * cực kỳ quan trọng giúp giảm tải cho hệ thống xử lý Đơn hàng cốt lõi. Thay vì tạo trực tiếp
 * các bản ghi Order rác mỗi khi Cửa hàng trưởng thay đổi ý định, hệ thống chỉ lưu lại trạng thái
 * tạm thời trong Cart. Chỉ khi API Checkout được gọi, một Transaction duy nhất mới được mở ra
 * để thực hiện hàng loạt các nghiệp vụ: trừ tồn kho dự kiến, ghi nhận lịch sử đặt hàng, và
 * kích hoạt các thông báo (Notification) liên quan đến Bếp trung tâm. Quá trình này giúp
 * tối ưu hóa hiệu suất của cơ sở dữ liệu và đảm bảo tính toàn vẹn (ACID) của toàn bộ hệ thống
 * Central Kitchen trong các khung giờ cao điểm khi hàng chục cửa hàng cùng lên đơn một lúc.
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0
 * @since 2026-03-29
 */
@Slf4j
@RestController
@RequestMapping("/api/store/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    // =======================================================
    // 1. THÊM SẢN PHẨM VÀO GIỎ NHÁP
    // =======================================================
    /**
     * API Thêm sản phẩm vào giỏ hàng.
     * <p>
     * Cộng dồn số lượng sản phẩm vào giỏ hàng cá nhân của người dùng.
     * Nếu sản phẩm đã tồn tại trong giỏ, hệ thống sẽ tăng số lượng tương ứng.
     * </p>
     *
     * @param principal Đối tượng bảo mật chứa định danh (Username) của người đang đăng nhập.
     * @param request   Payload chứa mã sản phẩm (ProductId) và số lượng cần thêm.
     * @return Phản hồi HTTP 200 kèm thông báo thành công hoặc HTTP 400 nếu dữ liệu không hợp lệ.
     */
    @PostMapping("/add")
    public ResponseEntity<?> addToCart(
            Principal principal,
            @RequestBody AddToCartRequest request) {
        try {
            String username = principal.getName();
            log.info("User {} đang thêm {} món {} vào giỏ hàng", username, request.getQuantity(), request.getProductId());

            cartService.addToCart(username, request);

            return ResponseEntity.ok("Đã thêm sản phẩm vào giỏ hàng thành công!");
        } catch (RuntimeException e) {
            log.error("Lỗi khi thêm vào giỏ hàng của User {}: {}", principal.getName(), e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // =======================================================
    // 2. CHỐT ĐƠN (CHECKOUT)
    // =======================================================
    /**
     * API Chốt đơn hàng từ Giỏ nháp.
     * <p>
     * Thực hiện giao dịch (Transaction): Chuyển hóa toàn bộ dữ liệu từ giỏ hàng nháp
     * thành Đơn đặt hàng (Order) chính thức, sau đó giải phóng (clear) giỏ hàng hiện tại.
     * </p>
     *
     * @param principal Đối tượng bảo mật chứa định danh (Username).
     * @param request   Payload chứa các yêu cầu bổ sung khi đặt hàng (Ví dụ: Đơn khẩn cấp, ghi chú...).
     * @return Phản hồi HTTP 200 chứa dữ liệu Đơn hàng ({@link OrderResponse}) vừa khởi tạo thành công.
     */
    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(
            Principal principal,
            @RequestBody CheckoutRequest request) {
        try {
            String username = principal.getName();
            log.info("User {} yêu cầu chốt đơn loại {}", username, request.getOrderType());

            OrderResponse createdOrder = cartService.checkoutCart(username, request);

            return ResponseEntity.ok(createdOrder);
        } catch (RuntimeException e) {
            log.error("Lỗi khi chốt đơn của User {}: {}", principal.getName(), e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // =======================================================
    // 3. XEM TRẠNG THÁI GIỎ HÀNG
    // =======================================================
    /**
     * API Lấy chi tiết Giỏ hàng hiện hành.
     * <p>
     * Truy xuất toàn bộ danh sách các mặt hàng đang chờ chốt đơn của người dùng,
     * phục vụ cho màn hình hiển thị trước khi thanh toán (Pre-checkout).
     * </p>
     *
     * @param principal Đối tượng bảo mật chứa định danh (Username).
     * @return Phản hồi HTTP 200 chứa cấu trúc {@link CartResponse} gồm các Item và tổng số lượng.
     */
    @GetMapping
    public ResponseEntity<?> getCart(Principal principal) {
        try {
            String username = principal.getName();
            log.info("User {} đang xem giỏ hàng", username);

            CartResponse response = cartService.getCart(username);

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Lỗi khi xem giỏ hàng của User {}: {}", principal.getName(), e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // =======================================================
    // 4. CẬP NHẬT SỐ LƯỢNG TRONG GIỎ
    // =======================================================
    /**
     * API Ghi đè số lượng sản phẩm trong giỏ.
     * <p>
     * Thay thế số lượng hiện tại của một món hàng bằng số lượng mới do người dùng nhập
     * (thường dùng khi bấm nút [+] hoặc [-] trên giao diện giỏ hàng).
     * </p>
     *
     * @param principal Đối tượng bảo mật chứa định danh (Username).
     * @param request   Payload chứa mã sản phẩm và con số lượng đích cần cập nhật.
     * @return Phản hồi HTTP 200 xác nhận cập nhật thành công.
     */
    @PutMapping("/update")
    public ResponseEntity<?> updateCartItem(
            Principal principal,
            @RequestBody AddToCartRequest request) {
        try {
            String username = principal.getName();
            log.info("User {} sửa số lượng món {} thành {}", username, request.getProductId(), request.getQuantity());

            cartService.updateCartItem(username, request.getProductId(), request.getQuantity());

            return ResponseEntity.ok("Đã cập nhật số lượng thành công!");
        } catch (RuntimeException e) {
            log.error("Lỗi khi cập nhật giỏ hàng của User {}: {}", principal.getName(), e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // =======================================================
    // 5. XÓA SẢN PHẨM KHỎI GIỎ
    // =======================================================
    /**
     * API Xóa hoàn toàn một mặt hàng khỏi giỏ nháp.
     *
     * @param principal Danh tính người dùng.
     * @param productId Mã sản phẩm cần loại bỏ.
     * @return Phản hồi HTTP 200 xác nhận xóa thành công.
     */
    @DeleteMapping("/remove/{productId}")
    public ResponseEntity<?> removeCartItem(
            Principal principal,
            @PathVariable String productId) {
        try {
            String username = principal.getName();
            log.info("User {} xóa món {} khỏi giỏ hàng", username, productId);

            cartService.removeCartItem(username, productId);

            return ResponseEntity.ok("Đã xóa sản phẩm khỏi giỏ hàng!");
        } catch (RuntimeException e) {
            log.error("Lỗi khi xóa món của User {}: {}", principal.getName(), e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}