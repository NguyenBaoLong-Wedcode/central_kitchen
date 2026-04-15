package com.groupSWP.centralkitchenplatform.repositories.store;

import com.groupSWP.centralkitchenplatform.entities.auth.Store;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface StoreRepository extends JpaRepository<Store, String> {

    Optional<Store> findByAccount_Username(String username);
    // Tìm các cửa hàng đang Mở cửa (Active) và Bị trống quản lý (account IS NULL)
    @Query("SELECT s FROM Store s WHERE s.isActive = true AND s.account IS NULL")
    List<Store> findEmptyStores();
}
