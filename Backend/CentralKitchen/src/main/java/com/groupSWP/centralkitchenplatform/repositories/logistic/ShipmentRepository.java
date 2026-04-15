package com.groupSWP.centralkitchenplatform.repositories.logistic;

import com.groupSWP.centralkitchenplatform.entities.logistic.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ShipmentRepository extends JpaRepository<Shipment, String> {
    List<Shipment> findByStatusAndDeliveredAtBefore(Shipment.ShipmentStatus status, LocalDateTime time);
    List<Shipment> findByStatus(Shipment.ShipmentStatus status);

    @Query("SELECT DISTINCT s FROM Shipment s JOIN s.orders o WHERE s.status = :status AND o.store.storeId = :storeId")
    List<Shipment> getShipmentsForStore(@Param("status") Shipment.ShipmentStatus status, @Param("storeId") String storeId);
}