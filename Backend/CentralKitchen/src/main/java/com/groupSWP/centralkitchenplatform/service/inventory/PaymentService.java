package com.groupSWP.centralkitchenplatform.service.inventory;

import com.groupSWP.centralkitchenplatform.config.VNPayConfig;
import com.groupSWP.centralkitchenplatform.entities.logistic.Order;
import com.groupSWP.centralkitchenplatform.entities.notification.Notification;
import com.groupSWP.centralkitchenplatform.repositories.order.OrderRepository;
import com.groupSWP.centralkitchenplatform.service.notification.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    @Value("${vnpay.tmnCode}") private String tmnCode;
    @Value("${vnpay.hashSecret}") private String hashSecret;
    @Value("${vnpay.payUrl}") private String payUrl;
    @Value("${vnpay.returnUrl}") private String returnUrl;

    private final OrderRepository orderRepository;
    private final NotificationService notificationService; // Để gọi Bếp

    // 1. TẠO LINK THANH TOÁN
    public String createPaymentUrl(String orderId, HttpServletRequest request) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

        long amount = order.getTotalAmount().longValue() * 100L; // VNPay yêu cầu nhân 100

        Map<String, String> vnp_Params = new HashMap<>();
        vnp_Params.put("vnp_Version", "2.1.0");
        vnp_Params.put("vnp_Command", "pay");
        vnp_Params.put("vnp_TmnCode", tmnCode);
        vnp_Params.put("vnp_Amount", String.valueOf(amount));
        vnp_Params.put("vnp_CurrCode", "VND");
        vnp_Params.put("vnp_TxnRef", orderId);
        vnp_Params.put("vnp_OrderInfo", "Thanh toan don hang " + orderId);
        vnp_Params.put("vnp_OrderType", "other");
//        vnp_Params.put("vnp_BankCode", "NCB");
        vnp_Params.put("vnp_Locale", "vn");
        vnp_Params.put("vnp_ReturnUrl", returnUrl);
        vnp_Params.put("vnp_IpAddr", VNPayConfig.getIpAddress(request));

        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Etc/GMT+7"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        vnp_Params.put("vnp_CreateDate", formatter.format(cld.getTime()));

        cld.add(Calendar.MINUTE, 15); // Hạn thanh toán 15 phút
        vnp_Params.put("vnp_ExpireDate", formatter.format(cld.getTime()));

        List<String> fieldNames = new ArrayList<>(vnp_Params.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();

        try {
            for (String fieldName : fieldNames) {
                String fieldValue = vnp_Params.get(fieldName);
                if (fieldValue != null && fieldValue.length() > 0) {
                    hashData.append(fieldName).append('=').append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                    query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII.toString())).append('=').append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                    if (!fieldName.equals(fieldNames.get(fieldNames.size() - 1))) {
                        query.append('&');
                        hashData.append('&');
                    }
                }
            }
        } catch (Exception e) { e.printStackTrace(); }

        String queryUrl = query.toString();
        String vnp_SecureHash = VNPayConfig.hmacSHA512(hashSecret, hashData.toString());
        queryUrl += "&vnp_SecureHash=" + vnp_SecureHash;

        return payUrl + "?" + queryUrl;
    }

    // 2. XỬ LÝ KHI VNPAY TRẢ KẾT QUẢ VỀ (QUAN TRỌNG NHẤT)
    @Transactional
    public String processPaymentReturn(Map<String, String> fields) {
        String vnp_SecureHash = fields.remove("vnp_SecureHash");
        fields.remove("vnp_SecureHashType");

        List<String> fieldNames = new ArrayList<>(fields.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();

        try {
            for (String fieldName : fieldNames) {
                String fieldValue = fields.get(fieldName);
                if (fieldValue != null && fieldValue.length() > 0) {
                    hashData.append(fieldName).append('=').append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                    if (!fieldName.equals(fieldNames.get(fieldNames.size() - 1))) {
                        hashData.append('&');
                    }
                }
            }
        } catch (Exception e) {}

        String signValue = VNPayConfig.hmacSHA512(hashSecret, hashData.toString());

        if (signValue.equals(vnp_SecureHash)) {
            String orderId = fields.get("vnp_TxnRef");
            String responseCode = fields.get("vnp_ResponseCode");

            Order order = orderRepository.findById(orderId).orElse(null);
            if (order != null && "00".equals(responseCode)) {
                // 🔥 CẬP NHẬT DB: TIỀN ĐÃ VÀO TÚI
                order.setPaymentStatus(Order.PaymentStatus.PAID);
                order.setTransactionId(fields.get("vnp_TransactionNo"));
                order.setPaymentDate(LocalDateTime.now());

                // 🔥 ĐỔI STATUS SANG 'NEW' ĐỂ BẾP NHÌN THẤY
                order.setStatus(Order.OrderStatus.NEW);
                orderRepository.save(order);

                // 🔥 ĐÁNH KẺNG GỌI BẾP (Bây giờ mới gọi)
                boolean isUrgent = order.getOrderType() == Order.OrderType.URGENT;
                notificationService.broadcastNotification(
                        List.of("KITCHEN_MANAGER", "MANAGER"),
                        isUrgent ? "🚨 ĐƠN HÀNG KHẨN CẤP ĐÃ THANH TOÁN" : "📦 Đơn hàng mới đã chốt",
                        "Cửa hàng " + order.getStore().getName() + " vừa thanh toán đơn " + order.getOrderId() + " qua VNPay.",
                        isUrgent ? Notification.NotificationType.URGENT : Notification.NotificationType.INFO
                );
                return "THANH TOÁN THÀNH CÔNG! Đơn hàng đã được chuyển xuống Bếp.";
            } else {
                if (order != null) {
                    order.setPaymentStatus(Order.PaymentStatus.FAILED);
                    orderRepository.save(order);
                }
                return "Thanh toán thất bại hoặc khách hàng hủy giao dịch!";
            }
        } else {
            return "LỖI BẢO MẬT: Chữ ký không hợp lệ!";
        }
    }
}