package com.groupSWP.centralkitchenplatform.controllers.product;

import com.groupSWP.centralkitchenplatform.dto.product.CategoryRequest;
import com.groupSWP.centralkitchenplatform.dto.product.CategoryResponse;
import com.groupSWP.centralkitchenplatform.service.product.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller quản lý Danh mục Sản phẩm và Nguyên liệu (Category Management).
 * <p>
 * Lớp này cung cấp các API để thực hiện các thao tác CRUD (Thêm, Sửa, Xóa, Xem)
 * đối với các nhóm danh mục. Việc phân loại này giúp hệ thống dễ dàng quản lý
 * thực đơn, phân nhóm nguyên liệu trong kho và hỗ trợ phân tích báo cáo.
 * </p>
 * <p>
 * <b>Phân quyền hiện tại:</b> Toàn bộ các API trong lớp này (bao gồm cả thao tác Đọc)
 * đều bị giới hạn nghiêm ngặt, chỉ cho phép các cấp quản lý (ADMIN, MANAGER)
 * và Bếp trưởng (KITCHEN_MANAGER) thao tác.
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0.0
 * @since 2026-03-27
 */
@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
// 🔥 ĐÃ FIX LỖI 403: Chuyển từ hasAnyRole sang hasAnyAuthority để tránh bẫy của Spring Security
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER','KITCHEN_MANAGER')")
//@PreAuthorize("hasRole('MANAGER_KITCHEN')") // 🌟 BẢO MẬT: Phân quyền toàn bộ class cho KITCHEN_MANAGER
public class CategoryController {

    private final CategoryService categoryService;

    // =======================================================
    // 1. TẠO DANH MỤC MỚI
    // =======================================================
    /**
     * API Tạo danh mục mới.
     * <p>Khởi tạo một nhóm phân loại mới cho hệ thống (VD: Đồ uống, Món ăn kèm, Gia vị khô...).</p>
     *
     * @param request Payload chứa thông tin danh mục cần tạo (Tên danh mục, Mô tả).
     * @return Phản hồi HTTP 200 chứa đối tượng {@link CategoryResponse} vừa được lưu vào DB.
     * @throws IllegalArgumentException Nếu dữ liệu đầu vào không hợp lệ (ví dụ để trống tên danh mục).
     * @throws RuntimeException Nếu quá trình lưu vào cơ sở dữ liệu gặp sự cố.
     */
    @PostMapping
    public ResponseEntity<CategoryResponse> createCategory(@RequestBody CategoryRequest request) {
        return ResponseEntity.ok(categoryService.createCategory(request));
    }

    // =======================================================
    // 2. LẤY DANH SÁCH DANH MỤC
    // =======================================================
    /**
     * API Lấy danh sách toàn bộ danh mục.
     * <p>Truy xuất tất cả các danh mục đang tồn tại để hiển thị lên các bảng biểu giao diện hoặc Dropdown chọn món.</p>
     *
     * @return Phản hồi HTTP 200 chứa danh sách các danh mục hệ thống.
     * @throws RuntimeException Nếu có lỗi kết nối hoặc truy xuất dữ liệu từ database.
     */
    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAllCategories());
    }

    // =======================================================
    // 3. CẬP NHẬT DANH MỤC
    // =======================================================
    /**
     * API Cập nhật thông tin danh mục.
     * <p>Thay đổi tên hoặc nội dung mô tả của một danh mục đã tồn tại dựa vào ID.</p>
     *
     * @param id      Mã định danh (ID) của danh mục cần sửa đổi.
     * @param request Payload chứa dữ liệu mới sẽ được ghi đè lên danh mục cũ.
     * @return Phản hồi HTTP 200 chứa thông tin danh mục sau khi đã được cập nhật thành công.
     * @throws RuntimeException Nếu không tìm thấy danh mục với ID tương ứng trong hệ thống.
     * @throws IllegalArgumentException Nếu dữ liệu cập nhật không hợp lệ.
     */
    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> updateCategory(
            @PathVariable Long id,
            @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(categoryService.updateCategory(id, request));
    }

    // =======================================================
    // 4. XÓA DANH MỤC
    // =======================================================
    /**
     * API Xóa danh mục.
     * <p>
     * Gỡ bỏ một danh mục khỏi hệ thống. Lưu ý: Ở tầng Service thường sẽ phải ném ra lỗi
     * nếu danh mục này đang chứa sản phẩm bên trong (để ngăn chặn tình trạng mồ côi dữ liệu).
     * </p>
     *
     * @param id Mã định danh (ID) của danh mục cần xóa.
     * @return Phản hồi HTTP 200 kèm thông báo chuỗi xác nhận xóa thành công.
     * @throws RuntimeException Nếu không tìm thấy danh mục hoặc danh mục đang chứa sản phẩm không thể xóa.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.ok("Đã xóa danh mục thành công!");
    }
}