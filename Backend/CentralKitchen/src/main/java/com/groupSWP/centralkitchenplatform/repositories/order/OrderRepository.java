package com.groupSWP.centralkitchenplatform.repositories.order;

import com.groupSWP.centralkitchenplatform.entities.logistic.Order;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.groupSWP.centralkitchenplatform.dto.analytics.ProductReportDto;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, String> {

    // =========================================================================
    // 🌟 ĐÃ NÂNG CẤP THUẬT TOÁN GOM ĐƠN (3 CẤP ĐỘ ƯU TIÊN)
    // Cấp 0: COMPENSATION (Sự cố thiếu hàng - Nấu đền bù ngay lập tức)
    // Cấp 1: URGENT (Khẩn cấp / KCAP - Nấu sau sự cố)
    // Cấp 2: STANDARD (Bình thường - Thả trôi xuống cuối)
    // =========================================================================
    @Query("SELECT o FROM Order o WHERE o.status = 'NEW' " +
            "ORDER BY CASE " +
            "WHEN o.orderType = 'COMPENSATION' THEN 0 " +
            "WHEN o.orderType = 'URGENT' THEN 1 " +
            "ELSE 2 END, o.createdAt ASC")
    List<Order> findOrdersToAggregate();

    // Các hàm cũ của Sếp giữ nguyên bên dưới...
    List<Order> findByStore_StoreIdOrderByCreatedAtDesc(String storeId);
    List<Order> findByStatus(Order.OrderStatus status);
    List<Order> findByStatusAndOrderItems_Product_ProductId(Order.OrderStatus status, String productId);
    List<Order> findByStore_StoreId(String storeId);
    List<Order> findByCreatedAtGreaterThanEqualAndStatusNot(LocalDateTime startTime, Order.OrderStatus status);
    boolean existsByShipment_ShipmentIdAndStatusNot(String shipmentId, Order.OrderStatus status);

    @EntityGraph(attributePaths = {"orderItems", "orderItems.product", "store"})
    List<Order> findByStatusAndShipmentIsNull(Order.OrderStatus status);

    List<Order> findByStatusAndShippingStartTimeBefore(Order.OrderStatus status, LocalDateTime time);

    @Query("SELECT o FROM Order o WHERE o.createdAt >= :startDate AND o.createdAt <= :endDate " +
            "AND o.status IN ('SHIPPING', 'DELIVERED', 'PARTIAL_RECEIVED', 'DONE')")
    List<Order> findValidOrdersBetweenDates(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT new com.groupSWP.centralkitchenplatform.dto.analytics.ProductReportDto(" +
            "p.productId, p.productName, SUM(oi.quantity), SUM(oi.quantity * oi.priceAtOrder)) " +
            "FROM OrderItem oi JOIN oi.order o JOIN oi.product p " +
            "WHERE o.createdAt >= :startDate AND o.createdAt <= :endDate " +
            "AND o.status IN ('SHIPPING', 'DELIVERED', 'PARTIAL_RECEIVED', 'DONE') " +
            "GROUP BY p.productId, p.productName " +
            "ORDER BY SUM(oi.quantity) DESC")
    List<ProductReportDto> findTopExportedProducts(
            @Param("startDate") java.time.LocalDateTime startDate,
            @Param("endDate") java.time.LocalDateTime endDate,
            Pageable pageable);

    @EntityGraph(attributePaths = {"orderItems", "orderItems.product", "store"})
    Optional<Order> findWithItemsByOrderId(String orderId);
}