package com.groupSWP.centralkitchenplatform.repositories.system;

import com.groupSWP.centralkitchenplatform.entities.config.SystemConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SystemConfigRepository extends JpaRepository<SystemConfig, String> {
    Optional<SystemConfig> findByConfigKey(String configKey);
}