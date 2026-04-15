package com.groupSWP.centralkitchenplatform.controllers.admin;

import com.groupSWP.centralkitchenplatform.dto.auth.AccountResponse;
import com.groupSWP.centralkitchenplatform.dto.auth.RegisterRequest;
import com.groupSWP.centralkitchenplatform.dto.auth.UpdateAccountRequest;
import com.groupSWP.centralkitchenplatform.service.auth.AccountService;
import com.groupSWP.centralkitchenplatform.service.auth.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controller xử lý các nghiệp vụ quản trị hệ thống dành riêng cho Admin.
 * <p>
 * Lớp này cung cấp các điểm cuối (endpoints) để Admin quản lý vòng đời của
 * tài khoản người dùng, bao gồm: cấp phát tài khoản mới, tra cứu và lọc danh sách nhân sự.
 * </p>
 * <p><b>Chính sách bảo mật:</b> Toàn bộ các API trong Controller này đều bị ràng buộc bởi quyền ADMIN.</p>
 * @author Đạt, Huy, Triển
 * @version 1.0
 * @since 2026-03-29
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    /**
     * Service xử lý các nghiệp vụ liên quan đến xác thực và phân quyền (Authentication/Authorization).
     */
    private final AuthService authService;

    /**
     * Service xử lý các nghiệp vụ liên quan đến quản lý tài khoản người dùng trong hệ thống CentralKitchen.
     */
    private final AccountService accountService;

    /**
     * API Cấp phát tài khoản nhân sự mới.
     *
     * @param request Đối tượng DTO chứa thông tin đăng ký tài khoản (username, password, role...).
     * @return ResponseEntity chứa thông báo xác nhận cấp tài khoản thành công cùng username tương ứng.
     */
    @PostMapping("/register")
    public ResponseEntity<String> createEmployee(@RequestBody RegisterRequest request) {
        String result = authService.register(request);
        return ResponseEntity.ok("Admin đã cấp tài khoản thành công! Username: " + request.username());
    }

    /**
     * API Tra cứu danh sách tài khoản linh hoạt (Tất cả hoặc theo từ khóa).
     *
     * @param keyword Từ khóa tìm kiếm (có thể là tên, username...), không bắt buộc. Nếu để trống sẽ trả về toàn bộ.
     * @return ResponseEntity chứa danh sách các tài khoản (AccountResponse) khớp với điều kiện tìm kiếm.
     */
    @GetMapping("/list-accounts")
    public ResponseEntity<List<AccountResponse>> getAccounts(
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(accountService.searchAccountsByFullName(keyword));
    }

    /**
     * API Lọc danh sách các tài khoản đang hoạt động (Active).
     *
     * @return ResponseEntity chứa danh sách các tài khoản có trạng thái đang hoạt động (status = true).
     */
    @GetMapping("/list-accounts/active")
    public ResponseEntity<List<AccountResponse>> getActiveAccounts() {
        return ResponseEntity.ok(accountService.getAccountsByStatus(true));
    }

    /**
     * API Lọc danh sách các tài khoản đã bị khóa/ngưng hoạt động (Inactive).
     *
     * @return ResponseEntity chứa danh sách các tài khoản có trạng thái ngưng hoạt động (status = false).
     */
    @GetMapping("/list-accounts/inactive")
    public ResponseEntity<List<AccountResponse>> getInactiveAccounts() {
        return ResponseEntity.ok(accountService.getAccountsByStatus(false));
    }

    /**
     * API Thay đổi chức vụ (Role) của tài khoản.
     * <p>Phục vụ nghiệp vụ thăng chức hoặc giáng chức nhân viên.</p>
     * <p>Đã áp dụng luật nghiệp vụ chặt chẽ: Thăng chức bắt buộc chọn Cửa hàng,
     * Giáng chức bắt buộc chọn Người thế chỗ.</p>
     *
     * @param accountId ID của tài khoản cần thay đổi (UUID).
     * @param roleName  Tên Role mới (VD: STORE_MANAGER, COORDINATOR...).
     * @param storeId ID của cửa hàng (tuỳ chọn, bắt buộc nếu là nghiệp vụ thăng chức).
     * @param replacementAccountId ID của tài khoản thay thế (tuỳ chọn, bắt buộc nếu là nghiệp vụ giáng chức).
     * @return Thông báo chi tiết sau khi cập nhật Role và luân chuyển cửa hàng.
     */
    @PatchMapping("/accounts/{accountId}/role")
    public ResponseEntity<String> changeAccountRole(
            @PathVariable String accountId,
            @RequestParam String roleName,
            @RequestParam(required = false) String storeId,
            @RequestParam(required = false) UUID replacementAccountId) {

        String message = accountService.changeAccountRole(accountId, roleName, storeId, replacementAccountId);
        return ResponseEntity.ok(message);
    }

    /**
     * API Khóa / Mở khóa tài khoản (Xóa mềm) kèm luân chuyển nhân sự.
     *
     * @param accountId ID của tài khoản cần thay đổi trạng thái hoạt động.
     * @param replacementAccountId ID của nhân sự thế chỗ (tuỳ chọn, dùng khi khóa tài khoản đang giữ vị trí tại cửa hàng).
     * @return ResponseEntity chứa thông báo kết quả thao tác khóa hoặc mở khóa thành công.
     */
    @PutMapping("/accounts/{accountId}/status")
    public ResponseEntity<String> toggleAccountStatus(
            @PathVariable UUID accountId,
            @RequestParam(required = false) UUID replacementAccountId) {
        return ResponseEntity.ok(accountService.toggleAccountStatus(accountId, replacementAccountId));
    }

    /**
     * API Lấy danh sách các Quản lý cửa hàng đang "Trống việc" (Dự bị).
     */
