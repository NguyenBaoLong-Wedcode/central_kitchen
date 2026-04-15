package com.groupSWP.centralkitchenplatform.dto.order;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConfirmReceiptResponse {
    private String orderId;
    private String oldStatus;
    private String newStatus;
    private boolean stockUpdated;
    private boolean shipmentCompleted;
    private String message;
}