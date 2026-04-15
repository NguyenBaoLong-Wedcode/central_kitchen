package com.groupSWP.centralkitchenplatform.repositories.product;

import com.groupSWP.centralkitchenplatform.entities.kitchen.Formula;
import com.groupSWP.centralkitchenplatform.entities.kitchen.FormulaKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FormulaRepository extends JpaRepository<Formula, FormulaKey> {
    List<Formula> findByProduct_ProductId(String productId);

    void deleteByProduct_ProductId(String productId);
}