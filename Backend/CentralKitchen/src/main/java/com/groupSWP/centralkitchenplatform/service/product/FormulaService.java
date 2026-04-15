package com.groupSWP.centralkitchenplatform.service.product;

import com.groupSWP.centralkitchenplatform.dto.formula.FormulaResponse;
import com.groupSWP.centralkitchenplatform.dto.formula.FormulaUpsertRequest;
import com.groupSWP.centralkitchenplatform.dto.product.ProductRequest;
import com.groupSWP.centralkitchenplatform.entities.kitchen.Formula;
import com.groupSWP.centralkitchenplatform.entities.kitchen.FormulaKey;
import com.groupSWP.centralkitchenplatform.entities.kitchen.Ingredient;
import com.groupSWP.centralkitchenplatform.entities.product.Product;
import com.groupSWP.centralkitchenplatform.repositories.product.FormulaRepository;
import com.groupSWP.centralkitchenplatform.repositories.product.IngredientRepository;
import com.groupSWP.centralkitchenplatform.repositories.product.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service quản lý nghiệp vụ Công thức nấu ăn (Formula / Recipe).
 * <p>
 * Lớp này chịu trách nhiệm xử lý mọi thao tác liên quan đến bảng {@link Formula},
 * bao gồm việc lấy công thức theo sản phẩm, lưu trữ công thức độc lập, và hỗ trợ
 * lưu trữ công thức đi kèm khi khởi tạo Sản phẩm (Product).
 * </p>
 */
@Service
@RequiredArgsConstructor
public class FormulaService {

    // Gom chung 3 Repository cần thiết vào một nhà
    private final FormulaRepository formulaRepo;
    private final ProductRepository productRepo;
    private final IngredientRepository ingredientRepo;

    // =========================================================================
    // PHẦN 1: CÁC HÀM PHỤC VỤ CHO FORMULA CONTROLLER (GỌI ĐỘC LẬP)
    // =========================================================================

    /**
     * Lấy chi tiết công thức của một sản phẩm cụ thể.
     */
    @Transactional(readOnly = true)
    public FormulaResponse getFormulaByProduct(String productId) {
        Product product = productRepo.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm: " + productId));

        List<Formula> formulas = formulaRepo.findByProduct_ProductId(productId);

        return FormulaResponse.builder()
                .productId(product.getProductId())
                .productName(product.getProductName())
                .ingredients(formulas.stream().map(f ->
                        FormulaResponse.Item.builder()
                                .ingredientId(f.getIngredient().getIngredientId())
                                .ingredientName(f.getIngredient().getName())
                                .unit(f.getIngredient().getUnit().name()) // LẤY TÊN ENUM RA (VD: "KG", "GRAM")
                                .amountNeeded(f.getAmountNeeded())
                                .build()).toList())
                .build();
    }

