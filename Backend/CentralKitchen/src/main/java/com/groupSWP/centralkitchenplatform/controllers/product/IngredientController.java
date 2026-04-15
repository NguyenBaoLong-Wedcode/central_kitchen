package com.groupSWP.centralkitchenplatform.controllers.product;

import com.groupSWP.centralkitchenplatform.dto.product.IngredientRequest; // 🌟 Thêm import DTO
import com.groupSWP.centralkitchenplatform.entities.kitchen.Ingredient;
import com.groupSWP.centralkitchenplatform.service.product.IngredientService;
import jakarta.validation.Valid; // 🌟 Thêm import Valid để bật khiên bảo vệ
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller quản lý danh mục Nguyên liệu (Ingredient Management).
 * <p>
 * Lớp này chịu trách nhiệm cung cấp các API (CRUD) để thao tác với dữ liệu
 * nguyên vật liệu thô dùng trong Bếp trung tâm. Dữ liệu từ đây sẽ làm cơ sở
 * để xây dựng Công thức nấu ăn (Recipe), kiểm soát Tồn kho (Inventory) và
 * tính toán chi phí giá thành (Costing).
 * </p>
 * <p>
 * <b>Phân quyền:</b> Theo cấu hình bảo mật trung tâm, các thao tác Đọc (GET)
 * được mở cho mọi tài khoản hợp lệ. Các thao tác Ghi (POST, PUT, DELETE)
 * bị giới hạn khắt khe cho cấp Quản lý và Bếp trưởng.
 * </p>
 */
@RestController
@RequestMapping("/api/ingredients")
@RequiredArgsConstructor
public class IngredientController {

    private final IngredientService ingredientService;


    /**
     * API Lấy toàn bộ danh sách Nguyên liệu hệ thống.
     * <p>
     * Trả về danh mục các nguyên liệu đang có sẵn trong kho. API này thường được
     * dùng để hiển thị lên bảng giá, hoặc thả vào các Dropdown khi lên đơn nhập hàng.
     * </p>
     *
     * @return Phản hồi HTTP 200 chứa mảng danh sách các đối tượng {@link Ingredient}.
     */
    @GetMapping
    public ResponseEntity<List<Ingredient>> getAll() {
        return ResponseEntity.ok(ingredientService.getAllIngredients());
    }


    /**
     * API Xem thông tin chi tiết của một Nguyên liệu.
     * <p>Truy xuất thông tin chuyên sâu (giá vốn, đơn vị đo lường chuẩn, số lượng tồn...) của một mã nguyên liệu cụ thể.</p>
     *
     * @param id Mã định danh (UUID hoặc String) của nguyên liệu cần tra cứu.
     * @return Phản hồi HTTP 200 chứa đối tượng {@link Ingredient} tương ứng.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Ingredient> getById(@PathVariable String id) {
        return ResponseEntity.ok(ingredientService.getIngredientById(id));
    }

    /**
     * API Thêm mới Nguyên liệu vào danh mục.
     * <p>
     * Định nghĩa một mặt hàng mới để đưa vào hệ thống quản lý kho. Yêu cầu payload
     * phải chứa đầy đủ các thông tin bắt buộc (Tên, Đơn vị tính, Mức tồn kho tối thiểu...).
     * </p>
     *
     * @param ingredient Payload chứa dữ liệu cấu thành nguyên liệu mới.
     * @return Phản hồi HTTP 201 (Created) kèm dữ liệu nguyên liệu vừa được cấp ID và lưu thành công.
     */

    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @PostMapping
    public ResponseEntity<Ingredient> create(@Valid @RequestBody IngredientRequest request) { // 🌟 Dùng DTO + @Valid
        Ingredient created = ingredientService.createIngredient(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * API Cập nhật thông tin Nguyên liệu.
     * <p>
     * Chỉnh sửa các thông số của một nguyên liệu đang tồn tại (Ví dụ: Cập nhật giá vốn
     * do biến động thị trường, đổi định mức tồn kho...). Dữ liệu gửi lên sẽ ghi đè dữ liệu cũ.
     * </p>
     *
     * @param id                Mã định danh của nguyên liệu cần sửa.
     * @param ingredientDetails Payload chứa các thông số mới.
     * @return Phản hồi HTTP 200 chứa trạng thái nguyên liệu sau khi đã cập nhật.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @PutMapping("/{id}")
    public ResponseEntity<Ingredient> update(@PathVariable String id, @Valid @RequestBody IngredientRequest request) { // 🌟 Dùng DTO + @Valid
        Ingredient updated = ingredientService.updateIngredient(id, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * API Xóa Nguyên liệu.
     * <p>
     * Loại bỏ một nguyên liệu khỏi hệ thống. Lưu ý: Ở môi trường thực tế, nếu nguyên liệu
     * này đã từng được dùng để nhập kho hoặc dính vào công thức nấu ăn, hệ thống (tầng Service)
     * thường sẽ chặn lệnh xóa vật lý để đảm bảo toàn vẹn dữ liệu.
     * </p>
     *
     * @param id Mã định danh của nguyên liệu cần xóa.
     * @return Phản hồi HTTP 200 kèm JSON thông báo kết quả xóa thành công.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        ingredientService.deleteIngredient(id);
        return ResponseEntity.ok(Map.of("message", "Đã xóa nguyên liệu thành công!"));
    }
}