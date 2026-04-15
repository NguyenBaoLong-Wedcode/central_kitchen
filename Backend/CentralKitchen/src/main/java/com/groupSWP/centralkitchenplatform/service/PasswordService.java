package com.groupSWP.centralkitchenplatform.service;

import com.groupSWP.centralkitchenplatform.dto.auth.ChangePasswordRequest;
import com.groupSWP.centralkitchenplatform.entities.auth.Account;
import com.groupSWP.centralkitchenplatform.repositories.auth.AccountRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class PasswordService {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    public PasswordService(AccountRepository accountRepository, PasswordEncoder passwordEncoder) {
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void changePassword(String username, ChangePasswordRequest request) {
        // 1. Validate: Mật khẩu mới và xác nhận phải khớp nhau
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Mật khẩu xác nhận không khớp!");
        }

        // 2. Tìm Account dựa trên username (Tất cả user đều nằm trong bảng Account)
        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng: " + username));

        // 3. Check mật khẩu cũ
        if (!passwordEncoder.matches(request.getOldPassword(), account.getPassword())) {
            throw new RuntimeException("Mật khẩu cũ không chính xác!");
        }

        // 4. Mã hóa và Lưu mật khẩu mới
        account.setPassword(passwordEncoder.encode(request.getNewPassword()));
        accountRepository.save(account);
    }
}