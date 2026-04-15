package com.groupSWP.centralkitchenplatform.dto.product;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class IngredientRequest {

    @NotBlank(message = "Tên nguyên liệu không được để trống")
    private String name;

    @NotBlank(message = "Đơn vị tính không được để trống (VD: KG, GAM, LITER...)")
    private String unit;

    @NotNull(message = "Đơn giá tiêu chuẩn không được để trống")
    @DecimalMin(value = "0.01", message = "Đơn giá (unitCost) bắt buộc phải lớn hơn 0!")
    private BigDecimal unitCost;

    @NotNull(message = "Ngưỡng tồn kho tối thiểu không được để trống")
    @Min(value = 0, message = "Ngưỡng tồn kho không được là số âm!")
    private BigDecimal minThreshold;
}