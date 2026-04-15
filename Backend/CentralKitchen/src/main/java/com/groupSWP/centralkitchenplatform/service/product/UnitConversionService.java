package com.groupSWP.centralkitchenplatform.service.product;

import com.groupSWP.centralkitchenplatform.dto.manager.ConversionRequest;
import com.groupSWP.centralkitchenplatform.entities.kitchen.Ingredient;
import com.groupSWP.centralkitchenplatform.entities.kitchen.UnitConversion;
import com.groupSWP.centralkitchenplatform.entities.common.UnitType;
import com.groupSWP.centralkitchenplatform.repositories.product.IngredientRepository;
import com.groupSWP.centralkitchenplatform.repositories.product.UnitConversionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Service quản lý logic nghiệp vụ quy đổi đơn vị (Unit Conversion Logic) cho nguyên vật liệu.
 * <p>
 * Trong mô hình Bếp Trung Tâm, đây là lớp xử lý cực kỳ quan trọng giúp thống nhất dữ liệu giữa
 * khâu Thu mua (thường dùng Thùng, Bao, Két) và khâu Sản xuất/Sơ chế (thường dùng Kg, Gram, Lít).
 * Service này đảm bảo rằng mọi biến động kho bãi đều được đưa về một "đơn vị cơ sở" duy nhất
 * để tính toán giá vốn và tồn kho chính xác nhất.
 * </p>
 * <p>
 * <b>Tính toàn vẹn dữ liệu:</b> Lớp này áp dụng các quy tắc kiểm soát chặt chẽ để ngăn chặn
 * việc cấu hình sai lệch như hệ số bằng không hoặc cấu hình đơn vị trùng lặp. Việc sử dụng
 * {@link BigDecimal} xuyên suốt quá trình tính toán giúp hệ thống tránh được các lỗi làm tròn
 * số học thường gặp, từ đó bảo vệ tính chính xác của các báo cáo tài chính kho.
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0
 * @since 2026-03-29
 */
@Service
@RequiredArgsConstructor
public class UnitConversionService {

    private final UnitConversionRepository conversionRepository;
    private final IngredientRepository ingredientRepository;

