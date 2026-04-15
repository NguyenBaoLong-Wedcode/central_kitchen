package com.groupSWP.centralkitchenplatform.repositories.inventory;

import com.groupSWP.centralkitchenplatform.entities.kitchen.ProductionRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductionRunRepository extends JpaRepository<ProductionRun, String> {

    // Lùa tất cả các mẻ đang ở trạng thái chờ nấu (PLANNED) hoặc đang nấu (COOKING)
    List<ProductionRun> findByStatusInOrderByProductionDateDesc(List<ProductionRun.ProductionStatus> statuses);

    Optional<ProductionRun> findByRunIdAndStatus(String runId, ProductionRun.ProductionStatus status);

    // =========================================================================
    // 🗑️ [ĐÃ DỌN DẸP CODE RÁC]
    // - Đã xóa hàm `findTopWastedProductsInKitchen`.
    // - Lý do: Chuyển sang kiến trúc Order-Based, Phiếu nấu không còn gắn với 1 Món cụ thể.
    // - Báo cáo hao hụt hiện tại được lấy từ InventoryLog và ShipmentDetail.
    // =========================================================================
}