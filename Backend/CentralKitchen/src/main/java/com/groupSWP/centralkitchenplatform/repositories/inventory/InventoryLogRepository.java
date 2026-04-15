package com.groupSWP.centralkitchenplatform.repositories.inventory;

import com.groupSWP.centralkitchenplatform.dto.inventory.StocktakeHistoryProjection; // 🌟 Gắn sẵn Import DTO (Sếp sẽ tạo ở bước sau)
import com.groupSWP.centralkitchenplatform.entities.kitchen.InventoryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface InventoryLogRepository extends JpaRepository<InventoryLog, Long> {
    // Đếm số lần lệch kho
    @Query("SELECT COUNT(l) FROM InventoryLog l WHERE l.createdAt BETWEEN :startDate AND :endDate AND l.note LIKE '%Hao hụt kiểm kê%'")
    long countStocktakeDiscrepancies(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    // Lấy chi tiết lịch sử lệch kho
    @Query("SELECT l FROM InventoryLog l JOIN FETCH l.ingredient WHERE l.createdAt BETWEEN :startDate AND :endDate AND l.note LIKE '%Hao hụt kiểm kê%' ORDER BY l.createdAt DESC")
    List<InventoryLog> findStocktakeLogs(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    // =========================================================
    // 🌟 TÍNH NĂNG MỚI: API LẤY LỊCH SỬ GOM NHÓM THEO ĐỢT KIỂM KÊ
    // =========================================================
    @Query("SELECT l.referenceCode as sessionCode, MIN(l.createdAt) as stocktakeDate, " +
            "COUNT(DISTINCT l.ingredient.id) as totalIngredientsChanged, " +
            "SUM(l.quantityDeducted) as totalQuantityVariance " +
            "FROM InventoryLog l " +
            "WHERE l.referenceCode LIKE 'KK-%' " +
            "GROUP BY l.referenceCode " +
            "ORDER BY MIN(l.createdAt) DESC")
    List<StocktakeHistoryProjection> getStocktakeHistorySummary();

    // 🌟 Hàm phụ trợ: Lấy chi tiết các món bị lệch trong 1 Đợt (Dành cho chức năng Xem chi tiết)
    List<InventoryLog> findByReferenceCode(String referenceCode);
}