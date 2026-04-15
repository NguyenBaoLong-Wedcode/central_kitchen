package com.groupSWP.centralkitchenplatform.controllers.system;

import com.groupSWP.centralkitchenplatform.dto.config.SystemConfigRequest;
import com.groupSWP.centralkitchenplatform.entities.auth.SystemUser;
import com.groupSWP.centralkitchenplatform.entities.config.SystemConfig;
import com.groupSWP.centralkitchenplatform.repositories.auth.SystemUserRepository;
import com.groupSWP.centralkitchenplatform.service.system.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controller quản lý luồng cấu hình hệ thống (System Configuration Management) dành cho cấp Quản lý.
 * <p>
 * Lớp này đóng vai trò là "bảng điều khiển" trung tâm, cho phép các nhà quản trị điều chỉnh linh hoạt
 * các tham số vận hành của toàn bộ nền tảng Central Kitchen mà không cần can thiệp vào mã nguồn.
 * Các cấu hình này bao gồm các hằng số về thời gian (giờ đóng/mở kho), các tham số tài chính
 * (thuế VAT, phí giao hàng khẩn cấp), và các ngưỡng giới hạn tồn kho an toàn.
 * </p>
 * <p>
 * <b>Tính linh hoạt và Bảo mật:</b> Hệ thống đảm bảo mọi thay đổi cấu hình đều được thực hiện
 * thông qua các giao diện lập trình an toàn, hỗ trợ đồng bộ hóa tức thì giữa Server và Frontend.
 * Đặc biệt, cơ chế lưu vết (Audit Trail) được tích hợp sẵn giúp ghi lại chính xác danh tính
 * của người thực hiện thay đổi, đảm bảo tính minh bạch và trách nhiệm giải trình trong quản lý.
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0
 * @since 2026-03-29
 */
@RestController
@RequestMapping("/api/manager/configs")
@RequiredArgsConstructor
public class SystemConfigController {

    private final SystemConfigService systemConfigService;
    private final SystemUserRepository systemUserRepository;

    /**
     * API Lấy toàn bộ tham số cấu hình hệ thống.
     * <p>Truy xuất danh sách chi tiết các giá trị cài đặt mặc định của hệ thống.</p>
     * <p>
     * Dữ liệu trả về ở định dạng danh sách thực thể đầy đủ, bao gồm cả mô tả chi tiết và
     * thời gian cập nhật cuối cùng. Đây là nguồn dữ liệu chính cho các màn hình quản trị
     * cấu hình phức tạp, nơi cần hiển thị đầy đủ ngữ nghĩa của từng tham số.
     * </p>
     *
     * @return Phản hồi HTTP 200 chứa danh sách các đối tượng {@link SystemConfig}.
     */
    @GetMapping
    public ResponseEntity<List<SystemConfig>> getAllConfigs() {
        return ResponseEntity.ok(systemConfigService.getAllConfigs());
    }

    /**
     * API Lấy toàn bộ cấu hình dưới dạng cặp Key-Value.
     * <p>Phục vụ cho Frontend ánh xạ nhanh cấu hình vào bộ nhớ đệm (Cache/Store) để sử dụng.</p>
     * <p>
     * Phương thức này thực hiện chuyển đổi cấu trúc dữ liệu từ List sang Map để tối ưu hóa
     * việc tra cứu phía Client. Frontend có thể sử dụng Map này để lấy nhanh các giá trị
     * cấu hình theo tên khóa (Key) mà không cần duyệt qua toàn bộ danh sách, giúp tăng
     * tốc độ xử lý và render giao diện.
     * </p>
     *
     * @return Phản hồi HTTP 200 chứa Map các thông số cấu hình.
     */
    @GetMapping("/map")
    public ResponseEntity<Map<String, String>> getAllConfigsAsMap() {
        List<SystemConfig> configs = systemConfigService.getAllConfigs();
        Map<String, String> configMap = configs.stream()
                .collect(Collectors.toMap(SystemConfig::getConfigKey, SystemConfig::getConfigValue));
        return ResponseEntity.ok(configMap);
    }

    /**
     * API Cập nhật một tham số cấu hình hệ thống.
     * <p>
     * Chỉnh sửa các giá trị vận hành như (Giờ đóng cửa, Phụ phí giao gấp...).
     * Có lưu vết tài khoản (Người thực hiện) thông qua Token.
     * </p>
     * <p>
     * <b>Quy trình xử lý:</b> Khi có yêu cầu thay đổi, hệ thống sẽ tự động trích xuất thông tin
     * định danh từ {@link Principal} để xác định người chịu trách nhiệm. Sau đó, thông tin này
     * được chuyển xuống tầng Service để cập nhật giá trị mới vào cơ sở dữ liệu, đồng thời
     * cập nhật lại các chỉ mục liên quan để đảm bảo tính nhất quán trên toàn hệ thống.
     * </p>
     *
     * @param configKey Khóa định danh của tham số cấu hình.
     * @param request   Payload chứa giá trị mới và mô tả cập nhật.
     * @param principal Đối tượng bảo mật chứa danh tính người cập nhật.
     * @return Phản hồi HTTP 200 chứa thông số cấu hình sau khi sửa đổi.
     */
    @PutMapping("/{configKey}")
    public ResponseEntity<SystemConfig> updateConfig(
            @PathVariable String configKey,
            @RequestBody SystemConfigRequest request,
            Principal principal
    ) {
        SystemUser updatedBy = null;
        if (principal != null) {
            updatedBy = systemUserRepository.findByAccount_Username(principal.getName()).orElse(null);
        }
        SystemConfig updatedConfig = systemConfigService.updateConfig(
                configKey,
                request.configValue(),
                request.description(),
                updatedBy
        );
        return ResponseEntity.ok(updatedConfig);
    }
}