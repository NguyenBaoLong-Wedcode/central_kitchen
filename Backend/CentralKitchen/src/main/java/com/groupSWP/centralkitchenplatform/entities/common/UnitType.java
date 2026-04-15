package com.groupSWP.centralkitchenplatform.entities.common;

import com.fasterxml.jackson.annotation.JsonCreator;
import lombok.Getter;

@Getter
public enum UnitType {

    // =================================================================
    // 1. NHÓM ĐƠN VỊ GỐC (BASE UNITS) - Trữ kho & Nấu ăn (BOM)
    // (BẮT BUỘC nhỏ nhất, không chia cắt để chống sai số)
    // =================================================================
    G("Gram", "Trọng lượng"),
    ML("Millilit", "Thể tích"),
    CAI("Cái", "Đơn vị đếm"),
    TRAI("Trái", "Đơn vị đếm"),
    CU("Củ", "Đơn vị đếm"),
    CON("Con", "Đơn vị đếm"), // Phổ biến VN: 1 con gà, 1 con cá lóc
    LA("Lá", "Đơn vị đếm"),   // Phổ biến VN: Lá chanh, lá dứa, lá chuối

    // =================================================================
    // 2. NHÓM ĐƠN VỊ NHẬP KHO (PROCUREMENT) - Mua sỉ từ nhà cung cấp
    // =================================================================
    KG("Kilogram", "Trọng lượng"),
    L("Lít", "Thể tích"),
    LON("Lon", "Đóng gói"),
    HOP("Hộp", "Đóng gói"),
    CHAI("Chai", "Đóng gói"),
    GOI("Gói", "Đóng gói"),
    BICH("Bịch", "Đóng gói"), // VN hay dùng: Bịch nilon, bịch tương
    VI("Vỉ", "Đóng gói"),
    THUNG("Thùng", "Đóng gói"),
    BAO("Bao", "Đóng gói"),
    CAN("Can", "Đóng gói"),   // VN hay dùng: Can dầu ăn 5L, can nước mắm
    BINH("Bình", "Đóng gói"), // VN hay dùng: Bình nước 20L, bình gas
    KET("Két", "Đóng gói"),   // VN hay dùng: Két bia, két nước ngọt
    BO("Bó", "Đơn vị đếm"),   // VN hay dùng: Bó rau muống, bó sả
    NAI("Nải", "Đơn vị đếm"), // VN hay dùng: Nải chuối

    // =================================================================
    // 3. NHÓM ĐƠN VỊ BÁN (SALES UNITS) - Bán ra cho Cửa hàng / Khách
    // =================================================================
    TO("Tô", "Đơn vị bán"),
    DIA("Dĩa", "Đơn vị bán"),
    LY("Ly", "Đơn vị bán"),
    PHAN("Phần", "Đơn vị bán"),
    COMBO("Combo", "Đơn vị bán"),
    MET("Mẹt", "Đơn vị bán"),  // Phổ biến VN: Mẹt bún đậu, mẹt heo tộc
    THO("Thố", "Đơn vị bán"),  // Phổ biến VN: Cơm thố, mỳ thố
    NOI("Nồi", "Đơn vị bán"),  // Phổ biến VN: Nồi lẩu
    CUON("Cuốn", "Đơn vị bán"),// Phổ biến VN: Gỏi cuốn, bò bía
    XIEN("Xiên", "Đơn vị bán"); // Phổ biến VN: Thịt xiên nướng

    private final String label;
    private final String group;

    UnitType(String label, String group) {
        this.label = label;
        this.group = group;
    }

    @JsonCreator
    public static UnitType from(String value) {
        if (value == null) return null;
        return UnitType.valueOf(value.trim().toUpperCase());
    }

    // =================================================================
    // 🔥 TUYỆT CHIÊU: HÀM KIỂM TRA ĐƠN VỊ GỐC CHO KHO (INGREDIENT)
    // =================================================================
    public boolean isBaseUnit() {
        return this == G || this == ML || this == CAI || this == TRAI || this == CU || this == CON || this == LA;
    }

    // =================================================================
    // 🔥 TUYỆT CHIÊU: HÀM KIỂM TRA ĐƠN VỊ BÁN CHO CỬA HÀNG (PRODUCT)
    // =================================================================
    public boolean isSalesUnit() {
        return this == TO || this == DIA || this == LY || this == PHAN || this == COMBO
                || this == MET || this == THO || this == NOI || this == CUON || this == XIEN
                || this == CHAI || this == LON || this == HOP || this == CAI; // Cho phép bán lẻ nước suối, lon nước ngọt
    }
}