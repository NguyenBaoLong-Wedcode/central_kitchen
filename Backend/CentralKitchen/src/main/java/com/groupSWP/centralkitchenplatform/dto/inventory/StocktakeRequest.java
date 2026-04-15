package com.groupSWP.centralkitchenplatform.dto.inventory;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class StocktakeRequest {

    @NotNull(message = "Danh sách kiểm kê không được để trống")
    private List<StocktakeItem> items;

    @Data
    public static class StocktakeItem {
        @NotBlank(message = "Mã nguyên liệu không được để trống")
        private String ingredientId;

        @NotNull(message = "Số lượng thực tế không được để trống")
        @Min(value = 0, message = "Số lượng thực tế không được âm")
        private BigDecimal actualQty;

        private String note; // Ví dụ: "Chuột cắn rách bao", "Thịt teo do rã đông"

        private boolean forceConfirm; // FE truyền false mặc định, nếu FE tick chọn thì truyền true
    }
}