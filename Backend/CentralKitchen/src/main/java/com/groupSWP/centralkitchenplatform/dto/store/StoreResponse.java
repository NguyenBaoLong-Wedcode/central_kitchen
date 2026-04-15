package com.groupSWP.centralkitchenplatform.dto.store;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StoreResponse {
    private String storeId; // ID đã được tạo
    private String name;
    private String address;
    private String phone;
    private String type;
    private boolean isActive;
}