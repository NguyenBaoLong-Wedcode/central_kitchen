package com.groupSWP.centralkitchenplatform.repositories.order;

import com.groupSWP.centralkitchenplatform.entities.cart.CartItem;
import com.groupSWP.centralkitchenplatform.entities.cart.CartItemKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, CartItemKey> {

    // Lấy toàn bộ món hàng đang có trong giỏ
    List<CartItem> findByCart_CartId(String cartId);

    // 🌟 TỐI ƯU HÓA: Dọn sạch giỏ hàng chỉ bằng 1 câu lệnh SQL duy nhất (Tránh lỗi N+1 Delete)
    @Modifying
    @Query("DELETE FROM CartItem c WHERE c.cart.cartId = :cartId")
    void deleteByCart_CartId(@Param("cartId") String cartId);
}