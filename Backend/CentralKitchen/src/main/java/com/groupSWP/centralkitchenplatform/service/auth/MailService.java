package com.groupSWP.centralkitchenplatform.service.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MailService {
    private final JavaMailSender mailSender;

    public void sendOtpMail(String toEmail, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("[Central Kitchen] Mã xác nhận đăng nhập");
        message.setText("Mã OTP của bạn là: " + otp + "\nMã có hiệu lực trong 5 phút. Vui lòng không cung cấp mã này cho bất kỳ ai.");
        mailSender.send(message);
    }
}