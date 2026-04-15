package com.groupSWP.centralkitchenplatform.service.order;

import com.groupSWP.centralkitchenplatform.entities.logistic.Order;
import com.groupSWP.centralkitchenplatform.entities.notification.Notification; // 🔥 Thêm import
import com.groupSWP.centralkitchenplatform.repositories.order.OrderRepository;
import com.groupSWP.centralkitchenplatform.service.notification.NotificationService; // 🔥 Thêm import
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List; // 🔥 Thêm import

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderDeliveryService {

    private final OrderRepository orderRepository;
    private final NotificationService notificationService; // 🔥 Tiêm NotificationService

    // 1. KITCHEN MANAGER: Đánh dấu đang chuẩn bị
    @Transactional
    public void markAsPreparing(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng!"));

        // 🔥 GUARDRAIL MỚI: Chỉ đơn ĐÃ GOM (PLANNED) mới được mang đi nấu!
        if (order.getStatus() != Order.OrderStatus.PLANNED) {
            throw new RuntimeException("Lỗi: Đơn hàng chưa được Gom (PLANNED) nên không thể bắt đầu nấu!");
        }

        order.setStatus(Order.OrderStatus.PREPARING);
        orderRepository.save(order);
        log.info("Kitchen Manager đã cập nhật đơn {} sang PREPARING", orderId);
    }

    // =======================================================
    // 🌟 ĐÃ THÊM: HÀM MỚI ĐỂ FIX LỖI "Cannot resolve method"
    // =======================================================
    @Transactional
    public void markAsReadyToShip(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng!"));

        // 🔥 GUARDRAIL: Đang nấu (PREPARING) thì mới được bấm Nấu xong
        if (order.getStatus() != Order.OrderStatus.PREPARING) {
            throw new RuntimeException("Lỗi: Chỉ có thể xác nhận nấu xong khi đơn hàng đang ở trạng thái Đang chuẩn bị (PREPARING)!");
        }

        order.setStatus(Order.OrderStatus.READY_TO_SHIP);
        orderRepository.save(order);
        log.info("Kitchen Manager đã cập nhật đơn {} sang READY_TO_SHIP. Đã đẩy sang màn hình của Điều phối viên!", orderId);

        // 🔥 THÔNG BÁO: Báo cho Điều phối viên (Coordinator) ra nhận hàng để gán xe
        notificationService.broadcastNotification(
                List.of("COORDINATOR"),
                "✅ HÀNG ĐÃ NẤU XONG",
                "Đơn hàng " + orderId + " đã sẵn sàng. Vui lòng điều phối tài xế!",
                Notification.NotificationType.INFO
        );
    }

    // 2. KITCHEN MANAGER: Đánh dấu đang giao (Bắt đầu đếm ngược 6 tiếng)
    @Transactional
    public void markAsShipping(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng!"));

        order.setStatus(Order.OrderStatus.SHIPPING);
        order.setShippingStartTime(LocalDateTime.now()); // Chốt thời điểm bắt đầu giao
        orderRepository.save(order);

        log.info("Kitchen Manager đã cập nhật đơn {} sang SHIPPING. Bắt đầu đếm ngược 6 tiếng. Đã gửi thông báo cho Cửa hàng!", orderId);

        // 🔥 THÔNG BÁO: Báo cho Store Manager là hàng đã xuất kho
        if (order.getStore() != null && order.getStore().getAccount() != null) {
            notificationService.sendNotification(
                    order.getStore().getAccount(),
                    "🚚 HÀNG ĐANG GIAO",
                    "Đơn hàng " + orderId + " đã rời kho Bếp trung tâm. Sếp chuẩn bị nhận hàng nhé!",
                    Notification.NotificationType.SUCCESS,
                    null
            );
        }
    }

    // 3. STORE MANAGER: Xác nhận đã nhận hàng
    @Transactional
    public void confirmReceipt(String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng!"));

        if (order.getStatus() != Order.OrderStatus.SHIPPING) {
            throw new RuntimeException("Đơn hàng này chưa được giao, không thể xác nhận!");
        }

        order.setStatus(Order.OrderStatus.DELIVERED);
        orderRepository.save(order);
        log.info("Store Manager đã xác nhận nhận thành công đơn {}", orderId);
    }
}