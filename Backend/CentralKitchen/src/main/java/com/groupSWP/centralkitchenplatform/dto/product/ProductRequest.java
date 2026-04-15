package com.groupSWP.centralkitchenplatform.dto.product;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.math.BigDecimal; // Import cái này
import java.util.List;

@Data
public class ProductRequest {
    @NotBlank(message = "productId không được để trống")
    private String productId;
    private String productName;
    private Long categoryId;
    private BigDecimal sellingPrice; // Sửa ở đây
    private String baseUnit;
    private Boolean isActive;
    private List<Formula> ingredients;

    @Data
    public static class Formula {
        private String ingredientId;
        private BigDecimal amountNeeded; // Định lượng nguyên liệu có thể giữ Double hoặc đổi sang BigDecimal tùy bạn
    }
}