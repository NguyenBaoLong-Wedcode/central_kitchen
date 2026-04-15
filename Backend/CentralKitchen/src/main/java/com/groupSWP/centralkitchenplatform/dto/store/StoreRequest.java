package com.groupSWP.centralkitchenplatform.dto.store;

import lombok.Data;

@Data
public class StoreRequest {
    private String name;
    private String address;
    private String phone;
    private String type; // KIOSK, FLAGSHIP...
}