package com.groupSWP.centralkitchenplatform.dto.product;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryResponse {
    private Long id; // Đã đổi thành Long cho khớp Entity
    private String name;
    private String description;
}