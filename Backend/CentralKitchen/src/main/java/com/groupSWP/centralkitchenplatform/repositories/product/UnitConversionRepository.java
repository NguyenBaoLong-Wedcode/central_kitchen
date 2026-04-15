package com.groupSWP.centralkitchenplatform.repositories.product;

import com.groupSWP.centralkitchenplatform.entities.kitchen.Ingredient;
import com.groupSWP.centralkitchenplatform.entities.kitchen.UnitConversion;
import com.groupSWP.centralkitchenplatform.entities.common.UnitType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public interface UnitConversionRepository extends JpaRepository<UnitConversion, Long> {
    // Tìm xem nguyên liệu này đã có quy đổi đơn vị này chưa?
    // VD: Dầu ăn đã có quy đổi "THÙNG" chưa?
    boolean existsByIngredientAndUnit(Ingredient ingredient, UnitType unit);
    // Tìm công thức quy đổi cụ thể (VD: Gà + Thùng -> ra record quy đổi)
    Optional<UnitConversion> findByIngredientAndUnit(Ingredient ingredient, UnitType unit);
    // Thêm hàm lấy toàn bộ danh sách quy đổi của 1 nguyên liệu
    List<UnitConversion> findByIngredient_IngredientId(String ingredientId);
}