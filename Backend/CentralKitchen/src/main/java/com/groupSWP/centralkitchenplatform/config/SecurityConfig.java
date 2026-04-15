package com.groupSWP.centralkitchenplatform.config;

import com.groupSWP.centralkitchenplatform.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Lớp cấu hình bảo mật trung tâm của toàn bộ hệ thống (Spring Security Configuration).
 * <p>
 * Class này chịu trách nhiệm:
 * <ul>
 * <li>Thiết lập bộ lọc bảo mật (Security Filter Chain) cho các HTTP request.</li>
 * <li>Cấu hình phân quyền chi tiết (Role-Based Access Control - RBAC) theo từng endpoint và {@link HttpMethod}.</li>
 * <li>Quản lý chính sách phiên (Session Policy) theo chuẩn Stateless (phi trạng thái) dành cho JWT.</li>
 * <li>Tích hợp bộ lọc kiểm tra JWT ({@link JwtAuthenticationFilter}) trước khi request đi vào Controller.</li>
 * <li>Cấu hình chính sách CORS để cho phép Frontend giao tiếp an toàn với Backend.</li>
 * </ul>
 * </p>
 * <p>
 * <b>Lưu ý an toàn:</b> Mọi thay đổi về đường dẫn (URL) hoặc quyền (Role) tại đây đều ảnh hưởng
 * trực tiếp đến tính bảo mật của hệ thống. Cần đảm bảo quy tắc: <i>"Phân quyền cụ thể đặt trên cùng, phân quyền tổng quát đặt phía dưới"</i>.
 * </p>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    /**
     * Định nghĩa chuỗi bộ lọc bảo mật chính (Security Filter Chain).
     * <p>
     * Phương thức này thiết lập vô hiệu hóa CSRF (do dùng JWT), định nghĩa cụ thể danh sách
     * các endpoint được phép truy cập công khai (Public) và các endpoint yêu cầu xác thực,
     * phân quyền khắt khe theo từng Role của hệ thống.
     * </p>
     *
     * @param http Đối tượng {@link HttpSecurity} dùng để xây dựng cấu hình bảo mật web.
     * @return {@link SecurityFilterChain} Chuỗi bộ lọc đã được cấu hình hoàn chỉnh để Spring Security áp dụng.
     * @throws Exception Bắt các ngoại lệ phát sinh trong quá trình khởi tạo cấu hình bảo mật.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable) // Tắt tính năng bảo vệ CSRF vì API sử dụng JWT (Stateless)
                .authorizeHttpRequests(auth -> auth
                        // =========================================================
                        // 1. PUBLIC (Không yêu cầu xác thực - Token không bắt buộc)
                        // =========================================================
                        .requestMatchers("/api/auth/login", "/api/auth/verify-otp","/api/auth/forgot-password","/api/auth/reset-password","/api/payment/**").permitAll()
                        // =========================================================

                        // 2. ƯU TIÊN 1: CÁC LUỒNG CỤ THỂ (Phải đặt lên trên cùng để tránh bị đè rule)
                        // =========================================================

                        // Cho phép mọi user đã đăng nhập (có Token) thực hiện thao tác Đọc (GET)
                        .requestMatchers(HttpMethod.GET,
                                "/api/products", "/api/products/**",
                                "/api/categories", "/api/categories/**",
                                "/api/ingredients", "/api/ingredients/**",
                                "/api/stores", "/api/stores/**",
                                "/api/manager/conversions/**")
                        .authenticated()

                        // Giới hạn thao tác Ghi (POST) cho các thực thể quan trọng
                        .requestMatchers(HttpMethod.POST,
                                "/api/products", "/api/products/**",
                                "/api/categories", "/api/categories/**",
                                "/api/ingredients", "/api/ingredients/**",
                                "/api/manager/conversions/**")
                        .hasAnyRole("ADMIN", "MANAGER", "KITCHEN_MANAGER")

                        // Giới hạn thao tác Sửa (PUT)
                        .requestMatchers(HttpMethod.PUT,
                                "/api/products/**", "/api/categories/**", "/api/ingredients/**", "/api/manager/conversions/**")
                        .hasAnyRole("ADMIN",  "MANAGER",  "KITCHEN_MANAGER")

                        // Giới hạn thao tác Xóa (DELETE)
                        .requestMatchers(HttpMethod.DELETE,
                                "/api/products/**", "/api/categories/**", "/api/ingredients/**", "/api/manager/conversions/**")

                        .hasAnyRole("ADMIN", "MANAGER", "KITCHEN_MANAGER")
                        // =========================================================
                        // LUỒNG THÔNG BÁO (NOTIFICATION) - ĐƯA LÊN TRÊN ĐỂ ƯU TIÊN
                        // =========================================================
                        .requestMatchers("/api/notifications/**").hasAnyRole("ADMIN", "MANAGER", "KITCHEN_MANAGER", "STORE_MANAGER", "COORDINATOR")

                        // =========================================================
                        // 3. ƯU TIÊN 2: CÁC LUỒNG TỔNG QUÁT (Dùng /** để bao quát các prefix)
                        // =========================================================

                        // Khu vực dành riêng cho ADMIN
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // Khu vực dành cho MANAGER (Các luồng Conversions ngoại lệ đã được xử lý phía trên)
                        .requestMatchers("/api/manager/**", "/api/orders/**", "/api/recipes/**")
                        .hasAnyRole("ADMIN", "MANAGER")

                        // Quản lý nghiệp vụ Cửa hàng (Stores CRUD) - Không bao gồm quyền GET (đã cho phép all ở trên)
                        .requestMatchers(HttpMethod.POST, "/api/stores", "/api/stores/**")
                        .hasAnyRole("ADMIN",  "MANAGER")

                        .requestMatchers(HttpMethod.PUT, "/api/stores/**")
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(HttpMethod.DELETE, "/api/stores/**")
                        .hasAnyRole("ADMIN", "MANAGER")

                        // Khu vực dành cho LOGISTICS / COORDINATOR
                        .requestMatchers("/api/logistics/**", "/api/shipments/**")
                        .hasAnyRole("ADMIN", "MANAGER", "COORDINATOR","STORE_MANAGER")

                        // Khu vực dành cho KITCHEN MANAGER (Quản lý Bếp trung tâm)
                        .requestMatchers("/api/kitchen/**", "/api/inventory/**")
                        .hasAnyRole("ADMIN", "MANAGER","KITCHEN_MANAGER")

                        // Khu vực dành cho STORE MANAGER (Quản lý Cửa hàng lẻ)
                        .requestMatchers("/api/store/**")
                        .hasAnyRole("ADMIN","MANAGER", "STORE_MANAGER")

                        // 1. Quyền cho Kitchen Manager (hoặc Admin/Manager) đổi trạng thái Đang chuẩn bị / Đang giao
                        .requestMatchers(HttpMethod.POST,
                                "/api/orders/delivery/*/preparing",
                                "/api/orders/delivery/*/shipping")
                        .hasAnyRole("ADMIN", "MANAGER", "KITCHEN_MANAGER")

                        // 2. Quyền cho Store Manager (hoặc Admin) xác nhận Đã nhận hàng
                        .requestMatchers(HttpMethod.POST,
                                "/api/orders/delivery/*/confirm-receipt")
                        .hasAnyRole("ADMIN", "STORE_MANAGER")

                        // Mọi endpoint khác không khai báo ở trên đều yêu cầu phải có Token hợp lệ
                        .anyRequest().authenticated()
                )
                // Cấu hình Session Stateless: Spring Security sẽ không lưu trạng thái đăng nhập vào Session
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Chèn bộ lọc kiểm tra Token vào trước bộ lọc xác thực tài khoản/mật khẩu mặc định
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Cấu hình chính sách CORS (Cross-Origin Resource Sharing).
     * <p>
     * Cho phép các ứng dụng Frontend (ví dụ: ReactJS chạy trên localhost:3000)
     * được phép gọi API đến Backend mà không bị cơ chế bảo mật của trình duyệt chặn lại.
     * Thiết lập rõ ràng các Origin, Method và Header được phép giao tiếp.
     * </p>
     *
     * @return {@link CorsConfigurationSource} Đối tượng chứa nguồn cung cấp cấu hình CORS cho Spring Security.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Cấu hình URL của Frontend được phép gọi đến (Origin)
        configuration.setAllowedOrigins(List.of("http://localhost:3000"));
        // Cấu hình các phương thức HTTP được phép sử dụng
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        // Cấu hình các Header được phép gửi kèm trong request (Authorization để chứa Token)
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        // Cho phép gửi kèm thông tin xác thực (Credentials/Cookies) nếu có
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Áp dụng cấu hình CORS này cho toàn bộ các endpoint (/**)
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    /**
     * Khởi tạo Bean PasswordEncoder dùng để mã hóa mật khẩu.
     * <p>
     * Sử dụng thuật toán BCrypt (chuẩn công nghiệp hiện tại) để băm (hash) mật khẩu
     * một chiều. Thuật toán này tự động sinh ra muối (salt) ngẫu nhiên, giúp bảo vệ
     * dữ liệu người dùng an toàn tuyệt đối ngay cả khi Database bị rò rỉ.
     * </p>
     *
     * @return {@link PasswordEncoder} Đối tượng hỗ trợ mã hóa (encode) và xác thực (matches) mật khẩu.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}