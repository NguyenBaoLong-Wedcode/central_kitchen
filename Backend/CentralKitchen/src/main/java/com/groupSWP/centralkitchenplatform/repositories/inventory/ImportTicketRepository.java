package com.groupSWP.centralkitchenplatform.repositories.inventory;

import com.groupSWP.centralkitchenplatform.entities.procurement.ImportTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ImportTicketRepository extends JpaRepository<ImportTicket, String> {
    List<ImportTicket> findAllByOrderByCreatedAtDesc();
    List<ImportTicket> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime startDate, LocalDateTime endDate);

    // Tính tổng tiền đi chợ
    @Query("SELECT COALESCE(SUM(t.totalAmount), 0) FROM ImportTicket t WHERE t.status = 'COMPLETED' AND t.createdAt BETWEEN :startDate AND :endDate")
    BigDecimal sumTotalImportAmount(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
}