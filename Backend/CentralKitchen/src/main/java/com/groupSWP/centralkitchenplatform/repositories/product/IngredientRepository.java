package com.groupSWP.centralkitchenplatform.repositories.product;

import com.groupSWP.centralkitchenplatform.entities.kitchen.Ingredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IngredientRepository extends JpaRepository<Ingredient, String> {
    boolean existsByNameIgnoreCase(String name);
}