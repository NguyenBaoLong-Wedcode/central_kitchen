package com.groupSWP.centralkitchenplatform.controllers.auth;

import com.groupSWP.centralkitchenplatform.dto.auth.ChangePasswordRequest;
import com.groupSWP.centralkitchenplatform.service.PasswordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

/**
 * Controller xử lý các thiết lập tài khoản cá nhân của người dùng.
 * <p>
 * Lớp này cung cấp các API liên quan đến cấu hình bảo mật tài khoản,
 * điển hình là chức năng Đổi mật khẩu chủ động khi người dùng đang đăng nhập.
 * Trong môi trường vận hành của hệ thống Central Kitchen, việc bảo vệ tài khoản của
 * nhân sự kho, đầu bếp và quản lý là tối quan trọng để ngăn chặn các truy cập trái phép
 * vào luồng dữ liệu tài chính và hàng hóa nhạy cảm.
 * </p>
 * <p>
 * <b>Kiến trúc Bảo mật:</b> Cơ chế hoạt động dựa trên sự kết hợp chặt chẽ giữa Spring Security
 * và JWT (JSON Web Token). Bằng cách trích xuất trực tiếp danh tính từ đối tượng Principal,
 * hệ thống loại bỏ hoàn toàn các rủi ro liên quan đến lỗ hổng IDOR (Insecure Direct Object Reference)
 * – nơi kẻ tấn công có thể cố gắng chèn mã ID của người khác để thực hiện thay đổi mật khẩu trái phép.
 * </p>
 * <p>
 * Mọi điểm cuối (endpoints) trong Controller này đều yêu cầu yêu cầu phải đi kèm JWT Token
 * hợp lệ trong Header của Request để xác thực quyền hạn.
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0
 * @since 2026-03-29
 */
@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor // 🌟 TỐI ƯU: Dùng Lombok để tự động tiêm PasswordService cho code sạch sẽ
public class PasswordController {

    /**
     * Service chuyên trách xử lý các logic nghiệp vụ liên quan đến mã hóa và kiểm tra mật khẩu.
     */
    private final PasswordService passwordService;

    /**
     * API Đổi mật khẩu chủ động.
     * <p>
     * Cho phép người dùng tự thay đổi mật khẩu của mình một cách an toàn. API sử dụng {@link Principal}
     * ("Thẻ căn cước" kỹ thuật số của hệ thống) để định danh chính xác người dùng hiện tại từ Security Context.
     * </p>
     * <p>
     * <b>Kiểm soát lỗi tập trung:</b> Thay vì sử dụng các khối lệnh xử lý lỗi rườm rà tại Controller,
     * toàn bộ các vi phạm logic (như mật khẩu cũ không chính xác, mật khẩu mới không đạt chuẩn bảo mật)
     * sẽ được xử lý tại tầng Service. Các ngoại lệ này sẽ được đẩy ngược ra cho {@code GlobalExceptionHandler}
     * đánh chặn tự động, giúp phản hồi JSON trả về cho Frontend luôn đồng nhất và chuyên nghiệp.
     * </p>
     *
     * @param principal Đối tượng bảo mật chứa danh tính (username) của người dùng trích xuất từ Token.
     * @param request   Payload {@link ChangePasswordRequest} chứa mật khẩu hiện tại và mật khẩu mới thiết lập.
     * @return Phản hồi HTTP 200 kèm thông báo đổi mật khẩu thành công và yêu cầu người dùng đăng nhập lại.
     */
    @PutMapping("/change-password")
    public ResponseEntity<String> changePassword(
            Principal principal,
            @RequestBody ChangePasswordRequest request) {

        // Lấy username từ Token của người đang đăng nhập
        String username = principal.getName();

        // 🌟 TỐI ƯU: Bỏ try-catch!
        // Cứ gọi thẳng Service, nếu sai pass cũ, Service sẽ throw Exception
        // và GlobalExceptionHandler sẽ tự động tóm lấy nó để chuyển thành JSON lỗi cực mượt!
        passwordService.changePassword(username, request);

        return ResponseEntity.ok("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
    }
}