package com.groupSWP.centralkitchenplatform.controllers.common;

import com.groupSWP.centralkitchenplatform.entities.common.UnitType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/units")
public class UnitController {

    /**
     * API Cung cấp danh sách từ điển Đơn Vị Tính cho Frontend
     * Có kèm theo cờ isBase và isSales để FE tự động lọc Dropdown
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllUnits() {
        List<Map<String, Object>> unitDictionary = Arrays.stream(UnitType.values())
                .map(unit -> Map.<String, Object>of(
                        "value", unit.name(),           // Mã không dấu: "THUNG", "G", "PHAN"
                        "label", unit.getLabel(),       // Tên có dấu: "Thùng", "Gram", "Phần"
                        "group", unit.getGroup(),       // Nhóm: "Đóng gói", "Trọng lượng"
                        "isBase", unit.isBaseUnit(),    // Cờ báo hiệu: true nếu là Đơn vị gốc (Kho)
                        "isSales", unit.isSalesUnit()   // Cờ báo hiệu: true nếu là Đơn vị bán (Menu)
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(unitDictionary);
    }
}