package com.groupSWP.centralkitchenplatform.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Lớp cấu hình kích hoạt tính năng JPA Auditing của Spring Data JPA.
 * <p>
 * Bằng cách sử dụng {@link EnableJpaAuditing}, hệ thống sẽ tự động theo dõi và
 * điền các thông tin kiểm toán (audit) vào các Entity mỗi khi có thao tác thêm mới (INSERT)
 * hoặc cập nhật (UPDATE) vào cơ sở dữ liệu.
 * </p>
 * * <p><b>Các annotation hỗ trợ trong Entity:</b></p>
 * <ul>
 * <li>{@code @CreatedDate}: Tự động lưu thời gian tạo bản ghi.</li>
 * <li>{@code @LastModifiedDate}: Tự động lưu thời gian cập nhật bản ghi cuối cùng.</li>
 * <li>{@code @CreatedBy}: Tự động lưu người tạo (yêu cầu cấu hình thêm AuditorAware).</li>
 * <li>{@code @LastModifiedBy}: Tự động lưu người cập nhật (yêu cầu cấu hình thêm AuditorAware).</li>
 * </ul>
 * * <p><b>Lưu ý tích hợp:</b> Để tính năng này hoạt động trên một Entity cụ thể,
 * Entity đó bắt buộc phải được gắn annotation {@code @EntityListeners(AuditingEntityListener.class)}.
 * </p>
 */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
}