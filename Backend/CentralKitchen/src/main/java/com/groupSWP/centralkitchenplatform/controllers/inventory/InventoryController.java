package com.groupSWP.centralkitchenplatform.controllers.inventory;

import com.groupSWP.centralkitchenplatform.dto.inventory.ImportRequest;
import com.groupSWP.centralkitchenplatform.dto.inventory.ImportTicketResponse;
import com.groupSWP.centralkitchenplatform.service.inventory.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

/**
 * Controller quản lý các nghiệp vụ Kho và Nhập xuất nguyên liệu (Inventory Management).
 * <p>
 * Lớp này cung cấp các API chuyên dụng cho nhân viên Quản lý kho / Bếp trung tâm
 * để thực hiện các giao dịch nhập hàng, cập nhật số lượng tồn kho và lưu vết
 * lịch sử nhập liệu (Audit Trail).
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0.0
 * @since 2026-03-26
 */
@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    /**
     * API Tạo phiếu nhập kho nguyên liệu.
     * <p>
     * Nhận yêu cầu nhập kho bao gồm danh sách các nguyên liệu, số lượng, giá cả.
     * Hệ thống sẽ tự động cập nhật số lượng tồn kho (kitchenStock) của từng nguyên liệu
     * và sinh ra một Phiếu nhập kho (Import Ticket) để lưu vết chứng từ.
     * </p>
     * <p>
     * <b>Lưu vết hệ thống:</b> API sử dụng {@link Principal} để định danh chính xác
     * người đang thao tác nhập kho, từ đó gắn tên người tạo vào phiếu nhập.
     * </p>
     *
     * @param request   Payload chứa thông tin chi tiết các mặt hàng cần nhập.
     * @param principal "Thẻ căn cước" chứa danh tính (username) của người đang gọi API.
     * @return Phản hồi HTTP 200 chứa {@link ImportTicketResponse} (Thông tin phiếu nhập vừa tạo).
     */
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @PostMapping("/import")
    public ResponseEntity<ImportTicketResponse> importIngredients(
            @RequestBody ImportRequest request,
            Principal principal) { // 🌟 TỐI ƯU: Dùng thẳng Principal cho gọn và đồng bộ!

        // Lấy username từ Token người đang đăng nhập cực kỳ ngắn gọn
        String username = principal.getName();

        // Chuyển giao nhiệm vụ tính toán, cập nhật kho cho tầng Service
        return ResponseEntity.ok(inventoryService.importIngredients(request, username));
    }

    /**
     * API Xem và Lọc lịch sử nhập kho.
     * <p>
     * - Nếu KHÔNG truyền tham số: Trả về toàn bộ lịch sử từ trước đến nay.
     * - Nếu CÓ truyền tham số: Tự động lọc theo Năm / Tháng / Ngày.
     * </p>
     *
     * @param year  Tham số truyền vào để lọc theo năm (Có thể null).
     * @param month Tham số truyền vào để lọc theo tháng (Có thể null).
     * @param day   Tham số truyền vào để lọc theo ngày (Có thể null).
     * @return Phản hồi HTTP 200 chứa danh sách {@link ImportTicketResponse}.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'KITCHEN_MANAGER')")
    @GetMapping("/import-history")
    public ResponseEntity<List<ImportTicketResponse>> getImportHistory(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer day) {

        // Truyền thẳng xuống Service. Service đã có logic: nếu year == null thì tự lấy tất cả.
        return ResponseEntity.ok(inventoryService.getImportHistoryByTime(year, month, day));
    }
}