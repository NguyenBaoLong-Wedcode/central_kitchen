package com.groupSWP.centralkitchenplatform.dto.store;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreProfileUpdateRequest {
    private String name;
    private String address;
    private String phone;
}