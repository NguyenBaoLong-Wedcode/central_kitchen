package com.groupSWP.centralkitchenplatform.dto.order;

import lombok.Data;

@Data
public class ConfirmReceiptRequest {
    private String note; // optional: nếu không lưu DB thì chỉ để log
}