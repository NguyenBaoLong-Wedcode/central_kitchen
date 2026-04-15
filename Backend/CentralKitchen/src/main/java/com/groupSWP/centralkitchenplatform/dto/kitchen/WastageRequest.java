package com.groupSWP.centralkitchenplatform.dto.kitchen;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class WastageRequest {

    @NotBlank(message = "Vui lòng cung cấp mã mẻ nấu.")
    private String runId;

    @NotNull(message = "Vui lòng nhập số lượng hao hụt.")
    @Positive(message = "Số lượng hao hụt phải lớn hơn 0.")
    private BigDecimal wasteQty;

    @NotBlank(message = "Vui lòng nhập nguyên nhân hao hụt (VD: Cháy khét, đổ vỡ, sai công thức...).")
    private String reason;
}