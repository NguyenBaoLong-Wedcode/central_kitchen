package com.groupSWP.centralkitchenplatform.controllers.product;

import com.groupSWP.centralkitchenplatform.dto.manager.ConversionRequest;
import com.groupSWP.centralkitchenplatform.entities.common.UnitType;
import com.groupSWP.centralkitchenplatform.entities.kitchen.Ingredient;
import com.groupSWP.centralkitchenplatform.entities.kitchen.UnitConversion;
import com.groupSWP.centralkitchenplatform.repositories.product.IngredientRepository;
import com.groupSWP.centralkitchenplatform.service.product.UnitConversionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

/**
 * Controller quản lý luồng quy đổi đơn vị (Unit Conversion Management) dành cho cấp Quản lý.
 * <p>
 * Trong hệ thống Central Kitchen, việc quản lý đơn vị quy đổi là mắt xích cực kỳ quan trọng
 * để duy trì tính chính xác của tồn kho. Thông thường, nguyên liệu được mua vào với đơn vị
 * số lượng lớn (như Thùng, Bao, Két) nhưng lại được sử dụng trong công thức nấu ăn hoặc
 * xuất kho theo đơn vị nhỏ hơn (như Kilogram, Gram, Lít).
 * </p>
 * <p>
 * Lớp này cung cấp các API để thiết lập hệ số nhân giữa các loại đơn vị khác nhau về một
 * "Đơn vị cơ sở" duy nhất (Base Unit). Điều này giúp hệ thống tự động hóa việc tính toán
 * giá trị hàng tồn kho, dự báo nguyên liệu và đảm bảo rằng báo cáo tài chính luôn khớp
 * với số lượng thực tế trong kho bãi.
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0
 * @since 2026-03-29
 */
@RestController
@RequestMapping("/api/manager/conversions")
@RequiredArgsConstructor
public class UnitConversionController {

    private final UnitConversionService conversionService;
    private final IngredientRepository ingredientRepository;

    /**
     * API Tạo hệ số quy đổi đơn vị mới.
     * <p>
     * Thiết lập công thức quy đổi từ một đơn vị mua hàng/sử dụng về đơn vị cơ sở lưu kho.
     * Ví dụ: Định nghĩa 1 Bao = 25 Kilogram. Hệ số này sẽ được sử dụng xuyên suốt trong
     * các phiếu nhập kho và phiếu kiểm kê định kỳ.
     * </p>
     *
     * @param request Payload chứa ID nguyên liệu, đơn vị mới và hệ số nhân.
     * @return Phản hồi HTTP 200 chứa thông tin hệ số quy đổi vừa tạo thành công.
     */
    @PostMapping
    public ResponseEntity<?> createConversion(@RequestBody ConversionRequest request) {
        try {
            UnitConversion result = conversionService.createConversion(request);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * API Test tính toán quy đổi đơn vị.
     * <p>
     * Dùng để mô phỏng và kiểm tra xem hệ số quy đổi đã cấu hình chính xác chưa.
     * Frontend có thể gọi API này để hiển thị giá trị quy đổi tức thời cho người dùng
     * xem trước khi xác nhận lưu dữ liệu chính thức vào Database.
     * </p>
     *
     * @param ingredientId Mã định danh nguyên liệu cần kiểm tra.
     * @param unit         Tên đơn vị cần quy đổi (chuỗi Enum).
     * @param quantity     Số lượng thực tế cần đưa vào máy tính toán.
     * @return Phản hồi HTTP 200 chứa kết quả tính toán cuối cùng (dạng số thực).
     */
    @GetMapping("/calculate")
    public ResponseEntity<?> calculateConversion(
            @RequestParam String ingredientId,
            @RequestParam String unit,
            @RequestParam BigDecimal quantity
    ) {
        try {
            Ingredient ingredient = ingredientRepository.findById(ingredientId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy nguyên liệu!"));

            UnitType inputUnit = UnitType.valueOf(unit);
            BigDecimal result = conversionService.convertToBaseUnit(ingredient, inputUnit, quantity);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * API Lấy danh sách quy đổi của một nguyên liệu.
     * <p>
     * Phục vụ Frontend đổ dữ liệu vào các Dropdown lựa chọn đơn vị khi nhập/xuất kho.
     * Giúp nhân viên kho dễ dàng chọn lựa đơn vị phù hợp với chứng từ mua hàng thực tế.
     * </p>
     *
     * @param ingredientId Mã định danh nguyên liệu.
     * @return Phản hồi HTTP 200 chứa danh sách các công thức quy đổi tương ứng.
     */
    @GetMapping("/ingredient/{ingredientId}")
    public ResponseEntity<?> getConversionsByIngredient(@PathVariable String ingredientId) {
        return ResponseEntity.ok(conversionService.getConversionsByIngredient(ingredientId));
    }

    /**
     * API Cập nhật hệ số quy đổi.
     * <p>
     * Cho phép tinh chỉnh lại hệ số nhân của một công thức quy đổi hiện có trong trường hợp
     * nhà cung cấp thay đổi quy cách đóng gói (Ví dụ: Đổi từ bao 25kg sang bao 30kg).
     * </p>
     *
     * @param id        Mã định danh của bản ghi công thức quy đổi.
     * @param newFactor Hệ số nhân mới cần cập nhật vào hệ thống.
     * @return Phản hồi HTTP 200 chứa thông tin quy đổi sau khi cập nhật thành công.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateConversion(
            @PathVariable Long id,
            @RequestParam BigDecimal newFactor
    ) {
        try {
            UnitConversion result = conversionService.updateConversion(id, newFactor);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * API Xóa cấu hình quy đổi đơn vị.
     * <p>
     * Loại bỏ một công thức quy đổi không còn sử dụng ra khỏi hệ thống. Thao tác này
     * cần thận trọng vì có thể ảnh hưởng đến các phiếu nhập/xuất cũ đang tham chiếu.
     * </p>
     *
     * @param id Mã định danh của công thức quy đổi cần xóa.
     * @return Phản hồi HTTP 200 kèm thông báo xóa thành công.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteConversion(@PathVariable Long id) {
        try {
            conversionService.deleteConversion(id);
            return ResponseEntity.ok("Đã xóa công thức quy đổi thành công!");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}