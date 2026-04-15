package com.groupSWP.centralkitchenplatform.service.product;

import com.groupSWP.centralkitchenplatform.dto.product.IngredientRequest;
import com.groupSWP.centralkitchenplatform.entities.common.UnitType;
import com.groupSWP.centralkitchenplatform.entities.kitchen.Ingredient;
import com.groupSWP.centralkitchenplatform.repositories.product.IngredientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Service quản lý danh mục Nguyên vật liệu (Ingredient Management).
 * <p>
 * Cung cấp các thao tác CRUD an toàn cho dữ liệu nguyên liệu thô.
 * Đảm bảo tính toàn vẹn của dữ liệu giá cả và tồn kho bằng các chốt chặn kiểm tra logic nghiệp vụ.
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IngredientService {

    private final IngredientRepository ingredientRepository;

    /**
     * Lấy danh sách toàn bộ nguyên liệu trong hệ thống.
     *
     * @return Danh sách các thực thể {@link Ingredient}.
     */
    public List<Ingredient> getAllIngredients() {
        return ingredientRepository.findAll();
    }

    /**
     * Lấy chi tiết một nguyên liệu dựa trên ID.
     *
     * @param id Mã định danh nguyên liệu.
     * @return Thực thể {@link Ingredient} tương ứng.
     * @throws RuntimeException Nếu không tìm thấy nguyên liệu.
     */
    public Ingredient getIngredientById(String id) {
        return ingredientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nguyên liệu với ID: " + id));
    }

    /**
     * Khởi tạo nguyên liệu mới.
     * <p>
     * Dữ liệu nhận vào qua DTO sẽ được map sang Entity. Mức tồn kho ban đầu (Kitchen Stock)
     * luôn được mặc định gán bằng 0 (chỉ được tăng lên qua luồng Nhập kho).
     * </p>
     *
     * @param request Payload chứa thông tin nguyên liệu mới.
     * @return Thực thể Nguyên liệu vừa được lưu vào cơ sở dữ liệu.
     * @throws RuntimeException Nếu đơn giá nhập vào nhỏ hơn hoặc bằng 0.
     */
    @Transactional
    public Ingredient createIngredient(IngredientRequest request) {
        log.info("Đang tạo mới nguyên liệu: {}", request.getName());
        // 1. Chặn rỗng hoặc null
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new RuntimeException("Lỗi: Tên nguyên liệu không được để trống!");
        }

        // 2. Chuẩn hóa chuỗi (Cắt bỏ các dấu cách thừa ở đầu và cuối chữ)
        String normalizedName = request.getName().trim();

        // 3. Kiểm tra trùng lặp tên trong kho (Không phân biệt hoa thường)
        if (ingredientRepository.existsByNameIgnoreCase(normalizedName)) {
            throw new RuntimeException("Lỗi: Nguyên liệu mang tên '" + normalizedName + "' đã tồn tại trong kho!");
        }

        if (request.getUnitCost() == null || request.getUnitCost().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Lỗi: Đơn giá (unitCost) phải lớn hơn 0!");
        }

        // =========================================================
        // 🛑 CHỐT CHẶN BẢO VỆ KHO: BẮT BUỘC DÙNG ĐƠN VỊ GỐC (G, ML...)
        // =========================================================
        UnitType selectedUnit = UnitType.valueOf(request.getUnit().toUpperCase());
        if (!selectedUnit.isBaseUnit()) {
            throw new RuntimeException("Lỗi: Đơn vị tồn kho của nguyên liệu thô bắt buộc phải là đơn vị nhỏ nhất (G, ML, CAI, TRAI, CU, CON, LA). Không được dùng " + selectedUnit.name() + "!");
        }

        Ingredient ingredient = new Ingredient();
        ingredient.setName(normalizedName); // 🔥 Lưu tên đã được "dọn dẹp" sạch sẽ
        ingredient.setUnit(selectedUnit);   // 🌟 ĐÃ GẮN BIẾN ĐÃ QUA KIỂM DUYỆT
        ingredient.setUnitCost(request.getUnitCost());
        ingredient.setMinThreshold(request.getMinThreshold());

        // Mặc định lúc mới tạo thì tồn kho = 0 (Chỉ có nhập kho mới được tăng số này lên)
        ingredient.setKitchenStock(BigDecimal.ZERO);

        return ingredientRepository.save(ingredient);
    }

    /**
     * Cập nhật thông tin chi tiết của một nguyên liệu.
     * <p>
     * Chỉ cập nhật các trường có sự thay đổi (khác null). Các quy tắc validate (như đơn giá > 0)
     * vẫn được kiểm soát chặt chẽ như lúc tạo mới.
     * </p>
     *
     * @param id      Mã định danh nguyên liệu cần cập nhật.
     * @param request Payload chứa dữ liệu mới.
     * @return Thực thể Nguyên liệu sau khi cập nhật thành công.
     * @throws RuntimeException Nếu đơn giá mới nhỏ hơn hoặc bằng 0.
     */
    @Transactional
    public Ingredient updateIngredient(String id, IngredientRequest request) {
        Ingredient existingIngredient = getIngredientById(id);

        if (request != null) {
            if (request.getName() != null) existingIngredient.setName(request.getName());

            if (request.getUnit() != null) {
                // =========================================================
                // 🛑 CHỐT CHẶN BẢO VỆ KHO KHI UPDATE
                // =========================================================
                UnitType selectedUnit = UnitType.valueOf(request.getUnit().toUpperCase());
                if (!selectedUnit.isBaseUnit()) {
                    throw new RuntimeException("Lỗi: Đơn vị tồn kho của nguyên liệu thô bắt buộc phải là đơn vị nhỏ nhất (G, ML, CAI, TRAI, CU, CON, LA). Không được dùng " + selectedUnit.name() + "!");
                }
                existingIngredient.setUnit(selectedUnit); // 🌟 ĐÃ GẮN BIẾN ĐÃ QUA KIỂM DUYỆT
            }

            if (request.getUnitCost() != null) {
                // 🛑 Gác cổng: Cập nhật giá cũng phải > 0
                if (request.getUnitCost().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new RuntimeException("Lỗi: Đơn giá (unitCost) cập nhật phải lớn hơn 0!");
                }
                existingIngredient.setUnitCost(request.getUnitCost());
            }

            if (request.getMinThreshold() != null) {
                existingIngredient.setMinThreshold(request.getMinThreshold());
            }
        }

        log.info("Đã cập nhật nguyên liệu ID: {}", id);
        return ingredientRepository.save(existingIngredient);
    }

    /**
     * Xóa một nguyên liệu khỏi hệ thống.
     *
     * @param id Mã định danh nguyên liệu cần xóa.
     */
    @Transactional
    public void deleteIngredient(String id) {
        Ingredient existingIngredient = getIngredientById(id);
        ingredientRepository.delete(existingIngredient);
        log.info("Đã xóa nguyên liệu ID: {}", id);
    }
}