//    @GetMapping("/list-accounts/free-managers")
//    public ResponseEntity<List<AccountResponse>> getFreeManagers() {
//        return ResponseEntity.ok(accountService.getFreeStoreManagers());
//    }

    /**
     * API Gán hoặc thay đổi cửa hàng làm việc cho tài khoản.
     * <p>Sử dụng để gán cửa hàng mới hoặc rút nhân sự về dự bị (storeId = null).</p>
     *
     * @param accountId ID của tài khoản nhân sự cần gán.
     * @param storeId ID của cửa hàng cần gán (có thể truyền null nếu muốn rút nhân sự về dự bị).
     * @return ResponseEntity chứa thông báo kết quả gán cửa hàng thành công.
     */
    @PatchMapping("/accounts/{accountId}/store")
    public ResponseEntity<String> assignStoreToAccount(
            @PathVariable String accountId,
            @RequestParam(required = false) String storeId) {

        String message = accountService.assignStoreToAccount(accountId, storeId);
        return ResponseEntity.ok(message);
    }

    /**
     * API Hoán đổi vị trí cửa hàng giữa 2 Quản lý.
     * <p>
     * Phục vụ nghiệp vụ luân chuyển chéo: Ông A sang tiệm B, Ông B sang tiệm A.
     * </p>
     *
     * @param accountId1 ID của quản lý thứ 1
     * @param accountId2 ID của quản lý thứ 2
     * @return Thông báo kết quả hoán đổi chi tiết
     */
    @PutMapping("/accounts/swap-stores")
    public ResponseEntity<String> swapStoreManagers(
            @RequestParam UUID accountId1,
            @RequestParam UUID accountId2) {

        return ResponseEntity.ok(accountService.swapManagers(accountId1, accountId2));
    }

    /**
     * API Cập nhật thông tin hồ sơ của tài khoản (Profile Update).
     * <p>
     * Cho phép Admin sửa đổi thông tin cá nhân của nhân sự (Họ tên, Email)
     * hoặc đặt lại mật khẩu (Reset Password) nếu nhân sự quên.
     * Các thông tin như Role, Store, Status đã được quản lý bởi các API chuyên biệt khác.
     * </p>
     *
     * @param accountId ID của tài khoản cần sửa.
     * @param request   Payload chứa thông tin cần cập nhật.
     * @return Thông báo cập nhật thành công.
     */
    @PatchMapping("/accounts/{accountId}/email")
    public ResponseEntity<String> updateAccountEmail(
            @PathVariable String accountId,
            @RequestBody UpdateAccountRequest request) { // 🌟 Đã mở comment

        String message = accountService.updateAccountEmail(accountId, request);
        return ResponseEntity.ok(message);
    }
}