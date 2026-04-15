package com.groupSWP.centralkitchenplatform.service.order;

import com.groupSWP.centralkitchenplatform.entities.logistic.Order;
import com.groupSWP.centralkitchenplatform.repositories.order.OrderRepository;
import com.groupSWP.centralkitchenplatform.service.system.SystemConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Trình lên lịch (Scheduler) tự động xử lý các Đơn hàng treo.
 * <p>
 * Lớp này chịu trách nhiệm quét định kỳ trong cơ sở dữ liệu để tìm kiếm các Đơn hàng
 * đang ở trạng thái ĐANG GIAO (SHIPPING) nhưng đã vượt quá khung thời gian cho phép.
 * Tránh tình trạng Cửa hàng quên bấm "Đã nhận hàng" khiến dòng tiền và báo cáo bị tắc nghẽn.
 * </p>
 * <p>
 * Số giờ chờ tối đa được lấy động từ cấu hình hệ thống (System Config), giúp Quản lý
 * có thể linh hoạt thay đổi thời gian (VD: Từ 6 tiếng lên 12 tiếng) trực tiếp trên Web
 * mà không cần phải khởi động lại Server hay can thiệp vào mã nguồn.
 * </p>
 *
 * @author Đạt
 * @version 1.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AutoCompleteDeliveryScheduler {

    private final OrderRepository orderRepository;
    private final SystemConfigService systemConfigService;

    /**
     * Tự động chốt trạng thái Đã Giao (DELIVERED) cho các đơn hàng quá hạn xác nhận.
     * <p>
     * Job này chạy ngầm mỗi 15 phút (900000 milliseconds).
     * Lấy mốc thời gian chốt dựa vào cấu hình AUTO_CONFIRM_HOURS.
     * </p>
     */
    @Scheduled(fixedRate = 900000)
    @Transactional
    public void autoConfirmDeliveredOrders() {

        // 1. Lấy số giờ giới hạn từ cấu hình động (Mặc định là 6 tiếng nếu DB trống)
        int autoConfirmHours = systemConfigService.getIntegerConfig("AUTO_CONFIRM_HOURS", "6");

        // 2. Tính toán mốc thời gian quá hạn (Hiện tại trừ đi số giờ đã cấu hình)
        LocalDateTime timeThreshold = LocalDateTime.now().minusHours(autoConfirmHours);

        // 3. Quét các đơn hàng đang giao và có thời gian xuất phát cũ hơn mốc Threshold
        List<Order> overdueOrders = orderRepository.findByStatusAndShippingStartTimeBefore(
                Order.OrderStatus.SHIPPING,
                timeThreshold
        );

        // 4. Cập nhật và lưu lại
        if (!overdueOrders.isEmpty()) {
            for (Order order : overdueOrders) {
                order.setStatus(Order.OrderStatus.DELIVERED);
                log.info("Hệ thống tự động chốt đơn {} vì đã quá {} tiếng mà Cửa hàng không bấm xác nhận.", order.getOrderId(), autoConfirmHours);
            }

            orderRepository.saveAll(overdueOrders);
            log.info("✅ Scheduler chạy hoàn tất: Đã tự động sang trạng thái DELIVERED cho {} đơn hàng.", overdueOrders.size());
        }
    }
}