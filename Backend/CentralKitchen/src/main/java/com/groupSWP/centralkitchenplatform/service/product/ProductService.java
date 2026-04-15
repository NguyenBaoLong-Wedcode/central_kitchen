package com.groupSWP.centralkitchenplatform.service.product;

import com.groupSWP.centralkitchenplatform.dto.product.ProductRequest;
import com.groupSWP.centralkitchenplatform.dto.product.ProductResponse;
import com.groupSWP.centralkitchenplatform.entities.common.UnitType;
import com.groupSWP.centralkitchenplatform.entities.kitchen.Ingredient;
import com.groupSWP.centralkitchenplatform.entities.product.Category;
import com.groupSWP.centralkitchenplatform.entities.product.Product;
import com.groupSWP.centralkitchenplatform.repositories.product.CategoryRepository;
import com.groupSWP.centralkitchenplatform.repositories.product.IngredientRepository;
import com.groupSWP.centralkitchenplatform.repositories.product.ProductRepository;
import com.groupSWP.centralkitchenplatform.specifications.ProductSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {
    private final ProductRepository productRepository;
    private final FormulaService formulaService;
    private final CategoryRepository categoryRepository;
    private final IngredientRepository ingredientRepository; // 👇 THÊM DÒNG NÀY ĐỂ MÓC GIÁ NGUYÊN LIỆU (UNIT COST)

    @Transactional
    public ProductResponse createProduct(ProductRequest request) {

        // 🔥 0. KIỂM TRA TRÙNG LẶP MÃ SẢN PHẨM Ở ĐÂY NÈ SẾP
        if (request.getProductId() == null || request.getProductId().trim().isEmpty()) {
            throw new RuntimeException("Mã sản phẩm không được để trống!");
        }

        // Hàm existsById là tính năng có sẵn cực xịn của Spring Data JPA
        if (productRepository.existsById(request.getProductId())) {
            throw new RuntimeException("Mã sản phẩm '" + request.getProductId() + "' đã tồn tại trong hệ thống. Vui lòng nhập mã khác!");
        }

        // 🔥 KHIÊN CHẮN: Kiểm tra rỗng trước khi tìm Category
        if (request.getCategoryId() == null) {
            throw new RuntimeException("Danh mục không được để trống!");
        }

        // 1. Tìm Category từ ID (Giữ nguyên code cũ của sếp)
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Danh mục không tồn tại!"));

        // 🌟 GỌI HÀM TÍNH TOÁN & RÀNG BUỘC VÀO ĐÂY NÈ SẾP
        BigDecimal autoCalculatedCost = calculateCostPriceAndValidate(request.getIngredients(), request.getSellingPrice());

        // =========================================================
        // 🛑 CHỐT CHẶN BẢO VỆ MENU: BẮT BUỘC DÙNG ĐƠN VỊ BÁN
        // =========================================================
        // 🔥 KHIÊN CHẮN: Bắt lỗi Enum để tránh sập 500
        if (request.getBaseUnit() == null || request.getBaseUnit().trim().isEmpty()) {
            throw new RuntimeException("Đơn vị bán không được để trống!");
        }

        UnitType selectedSalesUnit;
        try {
            selectedSalesUnit = UnitType.valueOf(request.getBaseUnit().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Lỗi: Đơn vị tính '" + request.getBaseUnit() + "' không tồn tại trong hệ thống!");
        }

        if (!selectedSalesUnit.isSalesUnit()) {
            throw new RuntimeException("Lỗi: Đơn vị bán hàng của sản phẩm không hợp lệ! Vui lòng dùng PHAN, TO, DIA, COMBO, CHAI, v.v. Không dùng " + selectedSalesUnit.name() + ".");
        }

        // Khởi tạo Entity Product
        Product product = Product.builder()
                .productId(request.getProductId())
                .productName(request.getProductName())
                .category(category)
                .sellingPrice(request.getSellingPrice())
                .costPrice(autoCalculatedCost) // 🌟 NHÉT GIÁ VỐN TỰ ĐỘNG VÀO ĐÂY!
                .baseUnit(selectedSalesUnit) // 🌟 ĐÃ GẮN BIẾN ĐÃ QUA KIỂM DUYỆT
                // =========================================================
                // 🛑 MẶC ĐỊNH LƯU NHÁP: Cắt luôn quyền mở bán khi mới tạo
                // =========================================================
                .isActive(false)
                .build();

        Product savedProduct = productRepository.save(product);

        // 3. Lưu công thức (BOM)
        if (request.getIngredients() != null && !request.getIngredients().isEmpty()) {
            formulaService.saveFormulas(savedProduct, request.getIngredients());
        }

        return mapToResponse(savedProduct);
    }

    @Transactional
    public ProductResponse updateProduct(String id, ProductRequest request) {
        // 1. Lấy sản phẩm hiện tại
        Product existingProduct = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm ID: " + id));

        // 2. Cập nhật thông tin cơ bản nếu có truyền lên
        if (request != null) {
            if (request.getProductName() != null) existingProduct.setProductName(request.getProductName());

            // 🌟 Lấy giá bán sẽ dùng để check (Giá mới nếu có truyền, không thì xài giá cũ)
            BigDecimal sellingPriceToCheck = request.getSellingPrice() != null ? request.getSellingPrice() : existingProduct.getSellingPrice();

            if (request.getSellingPrice() != null) {
                existingProduct.setSellingPrice(request.getSellingPrice());
            }

            if (request.getBaseUnit() != null && !request.getBaseUnit().trim().isEmpty()) {
                // =========================================================
                // 🛑 CHỐT CHẶN BẢO VỆ MENU KHI UPDATE
                // =========================================================
                try {
                    UnitType selectedSalesUnit = UnitType.valueOf(request.getBaseUnit().toUpperCase());
                    if (!selectedSalesUnit.isSalesUnit()) {
                        throw new RuntimeException("Lỗi: Đơn vị bán hàng của sản phẩm không hợp lệ! Vui lòng dùng PHAN, TO, DIA, COMBO, CHAI, v.v. Không dùng " + selectedSalesUnit.name() + ".");
                    }
                    existingProduct.setBaseUnit(selectedSalesUnit); // 🌟 ĐÃ GẮN BIẾN ĐÃ QUA KIỂM DUYỆT
                } catch (IllegalArgumentException e) {
                    throw new RuntimeException("Lỗi: Đơn vị tính '" + request.getBaseUnit() + "' không tồn tại trong hệ thống!");
                }
            }

            // 🔥 KHIÊN CHẮN: Lấp lỗ hổng lách luật bật isActive khi không có công thức
            if (request.getIsActive() != null) {
                if (request.getIsActive()) {
                    boolean willHaveFormula = (request.getIngredients() != null && !request.getIngredients().isEmpty()) ||
                            (existingProduct.getFormulas() != null && !existingProduct.getFormulas().isEmpty());
                    if (!willHaveFormula) {
                        throw new RuntimeException("CẢNH BÁO: Không thể mở bán sản phẩm này vì CHƯA CÓ CÔNG THỨC (BOM). Vui lòng thêm nguyên liệu định lượng trước khi cập nhật mở bán!");
                    }
                }
                existingProduct.setActive(request.getIsActive());
            }

            // Xử lý Category
            if (request.getCategoryId() != null) {
                Category category = categoryRepository.findById(request.getCategoryId())
                        .orElseThrow(() -> new RuntimeException("Danh mục không tồn tại: " + request.getCategoryId()));
                existingProduct.setCategory(category);
            }

            // =========================================================================
            // 🌟 XỬ LÝ NGHIỆP VỤ TÍNH LẠI GIÁ VỐN (COST PRICE) & CHECK TỈ LỆ VÀNG
            // =========================================================================
            if (request.getIngredients() != null) {
                // TRƯỜNG HỢP 1: Có gửi kèm Cập nhật Công thức mới -> Tính toán lại giá vốn từ đầu
                BigDecimal newCostPrice = calculateCostPriceAndValidate(request.getIngredients(), sellingPriceToCheck);
                existingProduct.setCostPrice(newCostPrice);
            }
            else if (request.getSellingPrice() != null && existingProduct.getCostPrice() != null) {
                // TRƯỜNG HỢP 2: KHÔNG gửi công thức, CHỈ đổi Giá bán -> Lấy giá vốn CŨ ra check luật F&B
                BigDecimal currentCost = existingProduct.getCostPrice();

                // Trạm 2: Check lỗ
                if (sellingPriceToCheck.compareTo(currentCost) <= 0) {
                    throw new RuntimeException("CẢNH BÁO LỖ VỐN: Giá bán mới cập nhật (" + sellingPriceToCheck + ") đang THẤP HƠN hoặc BẰNG Giá vốn hiện tại (" + currentCost + ")!");
                }

                // Trạm 3: Check Tỉ lệ vàng (Food Cost % <= 40%)
                BigDecimal foodCostPercentage = currentCost.divide(sellingPriceToCheck, 4, java.math.RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
                if (foodCostPercentage.compareTo(new BigDecimal("40")) > 0) {
                    throw new RuntimeException("CẢNH BÁO TỈ LỆ VÀNG: Với giá bán mới này, giá vốn sẽ chiếm tới " + foodCostPercentage.setScale(2, java.math.RoundingMode.HALF_UP) + "% (Vượt mức 40% cho phép)!");
                }
            }
        }

        // 👉 ĐIỂM FIX LỖI TỪ TRƯỚC: Chuyển lệnh save() lên TRƯỚC khi update công thức
        Product updatedProduct = productRepository.save(existingProduct);

        // 👉 ĐIỂM FIX LỖI TỪ TRƯỚC: Update công thức cho Product ĐÃ ĐƯỢC SAVE
        if (request != null && request.getIngredients() != null) {
            formulaService.updateFormulas(updatedProduct, request.getIngredients());
        }

        return mapToResponse(updatedProduct);
    }

    @Transactional
    public String toggleProductStatus(String id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm ID: " + id));

        // =========================================================
        // 🛑 CHỐT CHẶN VÀNG: KHÔNG CÓ CÔNG THỨC THÌ CẤM MỞ BÁN
        // =========================================================
        // Nếu đang Tắt (muốn bật lên) MÀ danh sách nguyên liệu rỗng -> Chặn ngay!
        if (!product.isActive()) {
            boolean hasNoFormula = product.getFormulas() == null || product.getFormulas().isEmpty();
            if (hasNoFormula) {
                throw new RuntimeException("CẢNH BÁO: Không thể mở bán sản phẩm này vì CHƯA CÓ CÔNG THỨC (BOM). Vui lòng thêm nguyên liệu định lượng trước khi tung ra thị trường!");
            }
        }

        // Đảo ngược trạng thái: Đang true (mở bán) -> false (ngừng bán) và ngược lại
        product.setActive(!product.isActive());
        productRepository.save(product);

        // Trả về câu thông báo cho FE mừng
        return product.isActive() ?
                "Đã MỞ BÁN lại sản phẩm: " + product.getProductName() :
                "Đã NGỪNG KINH DOANH sản phẩm: " + product.getProductName();
    }

    public List<ProductResponse> getAllProducts(
            String keyword, String category,
            Boolean isActive,
            BigDecimal minPrice, BigDecimal maxPrice,
            String sortBy, String sortDir
    ) {
        // 1. Cấu hình Sắp xếp (Sort)
        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        // =========================================================
        // 🛑 CHỐT CHẶN BẢO MẬT (ZERO TRUST) CHO MENU CỬA HÀNG
        // Lấy thông tin người đang gọi API từ JWT Token
        // Nếu phát hiện là Cửa hàng trưởng -> Ép xem món đang mở bán
        // =========================================================
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null) {
            boolean isStoreManager = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_STORE_MANAGER") || a.getAuthority().equals("STORE_MANAGER"));

            // NẾU LÀ CỬA HÀNG TRƯỞNG: ÉP CỨNG isActive = true LUÔN (Khỏi hack url)
            if (isStoreManager) {
                isActive = true;
            }
        }

        // =========================================================
        // Truyền thẳng isActive vào Specification
        // =========================================================
        Specification<Product> spec = ProductSpecification.filterProducts(
                keyword, category, isActive, minPrice, maxPrice
        );

        // 3. Lấy ra List từ DB
        List<Product> productList = productRepository.findAll(spec, sort);

        // 4. Map từ Entity sang DTO Response
        return productList.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // =========================================================
    // 🌟 API THỐNG KÊ (DASHBOARD) DÀNH CHO FRONTEND
    // =========================================================
    public java.util.Map<String, Long> getProductStatistics() {
        long activeCount = productRepository.countByIsActive(true);
        long inactiveCount = productRepository.countByIsActive(false); // Gồm cả Bản nháp & Ngừng bán
        long withFormulaCount = productRepository.countProductsWithFormula();
        long withoutFormulaCount = productRepository.countProductsWithoutFormula();
        long totalCategories = categoryRepository.count();

        return java.util.Map.of(
                "activeProducts", activeCount,
                "inactiveProducts", inactiveCount,
                "withFormula", withFormulaCount,
                "withoutFormula", withoutFormulaCount,
                "totalCategories", totalCategories
        );
    }

    // --- HÀM HELPER CHUYỂN ĐỔI ENTITY SANG DTO ---
    private ProductResponse mapToResponse(Product product) {
        return ProductResponse.builder()
                .productId(product.getProductId())
                .productName(product.getProductName())
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : "Chưa phân loại")
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .sellingPrice(product.getSellingPrice())
                .baseUnit(product.getBaseUnit() != null ? product.getBaseUnit().name() : null)
                .isActive(product.isActive())
                // =========================================================
                // 🌟 TRẢ NGÀY TẠO ĐỂ FE XỬ LÝ GIAO DIỆN "MÓN MỚI"
                // =========================================================
                .createdAt(product.getCreatedAt())
                // .imageUrl(product.getImageUrl()) // Bạn có thể xóa dòng này nếu DTO cũng đã bỏ field imageUrl
                .build();
    }

    // ====================================================================
    // 🌟 HÀM TỰ ĐỘNG TÍNH GIÁ VỐN (COST PRICE) DỰA TRÊN CÔNG THỨC (BOM)
    // ====================================================================
    private BigDecimal calculateCostPriceAndValidate(List<ProductRequest.Formula> formulas, BigDecimal sellingPrice) {
        if (formulas == null || formulas.isEmpty()) {
            return BigDecimal.ZERO; // Không có công thức thì vốn = 0
        }

        BigDecimal totalCost = BigDecimal.ZERO;

        for (ProductRequest.Formula item : formulas) {
            // 🛑 TRẠM 1: Chống nhập số âm hoặc bằng 0
            if (item.getAmountNeeded() == null || item.getAmountNeeded().compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("Định lượng của nguyên liệu (amountNeeded) bắt buộc phải lớn hơn 0!");
            }

            Ingredient ingredient = ingredientRepository.findById(item.getIngredientId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy Nguyên liệu với ID: " + item.getIngredientId()));

            BigDecimal unitCost = ingredient.getUnitCost();
            if (unitCost == null) {
                throw new RuntimeException("Nguyên liệu [" + ingredient.getName() + "] chưa được cập nhật đơn giá (unitCost). Không thể tính giá vốn!");
            }

            // Tính tiền từng món: Định lượng (amountNeeded) * Đơn giá (unitCost)
            BigDecimal itemCost = unitCost.multiply(item.getAmountNeeded());
            totalCost = totalCost.add(itemCost);
        }

        // ==========================================
        // 🛑 TRẠM KIỂM SOÁT NGHIỆP VỤ F&B (FOOD COST)
        // ==========================================
        if (sellingPrice != null && totalCost.compareTo(BigDecimal.ZERO) > 0) {

            // 🛑 TRẠM 2: Giá bán phải lớn hơn giá vốn (Chống lỗ sặc máu)
            if (sellingPrice.compareTo(totalCost) <= 0) {
                throw new RuntimeException("CẢNH BÁO LỖ VỐN: Giá bán (" + sellingPrice + ") đang THẤP HƠN hoặc BẰNG Giá vốn (" + totalCost + ")! Vui lòng tăng giá bán hoặc giảm định lượng.");
            }

            // 🛑 TRẠM 3: Kiểm soát Tỉ lệ Vàng (Food Cost không quá 40%)
            // Tính phần trăm: (Giá Vốn / Giá Bán) * 100
            BigDecimal foodCostPercentage = totalCost.divide(sellingPrice, 4, java.math.RoundingMode.HALF_UP).multiply(new BigDecimal("100"));

            if (foodCostPercentage.compareTo(new BigDecimal("40")) > 0) {
                throw new RuntimeException("CẢNH BÁO TỈ LỆ VÀNG: Giá vốn đang chiếm tới " + foodCostPercentage.setScale(2, java.math.RoundingMode.HALF_UP) + "% giá bán. " +
                        "Nguyên tắc F&B không được vượt quá 40% để đảm bảo chi phí vận hành. Giá vốn hiện tại: " + totalCost);
            }
        }

        return totalCost;
    }
}