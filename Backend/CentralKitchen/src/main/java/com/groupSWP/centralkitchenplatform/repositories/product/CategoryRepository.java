package com.groupSWP.centralkitchenplatform.repositories.product;

import com.groupSWP.centralkitchenplatform.entities.product.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    // Kiểm tra trùng tên khi Tạo mới
    boolean existsByName(String name);

    // Kiểm tra trùng tên khi Cập nhật (Ngoại trừ chính cái ID đang sửa)
    boolean existsByNameAndIdNot(String name, Long id);
}