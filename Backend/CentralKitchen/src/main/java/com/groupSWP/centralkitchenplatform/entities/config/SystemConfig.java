package com.groupSWP.centralkitchenplatform.entities.config;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.groupSWP.centralkitchenplatform.entities.auth.SystemUser;
import com.groupSWP.centralkitchenplatform.entities.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "system_configs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class SystemConfig extends BaseEntity {
    @Id
    private String configKey;
    private String configValue;
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    @JsonIgnore
    private SystemUser updatedBy;
}
