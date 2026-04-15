package com.groupSWP.centralkitchenplatform.repositories.logistic;

import com.groupSWP.centralkitchenplatform.entities.logistic.ShipmentDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import com.groupSWP.centralkitchenplatform.dto.analytics.ProductReportDto;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface ShipmentDetailRepository extends JpaRepository<ShipmentDetail, Long> {
    // TÌM TOP MÓN BỊ SỰ CỐ GIAO HÀNG (Giao thiếu, móp méo hộp...)
    @Query("SELECT new com.groupSWP.centralkitchenplatform.dto.analytics.ProductReportDto(" +
            "p.productId, p.productName, SUM(CAST(sd.expectedQuantity - sd.receivedQuantity AS long)), " + // Khúc trừ này giữ lại CAST xíu cho chắc cối
            "SUM((sd.expectedQuantity - sd.receivedQuantity) * p.sellingPrice)) " +
            "FROM ShipmentDetail sd JOIN sd.shipment s JOIN sd.product p " +
            "WHERE s.createdAt >= :startDate AND s.createdAt <= :endDate " +
            "AND sd.expectedQuantity > sd.receivedQuantity " +
            "GROUP BY p.productId, p.productName " +
            "ORDER BY SUM(sd.expectedQuantity - sd.receivedQuantity) DESC")
    List<ProductReportDto> findTopIssueProductsInShipment(
            @Param("startDate") java.time.LocalDateTime startDate,
            @Param("endDate") java.time.LocalDateTime endDate,
            Pageable pageable);

    // Lấy danh sách các món bị giao thiếu
    @Query("SELECT sd FROM ShipmentDetail sd JOIN FETCH sd.shipment s WHERE sd.expectedQuantity > sd.receivedQuantity AND s.createdAt BETWEEN :startDate AND :endDate")
    List<ShipmentDetail> findMissingShipmentDetails(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
}
