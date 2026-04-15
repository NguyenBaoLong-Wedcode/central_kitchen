package com.groupSWP.centralkitchenplatform.service.auth;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.concurrent.TimeUnit;

@Service
public class OtpService {

    // Khởi tạo Cache: Tự động xóa OTP sau 5 phút kể từ lúc tạo
    private final Cache<String, String> otpCache = Caffeine.newBuilder()
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .maximumSize(10000) // Tùy chọn: Chống spam quá mức (chỉ lưu tối đa 10,000 mã cùng lúc)
            .build();

    public String generateOtp(String username) {
        String otp = String.format("%06d", new Random().nextInt(999999));
        // Đưa OTP vào Cache
        otpCache.put(username, otp);
        return otp;
    }

    public boolean validateOtp(String username, String otp) {
        // Lấy OTP ra (Nếu đã quá 5 phút hoặc chưa từng gửi, nó sẽ trả về null)
        String savedOtp = otpCache.getIfPresent(username);

        // Trả về true nếu mã khớp, false nếu sai hoặc mã đã hết hạn/bị xóa
        return savedOtp != null && savedOtp.equals(otp);
    }

    public void clearOtp(String username) {
        // Xóa mã OTP ngay lập tức sau khi dùng xong
        otpCache.invalidate(username);
    }
}