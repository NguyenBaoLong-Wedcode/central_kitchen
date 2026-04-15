package com.groupSWP.centralkitchenplatform.security;

import com.groupSWP.centralkitchenplatform.entities.auth.Account;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Service quản lý và xử lý JSON Web Token (JWT).
 * <p>
 * Lớp này chịu trách nhiệm tạo mới Token khi người dùng đăng nhập thành công,
 * cũng như giải mã và trích xuất thông tin (Claims) từ Token mà Frontend gửi lên.
 * Các cấu hình nhạy cảm như Khóa bí mật (Secret Key) và Thời gian sống (Expiration)
 * được trích xuất từ file cấu hình ứng dụng để đảm bảo an toàn tuyệt đối.
 * </p>
 */
@Component
public class JwtService {

    // 🌟 ĐÃ NÂNG CẤP: Không hardcode mã bí mật nữa, lấy trực tiếp từ application.properties
    @Value("${jwt.secret}")
    private String secretKey;

    // 🌟 ĐÃ NÂNG CẤP: Lấy thời gian sống (24h) từ file cấu hình
    @Value("${jwt.expiration}")
    private long jwtExpiration;

    /**
     * Tạo đối tượng Key dùng để ký và xác thực Token.
     * <p>Sử dụng thuật toán HMAC-SHA256 với chuỗi bí mật đã được cấu hình.</p>
     *
     * @return Đối tượng {@link Key} hợp lệ của thư viện JJWT.
     */
    private Key getSigningKey() {
        byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Khởi tạo JWT Token cơ bản chỉ chứa Username.
     * <p>Thường được sử dụng cho các luồng xác thực bước 1 (trước khi nhập OTP).</p>
     *
     * @param username Tên đăng nhập của người dùng.
     * @return Chuỗi JWT Token đã được mã hóa và ký điện tử.
     */
    public String generateToken(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration)) // Dùng biến cấu hình
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Trích xuất tên đăng nhập (Username/Subject) từ chuỗi Token.
     *
     * @param token Chuỗi JWT Token do client gửi lên trong Header.
     * @return Tên đăng nhập chứa bên trong Token.
     */
    public String extractUsername(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    /**
     * Khởi tạo JWT Token hoàn chỉnh chứa các thông tin ủy quyền (Claims).
     * <p>Được gọi khi người dùng hoàn tất quá trình đăng nhập (đã qua lớp OTP).</p>
     *
     * @param account Đối tượng tài khoản đã được xác thực thành công từ DB.
     * @return Chuỗi JWT Token chứa Username và Quyền hạn (Role).
     */
    public String generateToken(Account account) {
        Map<String, Object> claims = new HashMap<>();

        // Đảm bảo lấy đúng Role từ entity Account để nhét vào Token
        claims.put("role", account.getRole());

        return Jwts.builder()
                .setClaims(claims) // Thiết lập claims trước
                .setSubject(account.getUsername()) // Sau đó mới set Subject
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration)) // Dùng biến cấu hình
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Trích xuất Quyền hạn (Role) từ chuỗi Token.
     * <p>Hàm này được các Security Filter gọi để quyết định xem người dùng có quyền đi qua cổng hay không.</p>
     *
     * @param token Chuỗi JWT Token.
     * @return Chuỗi tên quyền (Ví dụ: "ADMIN", "STORE_MANAGER").
     */
    public String extractRole(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();

        System.out.println("Full Claims: " + claims);
        // Ép kiểu về String và trả ra Role
        return claims.get("role", String.class);
    }
}