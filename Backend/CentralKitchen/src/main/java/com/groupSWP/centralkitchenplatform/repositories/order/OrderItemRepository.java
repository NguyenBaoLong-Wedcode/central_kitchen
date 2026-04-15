package com.groupSWP.centralkitchenplatform.repositories.order;

import com.groupSWP.centralkitchenplatform.entities.logistic.OrderItem;
import com.groupSWP.centralkitchenplatform.entities.logistic.OrderItemKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, OrderItemKey> {
    // Tương tự, để trống luôn cho nó gọn gàng!
    List<OrderItem> findByOrder_OrderId(String orderId);
}