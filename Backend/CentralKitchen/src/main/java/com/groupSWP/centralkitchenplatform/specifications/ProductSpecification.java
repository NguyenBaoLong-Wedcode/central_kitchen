package com.groupSWP.centralkitchenplatform.specifications;

import com.groupSWP.centralkitchenplatform.entities.product.Product;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ProductSpecification {

    public static Specification<Product> filterProducts(
            String keyword,
            String categoryName, // Lọc theo tên Category (String)
            Boolean isActive,
            BigDecimal minPrice,
            BigDecimal maxPrice) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Lọc theo Keyword (tìm trong productName)
            if (StringUtils.hasText(keyword)) {
                // LOWER(productName) LIKE %keyword%
                predicates.add(cb.like(cb.lower(root.get("productName")), "%" + keyword.toLowerCase() + "%"));
            }

            // 2. Lọc theo Category Name (Relation: Product -> Category -> Name)
            if (StringUtils.hasText(categoryName)) {
                // Đi từ Product (root) -> get Category -> get Name -> so sánh LIKE
                predicates.add(cb.like(cb.lower(root.get("category").get("name")), "%" + categoryName.toLowerCase() + "%"));
            }

            // 3. Lọc theo trạng thái Active
            if (isActive != null) {
                predicates.add(cb.equal(root.get("isActive"), isActive));
            }

            // 4. Lọc khoảng giá (Min - Max)
            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("sellingPrice"), minPrice));
            }
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("sellingPrice"), maxPrice));
            }

            // Kết hợp tất cả điều kiện bằng AND
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}