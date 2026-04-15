package com.groupSWP.centralkitchenplatform.controllers.store;

import com.groupSWP.centralkitchenplatform.dto.store.StoreProfileResponse;
import com.groupSWP.centralkitchenplatform.dto.store.StoreProfileUpdateRequest;
import com.groupSWP.centralkitchenplatform.dto.store.StoreStatusRequest;
import com.groupSWP.centralkitchenplatform.service.store.StoreSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

/**
 * Controller quản lý các thiết lập và cấu hình thông tin định danh cho từng Cửa hàng (Store).
 * <p>
 * Lớp này cung cấp các điểm cuối (endpoints) để thực hiện các thao tác quản trị hồ sơ cửa hàng,
 * bao gồm việc truy vấn thông tin chi tiết, cập nhật các thông số liên lạc (SĐT, địa chỉ)
 * và kiểm soát trạng thái vận hành của điểm bán trên toàn hệ thống CentralKitchen.
 * </p>
 * <p>
 * <b>Cơ chế phân quyền:</b> Các API bên trong được thiết kế với sự phân tầng bảo mật rõ rệt.
 * Trong khi các thao tác cập nhật hồ sơ cá nhân cho phép Cửa hàng trưởng (STORE_MANAGER) tự thực hiện,
 * thì các thao tác ảnh hưởng đến vận hành hệ thống như Bật/Tắt trạng thái hoạt động
 * đều được khóa chặt và chỉ dành riêng cho Quản trị viên (ADMIN) để đảm bảo tính toàn vẹn của dữ liệu và hệ thống.
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0
 * @since 2026-03-29
 */
@RestController
@RequestMapping("/api/store/settings")
@RequiredArgsConstructor
public class StoreSettingsController {

    /**
     * Service xử lý logic nghiệp vụ liên quan đến thiết lập và trạng thái cửa hàng.
     */
    private final StoreSettingsService storeSettingsService;

    /**
     * API Xem hồ sơ thiết lập Cửa hàng.
     * <p>Primary Actor: STORE_MANAGER | Secondary Actor: ADMIN, MANAGER.</p>
     *
     * @param principal Đối tượng bảo mật chứa danh tính người gọi dùng để xác định cửa hàng tương ứng.
     * @return ResponseEntity chứa đối tượng {@link StoreProfileResponse} với đầy đủ thông tin hồ sơ.
     */
    @GetMapping("/profile")
    @PreAuthorize("hasAnyRole('STORE_MANAGER', 'ADMIN')")
    public ResponseEntity<StoreProfileResponse> getStoreProfile(Principal principal) {
        return ResponseEntity.ok(storeSettingsService.getProfileByUsername(principal.getName()));
    }

    /**
     * API Cập nhật thông tin hồ sơ Cửa hàng (SĐT, Địa chỉ...).
     * <p>Cho phép Cửa hàng trưởng tự cập nhật hoặc Admin hỗ trợ chỉnh sửa.</p>
     *
     * @param principal Đối tượng bảo mật chứa danh tính người gọi.
     * @param request   Payload {@link StoreProfileUpdateRequest} chứa dữ liệu hồ sơ mới cần cập nhật.
     * @return ResponseEntity trả về thông báo xác nhận quá trình cập nhật hồ sơ đã hoàn tất.
     */
    @PutMapping("/profile")
    @PreAuthorize("hasAnyRole('STORE_MANAGER', 'ADMIN')")
    public ResponseEntity<String> updateStoreProfile(
            Principal principal,
            @RequestBody StoreProfileUpdateRequest request) {
        storeSettingsService.updateProfileByUsername(principal.getName(), request);
        return ResponseEntity.ok("Cập nhật thông tin thành công!");
    }

    /**
     * API Bật/Tắt trạng thái hoạt động của Cửa hàng.
     * <p>Nghiệp vụ Mở/Đóng cửa được bảo mật nghiêm ngặt và chỉ ADMIN mới có quyền thực thi.</p>
     *
     * @param storeId Mã định danh duy nhất của Cửa hàng cần cập nhật trạng thái.
     * @param request Payload {@link StoreStatusRequest} chứa cờ trạng thái isActive (boolean).
     * @return ResponseEntity thông báo trạng thái hoạt động hiện tại (MỞ/ĐÓNG) của cửa hàng sau xử lý.
     */
    @PutMapping("/{storeId}/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> updateStatus(
            @PathVariable String storeId,
            @RequestBody StoreStatusRequest request) {

        storeSettingsService.updateStatus(storeId, request.getIsActive());

        String statusMsg = request.getIsActive() ? "MỞ CỬA" : "ĐÓNG CỬA";
        return ResponseEntity.ok("Cửa hàng " + storeId + " trạng thái hiện tại: " + statusMsg);
    }
}