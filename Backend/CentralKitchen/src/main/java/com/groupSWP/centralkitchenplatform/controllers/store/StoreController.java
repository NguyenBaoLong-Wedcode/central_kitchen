package com.groupSWP.centralkitchenplatform.controllers.store;

import com.groupSWP.centralkitchenplatform.dto.store.StoreRequest;
import com.groupSWP.centralkitchenplatform.dto.store.StoreResponse;
import com.groupSWP.centralkitchenplatform.service.store.StoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stores")
@RequiredArgsConstructor
public class StoreController {

    private final StoreService storeService;

    /**
     * API Tạo mới Cửa hàng (Store).
     *
     * @param request Payload chứa thông tin cấu hình cửa hàng mới.
     * @return Phản hồi HTTP 200 chứa thông tin Cửa hàng vừa tạo.
     */
    @PostMapping
    public ResponseEntity<StoreResponse> createStore(@RequestBody StoreRequest request) {
        return ResponseEntity.ok(storeService.createStore(request));
    }

    /**
     * API Lấy danh sách toàn bộ Cửa hàng trong hệ thống.
     *
     * @return Phản hồi HTTP 200 chứa danh sách các Cửa hàng.
     */
    @GetMapping("/all")
    public ResponseEntity<List<StoreResponse>> getAllStores() {
        return ResponseEntity.ok(storeService.getAllStores());
    }

    /**
     * API Lấy danh sách các Cửa hàng "trống" (chưa được gán Quản lý).
     * <p>Phục vụ màn hình chọn nơi công tác cho nhân sự mới.</p>
     *
     * @return Phản hồi HTTP 200 chứa danh sách Cửa hàng trống.
     */
    @GetMapping("/empty-stores")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<List<StoreResponse>> getEmptyStores() {
        return ResponseEntity.ok(storeService.getEmptyStores());
    }

    /**
     * API Cập nhật thông tin chi tiết Cửa hàng.
     *
     * @param storeId Mã định danh Cửa hàng.
     * @param request Payload chứa thông tin cần cập nhật.
     * @return Phản hồi HTTP 200 chứa thông tin Cửa hàng sau khi cập nhật.
     */
    @PutMapping("/{storeId}")
    public ResponseEntity<StoreResponse> updateStore(
            @PathVariable String storeId,
            @RequestBody StoreRequest request
    ) {
        return ResponseEntity.ok(storeService.updateStore(storeId, request));
    }

    /**
     * API Gán hoặc thay đổi Cửa hàng trưởng cho một Cửa hàng.
     *
     * @param storeId   Mã định danh Cửa hàng.
     * @param accountId Mã định danh tài khoản Quản lý được gán.
     * @return Phản hồi HTTP 200 kèm thông báo thành công.
     */
    @PutMapping("/{storeId}/assign-manager")
    public ResponseEntity<String> assignManager(
            @PathVariable String storeId,
            @RequestParam UUID accountId) {
        return ResponseEntity.ok(storeService.changeStoreManager(storeId, accountId));
    }

    /**
     * API Đóng cửa (Xóa mềm) Cửa hàng và hỗ trợ luân chuyển nhân sự.
     * <p>Cập nhật trạng thái Cửa hàng thành vô hiệu hóa, đồng thời cho phép gán Quản lý sang tiệm mới.</p>
     *
     * @param storeId           Mã định danh Cửa hàng cần đóng.
     * @param transferToStoreId (Tùy chọn) Mã Cửa hàng mới để luân chuyển quản lý sang.
     * @return Phản hồi HTTP 200 kèm thông báo đóng cửa thành công.
     */
    @PutMapping("/{storeId}/status")
    public ResponseEntity<String> softDeleteStore(
            @PathVariable String storeId,
            @RequestParam(required = false) String transferToStoreId) {
        storeService.softDeleteStore(storeId, transferToStoreId);
        return ResponseEntity.ok("Đã đóng cửa hàng và luân chuyển nhân sự thành công!");
    }

//    @DeleteMapping("/{storeId}")
//    public ResponseEntity<String> deleteStore(@PathVariable String storeId) {
//        storeService.deleteStore(storeId);
//        return ResponseEntity.ok("Đã xóa cửa hàng và nhân viên liên quan thành công!");
//    }
}