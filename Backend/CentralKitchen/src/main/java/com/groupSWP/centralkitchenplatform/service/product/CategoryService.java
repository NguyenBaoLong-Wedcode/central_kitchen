package com.groupSWP.centralkitchenplatform.service.product;

import com.groupSWP.centralkitchenplatform.dto.product.CategoryRequest;
import com.groupSWP.centralkitchenplatform.dto.product.CategoryResponse;
import com.groupSWP.centralkitchenplatform.entities.product.Category;
import com.groupSWP.centralkitchenplatform.repositories.product.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    // 1. TẠO MỚI DANH MỤC
    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        if (categoryRepository.existsByName(request.getName())) {
            throw new RuntimeException("Tên danh mục '" + request.getName() + "' đã tồn tại!");
        }

        Category category = new Category();
        category.setName(request.getName());
        category.setDescription(request.getDescription());

        Category savedCategory = categoryRepository.save(category);
        return mapToResponse(savedCategory);
    }

    // 2. LẤY TẤT CẢ DANH MỤC
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // 3. CẬP NHẬT DANH MỤC
    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục với ID: " + id));

        // Nếu có đổi tên -> Kiểm tra xem tên mới có bị trùng với danh mục KHÁC không
        if (request.getName() != null && !request.getName().equals(category.getName())) {
            if (categoryRepository.existsByNameAndIdNot(request.getName(), id)) {
                throw new RuntimeException("Tên danh mục '" + request.getName() + "' đã tồn tại!");
            }
            category.setName(request.getName());
        }

        if (request.getDescription() != null) {
            category.setDescription(request.getDescription());
        }

        Category updatedCategory = categoryRepository.save(category);
        return mapToResponse(updatedCategory);
    }

    // 4. XÓA DANH MỤC (Có bảo vệ dữ liệu)
    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục với ID: " + id));

        // CHỐT CHẶN: Không cho xóa nếu danh mục đang chứa sản phẩm
        if (category.getProducts() != null && !category.getProducts().isEmpty()) {
            throw new IllegalStateException("Không thể xóa! Danh mục này đang chứa " + category.getProducts().size() + " sản phẩm.");
        }

        categoryRepository.deleteById(id);
    }

    // HÀM HELPER: CHUYỂN ENTITY SANG DTO
    private CategoryResponse mapToResponse(Category category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .build();
    }
}