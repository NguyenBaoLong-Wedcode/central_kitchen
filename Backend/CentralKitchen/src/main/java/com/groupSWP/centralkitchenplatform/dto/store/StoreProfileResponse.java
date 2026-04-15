package com.groupSWP.centralkitchenplatform.dto.store;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreProfileResponse {
    private String name;
    private String address;
    private String phone;
    private boolean isActive;
}