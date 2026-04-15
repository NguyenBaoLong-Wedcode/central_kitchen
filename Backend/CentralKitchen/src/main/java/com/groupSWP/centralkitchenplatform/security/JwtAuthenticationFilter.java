package com.groupSWP.centralkitchenplatform.security;

import com.groupSWP.centralkitchenplatform.entities.auth.Account;
import com.groupSWP.centralkitchenplatform.repositories.auth.AccountRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final AccountRepository accountRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;
        final String role;

        // 1. Kiểm tra Header Authorization
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);

        try {
            username = jwtService.extractUsername(jwt);
            role = jwtService.extractRole(jwt); // Lấy role từ token


            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                Account account = accountRepository.findByUsername(username).orElse(null);



                if (account == null) {
                    filterChain.doFilter(request, response);
                    return;
                }





                if (!account.isActive()) {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN); // Lỗi 403
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"error\": \"Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa. Quyền truy cập bị từ chối!\"}");
                    return; // Văng ra ngoài luôn, không cho đi tiếp
                }

                // =================================================================
                // CHẶN ĐĂNG NHẬP NHIỀU NƠI (Token không khớp với DB)
                // =================================================================
                if (!jwt.equals(account.getActiveToken())) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED); // Lỗi 401
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"error\": \"Tài khoản của bạn đã được đăng nhập ở một thiết bị khác. Vui lòng đăng nhập lại!\"}");
                    return; // Văng ra ngoài luôn
                }

                
                if (role != null && !role.isEmpty()) {
                    List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            username,
                            null,
                            authorities
                    );

                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    // 4. Xác thực thành công và lưu vào Context
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            // Nếu Token sai, hết hạn hoặc lỗi giải mã, ta không set Authentication
        }

        filterChain.doFilter(request, response);
    }
}