package com.groupSWP.centralkitchenplatform.controllers.auth;

import com.groupSWP.centralkitchenplatform.dto.auth.*;
import com.groupSWP.centralkitchenplatform.entities.auth.SystemUser;
import com.groupSWP.centralkitchenplatform.service.auth.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

/**
 * Controller chịu trách nhiệm xử lý toàn bộ các nghiệp vụ Định danh và Xác thực (Authentication).
 * <p>
 * Lớp này cung cấp các API công khai (như Login, Quên mật khẩu) và các API yêu cầu
 * đã đăng nhập (như Đăng xuất, Cập nhật hồ sơ cá nhân). Hệ thống sử dụng JWT (JSON Web Token)
 * để cấp quyền và duy trì phiên đăng nhập không trạng thái (Stateless).
 * </p>
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * API Đăng nhập hệ thống.
     * <p>Xác thực thông tin tài khoản và trả về JWT Token nếu hợp lệ.</p>
     *
     * @param request Chứa Username và Password do người dùng gửi lên.
     * @return Phản hồi HTTP 200 chứa {@link AuthResponse} bao gồm chuỗi Token và thông tin User.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * API Đăng xuất.
     * <p>Xóa bỏ/vô hiệu hóa phiên đăng nhập hiện tại của người dùng.</p>
     *
     * @param principal Đối tượng bảo mật chứa danh tính của người dùng đang gọi API (được trích xuất từ Token).
     * @return Thông báo đăng xuất thành công.
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(Principal principal) {
        // Principal chứa username của người đang gọi API này (đã qua Filter kiểm duyệt)
        if (principal != null) {
            authService.logout(principal.getName());
        }
        return ResponseEntity.ok(Map.of("message", "Đăng xuất thành công"));
    }

    /**
     * API Cập nhật thông tin hồ sơ cá nhân.
     * <p>
     * API này sử dụng {@link Principal} để bảo mật, đảm bảo người dùng chỉ có thể
     * tự sửa thông tin của chính mình, không thể can thiệp vào tài khoản khác.
     * </p>
     *
     * @param request   Chứa các thông tin cá nhân cần cập nhật (Họ tên, SĐT, Địa chỉ...).
     * @param principal Đối tượng danh tính do Spring Security tự động inject từ Token.
     * @return Phản hồi chứa đối tượng {@link UserResponse} với dữ liệu đã được cập nhật mới nhất.
     */
    @PutMapping("/update-profile")
    public ResponseEntity<UserResponse> updateProfile(
            @RequestBody UpdateProfileRequest request,
            Principal principal
    ) {
        SystemUser updatedUser = authService.updateProfile(principal.getName(), request);

        UserResponse response = UserResponse.builder()
                .userId(updatedUser.getUserId())
                .fullName(updatedUser.getFullName())
                .role(updatedUser.getAccount().getRole().name()) // Trích xuất chính xác Role từ Entity
                .username(principal.getName())
                .build();
        return ResponseEntity.ok(response);
    }

    /**
     * API Xác thực mã OTP.
     * <p>
     * Phục vụ bước 2 trong quá trình đăng nhập (Bảo mật 2 lớp - 2FA) hoặc để
     * kích hoạt tài khoản lần đầu.
     * </p>
     *
     * @param request Chứa Username và Mã OTP gồm các chữ số.
     * @return Phản hồi chứa {@link AuthResponse} nếu OTP hợp lệ.
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@RequestBody OtpRequest request) {
        return ResponseEntity.ok(authService.verifyOtp(request.getUsername(), request.getOtp()));
    }

    /**
     * API Yêu cầu cấp lại mật khẩu (Quên mật khẩu) - Bước 1.
     * <p>Kiểm tra email có tồn tại trong hệ thống hay không, nếu có sẽ gửi một mã OTP khôi phục qua Email.</p>
     *
     * @param request Chứa Email của tài khoản cần khôi phục.
     * @return Thông báo hệ thống đã gửi mã OTP thành công.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.email());
        return ResponseEntity.ok("Mã OTP đã được gửi đến email của bạn.");
    }

    /**
     * API Đặt lại mật khẩu mới - Bước 2.
     * <p>Kiểm tra tính hợp lệ của mã OTP và tiến hành lưu mật khẩu mới đã được băm (hash) xuống Database.</p>
     *
     * @param request Chứa Email, mã OTP vừa nhận được và Mật khẩu mới thiết lập.
     * @return Thông báo đổi mật khẩu thành công.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody ResetPasswordRequest request) {
        System.out.println("Mật khẩu mới nhận được: " + request.newPassword());
        authService.resetPassword(request.email(), request.otp(), request.newPassword());
        return ResponseEntity.ok("Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.");
    }
}