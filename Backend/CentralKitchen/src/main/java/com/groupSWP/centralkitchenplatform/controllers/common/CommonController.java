package com.groupSWP.centralkitchenplatform.controllers.common;

import com.groupSWP.centralkitchenplatform.entities.common.UnitType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/common")
public class CommonController {

    // =========================================================================
    // API CUNG CẤP DANH SÁCH ĐƠN VỊ TÍNH CHO FRONTEND ĐỔ VÀO DROPDOWN
    // =========================================================================
    @GetMapping("/units")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, List<Map<String, String>>>> getAllUnitsGrouped() {

        // 🌟 FIX: Ép Java xài LinkedHashMap để giữ nguyên thứ tự khai báo
        Map<String, List<Map<String, String>>> groupedUnits = Arrays.stream(UnitType.values())
                .collect(Collectors.groupingBy(
                        UnitType::getGroup,
                        java.util.LinkedHashMap::new, // 🌟 VŨ KHÍ BÍ MẬT NẰM Ở ĐÂY NÈ SẾP
                        Collectors.mapping(
                                unit -> Map.of("code", unit.name(), "label", unit.getLabel()),
                                Collectors.toList()
                        )
                ));

        return ResponseEntity.ok(groupedUnits);
    }
}