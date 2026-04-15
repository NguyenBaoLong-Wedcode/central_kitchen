package com.groupSWP.centralkitchenplatform.controllers.product;

import com.groupSWP.centralkitchenplatform.dto.formula.FormulaResponse;
import com.groupSWP.centralkitchenplatform.dto.formula.FormulaUpsertRequest;
import com.groupSWP.centralkitchenplatform.service.product.FormulaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controller quản lý Công thức (Formula / Recipe) của sản phẩm.
 * <p>
 * Lớp này cung cấp các giao diện lập trình (API) để cấu hình định mức nguyên liệu
 * cấu thành nên một sản phẩm cụ thể. Các thao tác thêm, sửa, xóa công thức ở đây
 * được thiết kế để hoạt động độc lập với quá trình tạo Sản phẩm (Product).
 * </p>
 */
@RestController
@RequestMapping("/api/formulas")
@RequiredArgsConstructor
public class FormulaController {

    private final FormulaService formulaService;

    // =======================================================
    // 1. LẤY CHI TIẾT CÔNG THỨC THEO MÃ SẢN PHẨM
    // =======================================================
    /**
     * API Lấy chi tiết công thức của một sản phẩm.
     * <p>Truy xuất danh sách các nguyên liệu và định lượng cần thiết để chế biến sản phẩm này.</p>
     *
     * @param productId Mã định danh của sản phẩm.
     * @return Phản hồi HTTP 200 chứa đối tượng {@link FormulaResponse} gồm thông tin sản phẩm và danh sách nguyên liệu.
     */
    @GetMapping("/{productId}")
    public ResponseEntity<FormulaResponse> getFormula(@PathVariable String productId) {
        // Đã sửa recipeService -> formulaService và getRecipeByProduct -> getFormulaByProduct
        return ResponseEntity.ok(formulaService.getFormulaByProduct(productId));
    }

    // =======================================================
    // 2. THÊM MỚI / CẬP NHẬT CÔNG THỨC (UPSERT)
    // =======================================================
    /**
     * API Lưu trữ hoặc Cập nhật công thức (Upsert).
     * <p>
     * Cơ chế Upsert: Nếu sản phẩm chưa có công thức, hệ thống sẽ tạo mới.
     * Nếu đã có, hệ thống sẽ xóa toàn bộ công thức cũ và ghi đè bằng danh sách nguyên liệu mới gửi lên.
     * </p>
     *
     * @param req Payload chứa mã sản phẩm và mảng danh sách nguyên liệu kèm định lượng.
     * @return Phản hồi HTTP 200 kèm thông báo xử lý thành công.
     */
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @PostMapping
    public ResponseEntity<?> upsertFormula(@RequestBody FormulaUpsertRequest req) {
        // Đã sửa recipeService -> formulaService và upsertRecipe -> upsertFormula
        return ResponseEntity.ok(formulaService.upsertFormula(req));
    }

    // =======================================================
    // 3. XÓA CÔNG THỨC
    // =======================================================
    /**
     * API Xóa toàn bộ công thức của một sản phẩm.
     * <p>Xóa sạch mối liên kết giữa sản phẩm và các nguyên liệu cấu thành trong Database.</p>
     *
     * @param productId Mã định danh của sản phẩm cần xóa công thức.
     * @return Phản hồi HTTP 200 kèm thông báo xóa thành công.
     */
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @DeleteMapping("/{productId}")
    public ResponseEntity<String> deleteFormula(@PathVariable String productId) {
        formulaService.deleteFormula(productId);
        return ResponseEntity.ok("Xóa công thức thành công");
    }
}