package com.groupSWP.centralkitchenplatform.repositories.inventory;

import com.groupSWP.centralkitchenplatform.entities.kitchen.Ingredient;
import com.groupSWP.centralkitchenplatform.entities.procurement.ImportItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ImportItemRepository extends JpaRepository<ImportItem, Long> {

    // 🔥 UPDATE V2.2: TÌM CÁC LÔ CÒN HÀNG (remainingQuantity > 0), SẮP XẾP TỪ CŨ ĐẾN MỚI
    List<ImportItem> findByIngredientAndRemainingQuantityGreaterThanOrderByIdAsc(
            Ingredient ingredient,
            BigDecimal minQty
    );
}