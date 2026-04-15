package com.groupSWP.centralkitchenplatform.repositories.order;

import com.groupSWP.centralkitchenplatform.entities.cart.Cart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartRepository extends JpaRepository<Cart, String> {
    // Tìm giỏ hàng theo ID Cửa hàng
    Optional<Cart> findByStore_StoreId(String storeId);
}