    /**
     * Tạo một thiết lập quy đổi đơn vị mới cho nguyên liệu.
     * <p>
     * Phương thức thực hiện hàng loạt các bước kiểm tra (Validation) từ tồn tại thực thể,
     * tính hợp lệ của đơn vị Enum cho đến các logic chặn lỗi chia cho 0. Quy trình này
     * đảm bảo rằng mỗi nguyên liệu chỉ có một lộ trình quy đổi duy nhất cho từng loại đơn vị.
     * </p>
     *
     * @param request Đối tượng {@link ConversionRequest} chứa thông tin nguyên liệu, đơn vị và hệ số.
     * @return Thực thể {@link UnitConversion} đã được lưu thành công vào cơ sở dữ liệu.
     * @throws RuntimeException Nếu dữ liệu đầu vào vi phạm các quy tắc nghiệp vụ về đơn vị hoặc hệ số.
     */
    @Transactional
    public UnitConversion createConversion(ConversionRequest request) {
        // 1. Kiểm tra Nguyên liệu có tồn tại không?
        Ingredient ingredient = ingredientRepository.findById(request.getIngredientId())
                .orElseThrow(() -> new RuntimeException("Lỗi: Không tìm thấy nguyên liệu có ID: " + request.getIngredientId()));

        // 2. Validate Enum Unit (Chống nhập bậy)
        UnitType unitToConvert;
        try {
            // Thêm trim() và toUpperCase() để nhỡ Frontend truyền khoảng trắng hoặc chữ thường
            unitToConvert = UnitType.valueOf(request.getUnitName().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Lỗi: Đơn vị '" + request.getUnitName() + "' không hợp lệ!");
        }

        // 👉 ĐIỂM FIX 1: Chặn hệ số quy đổi <= 0 (Cứu sống luồng Nhập kho khỏi lỗi chia cho 0)
        if (request.getConversionFactor() == null || request.getConversionFactor().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Lỗi: Hệ số quy đổi phải lớn hơn 0!");
        }

        // 👉 ĐIỂM FIX 2: Chặn tạo luật quy đổi trùng với đơn vị gốc
        if (unitToConvert == ingredient.getUnit()) {
            throw new RuntimeException("Lỗi: Không thể tạo quy đổi trùng với đơn vị gốc (" + ingredient.getUnit().name() + ") của nguyên liệu!");
        }

        // 3. Chặn trùng lặp (1 Nguyên liệu không thể có 2 công thức cho cùng 1 đơn vị)
        if (conversionRepository.existsByIngredientAndUnit(ingredient, unitToConvert)) {
            throw new RuntimeException("Lỗi: Quy đổi cho đơn vị '" + request.getUnitName() + "' đã tồn tại cho nguyên liệu này rồi!");
        }

        // 4. Tạo và Lưu
        UnitConversion conversion = UnitConversion.builder()
                .ingredient(ingredient)
                .unit(unitToConvert)
                .conversionFactor(request.getConversionFactor())
                .build();

        return conversionRepository.save(conversion);
    }

    /**
     * Hàm tính toán quy đổi giá trị thực tế về đơn vị cơ sở.
     * <p>
     * Được sử dụng rộng rãi trong các module Nhập kho và Kiểm kê. Phương thức sẽ tra cứu
     * công thức tương ứng và thực hiện phép nhân giữa số lượng đầu vào với hệ số quy đổi.
     * </p>
     *
     * @param ingredient: Nguyên liệu (Gà)
     * @param inputUnit: Đơn vị nhập (Thùng)
     * @param quantity: Số lượng nhập (5)
     * @return Số lượng đã quy đổi ra đơn vị gốc (100)
     */
    public BigDecimal convertToBaseUnit(Ingredient ingredient, UnitType inputUnit, BigDecimal quantity) {
        // 1. Nếu đơn vị nhập vào trùng với đơn vị gốc (VD: Nhập KG, gốc là KG)
        if (inputUnit == ingredient.getUnit()) {
            return quantity;
        }

        // 2. Tìm công thức trong DB
        UnitConversion conversion = conversionRepository.findByIngredientAndUnit(ingredient, inputUnit)
                .orElseThrow(() -> new RuntimeException(
                        "Lỗi: Không tìm thấy công thức quy đổi từ '" + inputUnit +
                                "' sang '" + ingredient.getUnit() + "' cho nguyên liệu: " + ingredient.getName()));

        // 3. Tính toán: Số lượng * Hệ số (Factor)
        return quantity.multiply(conversion.getConversionFactor());
    }

    // ==========================================================
    // CÁC HÀM MỚI THÊM: READ - UPDATE - DELETE
    // ==========================================================

    /**
     * Lấy danh sách tất cả các cấu hình quy đổi đơn vị của một nguyên liệu cụ thể.
     *
     * @param ingredientId Mã định danh của nguyên liệu cần tra cứu.
     * @return Danh sách các thực thể {@link UnitConversion} liên quan.
     */
    public List<UnitConversion> getConversionsByIngredient(String ingredientId) {
        // Có thể check thêm xem ingredientId có tồn tại không nếu cẩn thận,
        // nhưng hàm Repository trả về List rỗng nếu không có cũng không sao.
        return conversionRepository.findByIngredient_IngredientId(ingredientId);
    }

    /**
     * Cập nhật hệ số quy đổi cho một cấu hình hiện có.
     * <p>
     * Thao tác này được bọc trong giao dịch để đảm bảo tính nhất quán. Chỉ cho phép
     * thay đổi giá trị hệ số (factor), các thông tin về đơn vị và nguyên liệu được giữ nguyên
     * để tránh làm sai lệch các phiếu nhập kho cũ.
     * </p>
     *
     * @param id Mã định danh của công thức quy đổi.
     * @param newFactor Giá trị hệ số quy đổi mới (phải lớn hơn 0).
     * @return Thực thể sau khi đã được cập nhật và lưu trữ.
     */
    @Transactional
    public UnitConversion updateConversion(Long id, BigDecimal newFactor) {
        UnitConversion conversion = conversionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lỗi: Không tìm thấy công thức quy đổi có ID: " + id));

        // Vẫn phải giữ chốt chặn số 0
        if (newFactor == null || newFactor.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Lỗi: Hệ số quy đổi mới phải lớn hơn 0!");
        }

        conversion.setConversionFactor(newFactor);
        return conversionRepository.save(conversion);
    }

    /**
     * Xóa bỏ hoàn toàn một cấu hình quy đổi đơn vị khỏi hệ thống.
     *
     * @param id Mã định danh của công thức quy đổi cần loại bỏ.
     * @throws RuntimeException Nếu ID không tồn tại trong hệ thống.
     */
    @Transactional
    public void deleteConversion(Long id) {
        if (!conversionRepository.existsById(id)) {
            throw new RuntimeException("Lỗi: Không tìm thấy công thức quy đổi có ID: " + id);
        }
        conversionRepository.deleteById(id);
    }
}