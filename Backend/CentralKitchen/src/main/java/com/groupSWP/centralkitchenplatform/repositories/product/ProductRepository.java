package com.groupSWP.centralkitchenplatform.repositories.product;

import com.groupSWP.centralkitchenplatform.entities.product.Product;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, String>, JpaSpecificationExecutor<Product> {

    // 1. Hàm lấy danh sách category (Giữ nguyên)
    @Query("SELECT DISTINCT p.category.name FROM Product p WHERE p.category IS NOT NULL")
    List<String> findDistinctCategories();

    // 👉 Lấy Product KÈM THEO toàn bộ Formulas và Ingredient của nó
    @EntityGraph(attributePaths = {"formulas", "formulas.ingredient"})
    Optional<Product> findById(String id);

    List<Product> findByIsActiveTrue();

    // =========================================================
    // 🌟 CÁC HÀM THỐNG KÊ DÀNH CHO DASHBOARD FRONTEND
    // =========================================================

    // 1. Đếm sản phẩm theo trạng thái (Đang bán / Ngừng bán)
    long countByIsActive(boolean isActive);

    // 2. Đếm các sản phẩm ĐÃ CHỐT công thức (BOM)
    @Query("SELECT COUNT(p) FROM Product p WHERE p.formulas IS NOT EMPTY")
    long countProductsWithFormula();

    // 3. Đếm các sản phẩm BẢN NHÁP / CHƯA CÓ công thức
    @Query("SELECT COUNT(p) FROM Product p WHERE p.formulas IS EMPTY")
    long countProductsWithoutFormula();
}