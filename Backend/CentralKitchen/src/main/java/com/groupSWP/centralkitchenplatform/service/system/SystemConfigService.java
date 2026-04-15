package com.groupSWP.centralkitchenplatform.service.system;

import com.groupSWP.centralkitchenplatform.entities.auth.SystemUser;
import com.groupSWP.centralkitchenplatform.entities.config.SystemConfig;
import com.groupSWP.centralkitchenplatform.entities.notification.Notification;
import com.groupSWP.centralkitchenplatform.repositories.system.SystemConfigRepository;
import com.groupSWP.centralkitchenplatform.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.List;

/**
 * Service quản lý Cấu hình hệ thống (System Configurations).
 * <p>
 * Cung cấp cơ chế lưu trữ và truy xuất các tham số vận hành chung (như giờ mở cửa, phụ phí...).
 * Tích hợp Cache RAM (Spring Cache) để tối ưu hóa hiệu suất truy vấn cấu hình liên tục.
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.1
 * @since 2026-03-29
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SystemConfigService {

    private final SystemConfigRepository systemConfigRepository;
    private final NotificationService notificationService;

    /**
     * Lấy giá trị cấu hình theo Khóa (Config Key) - Có áp dụng Cache.
     *
     * @param configKey    Khóa định danh của cấu hình (VD: OPEN_TIME).
     * @param defaultValue Giá trị trả về nếu không tìm thấy cấu hình trong DB.
     * @return Chuỗi giá trị cấu hình tương ứng.
     */
    @Cacheable(value = "systemConfigs", key = "#configKey")
    public String getConfigValue(String configKey, String defaultValue) {
        log.info("⚡ Đang truy vấn DB để lấy cấu hình: {} (Bỏ qua nếu đã có Cache)", configKey);
        return systemConfigRepository.findById(configKey)
                .map(SystemConfig::getConfigValue)
                .orElse(defaultValue);
    }

    /**
     * Lấy cấu hình và chuyển đổi sang dạng Giờ (LocalTime).
     */
    public LocalTime getLocalTimeConfig(String configKey, String defaultValue) {
        String value = getConfigValue(configKey, defaultValue);
        return LocalTime.parse(value, DateTimeFormatter.ofPattern("HH:mm"));
    }

    /**
     * Lấy cấu hình dạng Tiền tệ/Số học (BigDecimal).
     */
    public BigDecimal getBigDecimalConfig(String configKey, String defaultValue) {
        String value = getConfigValue(configKey, defaultValue);
        return new BigDecimal(value);
    }

    /**
     * Lấy cấu hình dạng số nguyên (Integer).
     * Phục vụ cho các cấu hình đếm số lượng, số giờ (VD: Thời gian tự động chốt đơn).
     *
     * @param configKey    Khóa định danh của cấu hình.
     * @param defaultValue Giá trị mặc định (Chuỗi chứa số).
     * @return Số nguyên tương ứng.
     */
    public Integer getIntegerConfig(String configKey, String defaultValue) {
        String value = getConfigValue(configKey, defaultValue);
        return Integer.parseInt(value);
    }

    /**
     * Lấy toàn bộ danh sách cấu hình hiện hành trong hệ thống.
     */
    public List<SystemConfig> getAllConfigs() {
        return systemConfigRepository.findAll();
    }

    /**
     * Cập nhật cấu hình hệ thống.
     * <p>Xóa Cache RAM hiện tại để hệ thống tự động tải lại dữ liệu mới ở lần gọi tiếp theo.</p>
     *
     * @param configKey   Khóa cấu hình.
     * @param configValue Giá trị cấu hình mới.
     * @param description Mô tả thay đổi.
     * @param updatedBy   Người thực hiện cập nhật.
     * @return Thực thể cấu hình sau cập nhật.
     */
    @CacheEvict(value = "systemConfigs", key = "#configKey")
    public SystemConfig updateConfig(String configKey, String configValue, String description, SystemUser updatedBy) {

        // ==========================================
        // 🛡️ LỚP BẢO VỆ (VALIDATION)
        // ==========================================
        List<String> validKeys = Arrays.asList(
                "OPEN_TIME", "URGENT_CUTOFF_TIME", "STANDARD_CUTOFF_TIME",
                "URGENT_SURCHARGE", "AUTO_CONFIRM_HOURS"
        );

        if (!validKeys.contains(configKey)) {
            throw new RuntimeException("Không được phép tạo cấu hình mới! Chỉ hỗ trợ cập nhật các cấu hình hệ thống hợp lệ.");
        }

        // Kiểm tra định dạng theo từng loại Key
        if (configKey.endsWith("_TIME")) {
            try {
                LocalTime.parse(configValue, DateTimeFormatter.ofPattern("HH:mm"));
            } catch (DateTimeParseException e) {
                throw new RuntimeException("Định dạng giờ sai! Vui lòng nhập chuẩn HH:mm (Ví dụ: 13:00, 08:30)");
            }
        } else if (configKey.endsWith("_SURCHARGE")) {
            try {
                BigDecimal money = new BigDecimal(configValue);
                if (money.compareTo(BigDecimal.ZERO) < 0) {
                    throw new RuntimeException("Tiền phụ phí không được là số âm!");
                }
            } catch (NumberFormatException e) {
                throw new RuntimeException("Định dạng tiền sai! Vui lòng chỉ nhập các con số (Ví dụ: 100000)");
            }
        } else if (configKey.equals("AUTO_CONFIRM_HOURS")) {
            try {
                int hours = Integer.parseInt(configValue);
                if (hours <= 0) {
                    throw new RuntimeException("Thời gian tự động xác nhận phải lớn hơn 0 tiếng!");
                }
            } catch (NumberFormatException e) {
                throw new RuntimeException("Định dạng số giờ sai! Vui lòng chỉ nhập số nguyên (Ví dụ: 6, 12, 24)");
            }
        }

        // Tự động tạo mới nếu Key chưa tồn tại dưới DB
        SystemConfig config = systemConfigRepository.findById(configKey).orElseGet(() -> {
            SystemConfig newConfig = new SystemConfig();
            newConfig.setConfigKey(configKey);
            return newConfig;
        });

        config.setConfigValue(configValue);
        if (description != null) config.setDescription(description);
        config.setUpdatedBy(updatedBy);

        SystemConfig savedConfig = systemConfigRepository.save(config);
        log.info("🔥 Đã cập nhật cấu hình {} = {} và xóa Cache cũ!", configKey, configValue);

        // Bắn thông báo cho các bên liên quan
        notificationService.broadcastNotification(
                List.of("STORE_MANAGER", "KITCHEN_MANAGER", "COORDINATOR"),
                "⚙️ THAY ĐỔI CẤU HÌNH HỆ THỐNG",
                "Quản lý vừa cập nhật tham số [" + configKey + "] thành giá trị mới là: " + configValue + ". Vui lòng lưu ý để sắp xếp công việc!",
                Notification.NotificationType.INFO
        );

        return savedConfig;
    }
}