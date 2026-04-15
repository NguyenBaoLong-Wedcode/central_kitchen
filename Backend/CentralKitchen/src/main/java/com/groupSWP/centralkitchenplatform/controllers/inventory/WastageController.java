//package com.groupSWP.centralkitchenplatform.controllers.inventory;
//
//import com.groupSWP.centralkitchenplatform.dto.kitchen.WastageRequest;
//import com.groupSWP.centralkitchenplatform.dto.kitchen.WastageResponse;
//import com.groupSWP.centralkitchenplatform.service.inventory.WastageService;
//import jakarta.validation.Valid;
//import lombok.RequiredArgsConstructor;
//import org.springframework.http.ResponseEntity;
//import org.springframework.security.access.prepost.PreAuthorize;
//import org.springframework.web.bind.annotation.*;
//
///**
// * Controller quản lý nghiệp vụ Hao hụt và Hủy hàng (Wastage/Spoilage Management).
// * <p>
// * Lớp này đóng vai trò then chốt trong phân hệ Quản lý Tồn kho (Inventory Management).
// * Nhiệm vụ chính là cung cấp các điểm neo (Endpoints) để ghi nhận những rủi ro về
// * nguyên vật liệu tại Bếp trung tâm như:
// * <ul>
// * <li>Hàng hóa bị hỏng hóc trong quá trình sơ chế, chế biến.</li>
// * <li>Nguyên liệu hết hạn sử dụng (Expired) cần phải tiêu hủy.</li>
// * <li>Hao hụt tự nhiên hoặc rơi vãi do yếu tố con người.</li>
// * </ul>
// * Việc ghi chép chính xác tỉ lệ hao hụt giúp hệ thống tính toán giá vốn hàng bán (COGS)
// * chuẩn xác hơn và hỗ trợ Ban Giám Đốc đưa ra quyết định tối ưu hóa quy trình.
// * </p>
// *
// * @author Đạt, Huy, Triển
// * @version 1.0
// * @since 2026-03-26
// */
//@RestController
//@RequestMapping("/api/kitchen")
//@RequiredArgsConstructor
//public class WastageController {
//
//    private final WastageService wastageService;
//
//    /**
//     * API Ghi nhận hao hụt hoặc hỏng hóc nguyên liệu.
//     * <p>
//     * Dành cho nhân sự Bếp trung tâm báo cáo các trường hợp nguyên liệu bị hỏng,
//     * hết hạn hoặc hao hụt trong quá trình chế biến. Hệ thống sẽ lưu vết lịch sử
//     * và tự động trừ số lượng tồn kho tương ứng.
//     * </p>
//     * <p>
//     * <b>Tác động hệ thống (System Impact):</b>
//     * Thao tác này sẽ trực tiếp làm giảm số lượng tồn kho vật lý (Physical Inventory)
//     * của nguyên liệu tương ứng. Đồng thời, một bản ghi nhật ký (Audit Log) sẽ được
//     * tạo ra để phục vụ cho công tác kiểm toán nội bộ và đối soát báo cáo cuối tháng.
//     * </p>
//     * <p>
//     * <b>Ràng buộc dữ liệu:</b> Payload đầu vào được kiểm duyệt chặt chẽ bởi thẻ {@code @Valid}.
//     * Mọi sai sót về định dạng số lượng (ví dụ: số âm) hoặc mã nguyên liệu không hợp lệ
//     * đều sẽ bị hệ thống từ chối ngay tại tầng Controller để bảo vệ tính toàn vẹn của Database.
//     * </p>
//     *
//     * @param request Payload chứa danh sách nguyên liệu và số lượng hao hụt.
//     * @return Phản hồi HTTP 200 chứa đối tượng {@link WastageResponse} xác nhận kết quả ghi nhận.
//     * @throws org.springframework.web.bind.MethodArgumentNotValidException Nếu dữ liệu request vi phạm các quy tắc validation.
//     * @throws IllegalArgumentException Nếu nguyên liệu không tồn tại hoặc số lượng báo hao hụt vượt quá tồn kho thực tế.
//     */
//    @PostMapping("/wastage")
//    @PreAuthorize("hasAnyRole('KITCHEN_MANAGER','ADMIN')")
//    public ResponseEntity<WastageResponse> recordWastage(
//            @Valid @RequestBody WastageRequest request) {
//        return ResponseEntity.ok(wastageService.recordWastage(request));
//    }
//}