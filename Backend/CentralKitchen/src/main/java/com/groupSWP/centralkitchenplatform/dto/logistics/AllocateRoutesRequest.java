package com.groupSWP.centralkitchenplatform.dto.logistics;

import lombok.Data;

import java.time.LocalDate;

@Data
public class AllocateRoutesRequest {
    private LocalDate deliveryDate;     // null -> default today
    private Integer maxOrdersPerTrip;   // null -> default 10
    private Integer maxUrgentPerTrip;   // null -> default 2
}