    /**
     * Thêm mới hoặc Cập nhật (Upsert) toàn bộ công thức cho một sản phẩm.
     * Cơ chế: Xóa sạch công thức cũ và lưu lại danh sách mới để tránh rác dữ liệu.
     */
    @Transactional
    public Map<String, Object> upsertFormula(FormulaUpsertRequest req) {
        if (req.getProductId() == null || req.getProductId().isBlank()) {
            throw new IllegalArgumentException("Mã sản phẩm không được để trống");
        }
        if (req.getIngredients() == null || req.getIngredients().isEmpty()) {
            throw new IllegalArgumentException("Nguyên liệu không được rỗng");
        }

        Product product = productRepo.findById(req.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm: " + req.getProductId()));

        // Xóa cũ và dọn đường (Flush)
        formulaRepo.deleteByProduct_ProductId(req.getProductId());
        formulaRepo.flush();

        List<Formula> formulasToSave = new ArrayList<>();
        java.util.Set<String> seenIngredients = new java.util.HashSet<>();

        for (FormulaUpsertRequest.Item item : req.getIngredients()) {
            if (item.getIngredientId() == null || item.getIngredientId().isBlank()) {
                throw new IllegalArgumentException("Mã nguyên liệu không được để trống");
            }
            if (item.getAmountNeeded() == null || item.getAmountNeeded().signum() <= 0) {
                throw new IllegalArgumentException("Số lượng cần phải lớn hơn 0");
            }

            if (!seenIngredients.add(item.getIngredientId())) {
                throw new IllegalArgumentException("Lỗi dữ liệu: Nguyên liệu " + item.getIngredientId() + " bị lặp " +
                        "lại nhiều lần!");
            }

            Ingredient ing = ingredientRepo.findById(item.getIngredientId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nguyên liệu: " + item.getIngredientId()));

            Formula f = new Formula();
            f.setId(new FormulaKey(req.getProductId(), item.getIngredientId()));
            f.setProduct(product);
            f.setIngredient(ing);
            f.setAmountNeeded(item.getAmountNeeded());

            formulasToSave.add(f);
        }

        // Lưu toàn bộ công thức mới
        List<Formula> savedFormulas = formulaRepo.saveAll(formulasToSave);

        // =====================================================================
        // 🔥 ĐÓNG GÓI DỮ LIỆU JSON ĐỂ TRẢ VỀ FRONTEND MỘT CÁCH SẠCH SẼ NHẤT
        // =====================================================================
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("productId", product.getProductId());
        response.put("productName", product.getProductName());
        response.put("message", "Lưu công thức thành công!");

        // Tạo mảng danh sách các nguyên liệu đã lưu
        List<Map<String, Object>> ingredientList = new ArrayList<>();
        for (Formula f : savedFormulas) {
            Map<String, Object> ingDetail = new java.util.HashMap<>();
            ingDetail.put("ingredientId", f.getIngredient().getIngredientId()); // Lấy ID
            ingDetail.put("ingredientName", f.getIngredient().getName());       // Lấy Tên hiển thị cho FE dễ đọc
            ingDetail.put("amountNeeded", f.getAmountNeeded());                 // Số lượng chuẩn
            ingDetail.put("unit", f.getIngredient().getUnit());                 // (Tùy chọn) Thêm đơn vị tính

            ingredientList.add(ingDetail);
        }

        response.put("formulas", ingredientList);

        return response;
    }

    /**
     * Xóa sạch công thức của một sản phẩm.
     */
    @Transactional
    public void deleteFormula(String productId) {
        // 1. Xóa sạch các thành phần nguyên liệu của công thức cũ
        formulaRepo.deleteByProduct_ProductId(productId);

        // 2. Xóa mềm (Ẩn) Sản phẩm ra khỏi danh sách kinh doanh
        Product product = productRepo.findById(productId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm cần xóa!"));

        product.setActive(false); // Tắt cờ hoạt động
        productRepo.save(product);
    }

    // =========================================================================
    // PHẦN 2: CÁC HÀM HỖ TRỢ CHO PRODUCT SERVICE (LƯU KÈM KHI TẠO PRODUCT)
    // =========================================================================

    /**
     * Lưu danh sách nguyên liệu đi kèm khi khởi tạo Sản phẩm mới.
     */
    @Transactional
    public void saveFormulas(Product product, List<ProductRequest.Formula> ingredientRequests) {
        if (ingredientRequests == null || ingredientRequests.isEmpty()) return;

        List<Formula> formulaList = ingredientRequests.stream().map(item -> {
            Ingredient ingredient = ingredientRepo.findById(item.getIngredientId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nguyên liệu: " + item.getIngredientId()));

            Formula formula = new Formula();
            FormulaKey key = new FormulaKey(product.getProductId(), ingredient.getIngredientId());

            formula.setId(key);
            formula.setProduct(product);
            formula.setIngredient(ingredient);
            formula.setAmountNeeded(item.getAmountNeeded());

            return formula;
        }).collect(Collectors.toList());

        formulaRepo.saveAll(formulaList);
    }

    /**
     * Cập nhật danh sách nguyên liệu khi chỉnh sửa Sản phẩm hiện tại.
     */
    @Transactional
    public void updateFormulas(Product product, List<ProductRequest.Formula> ingredientRequests) {
        // 1. Xóa sạch công thức cũ
        formulaRepo.deleteByProduct_ProductId(product.getProductId());

        // 2. Lưu lại cái mới (nếu có)
        if (ingredientRequests != null && !ingredientRequests.isEmpty()) {
            saveFormulas(product, ingredientRequests);
        }
    }
}