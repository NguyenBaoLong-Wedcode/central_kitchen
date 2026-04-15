package com.groupSWP.centralkitchenplatform.service.store;

import com.groupSWP.centralkitchenplatform.dto.store.StoreProfileResponse;
import com.groupSWP.centralkitchenplatform.dto.store.StoreProfileUpdateRequest;
import com.groupSWP.centralkitchenplatform.entities.auth.Store;
import com.groupSWP.centralkitchenplatform.entities.notification.Notification;
import com.groupSWP.centralkitchenplatform.repositories.store.StoreRepository;
import com.groupSWP.centralkitchenplatform.service.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service xử lý các thiết lập dành riêng cho Cửa hàng trưởng.
 * Quản lý thông tin hồ sơ và trạng thái hoạt động của chi nhánh.
 * <p>
 * Lớp Service này đóng vai trò là tầng trung gian (Business Layer) cốt lõi trong hệ sinh thái Central Kitchen,
 * chịu trách nhiệm thực thi các logic nghiệp vụ phức tạp liên quan đến điểm bán. Nó không chỉ tương tác
 * trực tiếp với cơ sở dữ liệu thông qua Repository để duy trì tính nhất quán của hồ sơ (tên, địa chỉ, số điện thoại),
 * mà còn quản lý vòng đời trạng thái đóng/mở cửa của từng chi nhánh.
 * </p>
 * <p>
 * Đặc biệt, Service này được tích hợp chặt chẽ với hệ thống thông báo (NotificationService) và cơ chế
 * quản lý giao dịch (Transactional). Bất kỳ sự can thiệp nào từ phía Admin làm thay đổi trạng thái vận hành
 * khẩn cấp của cửa hàng đều sẽ tự động kích hoạt các luồng cảnh báo theo thời gian thực (Real-time alerts)
 * gửi trực tiếp đến Cửa hàng trưởng, đảm bảo sự minh bạch và phản hồi nhanh chóng trong chuỗi cung ứng.
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0
 * @since 2026-03-29
 */
@Service
@RequiredArgsConstructor // Sử dụng Lombok để thay thế constructor thủ công
public class StoreSettingsService {

    private final StoreRepository storeRepository; // Đã đổi sang dùng StoreRepository chung
    private final NotificationService notificationService; // 🔥 Đã tiêm NotificationService

    /**
     * Lấy hồ sơ cửa hàng thông qua Tên đăng nhập của người quản lý.
     * <p>
     * Dựa vào thông tin định danh của người dùng đang đăng nhập, hệ thống sẽ truy xuất
     * dữ liệu bản ghi Cửa hàng tương ứng để hiển thị trên giao diện Dashboard.
     * </p>
     *
     * @param username Tên đăng nhập của tài khoản quản lý cửa hàng (Store Manager).
     * @return Đối tượng {@link StoreProfileResponse} chứa các thông tin cơ bản và trạng thái hoạt động.
     * @throws RuntimeException Nếu không tìm thấy cửa hàng nào được liên kết với username này.
     */
    public StoreProfileResponse getProfileByUsername(String username) {
        Store store = storeRepository.findByAccount_Username(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cửa hàng cho user: " + username));

        return StoreProfileResponse.builder()
                .name(store.getName())
                .address(store.getAddress())
                .phone(store.getPhone())
                .isActive(store.isActive()) // Trả về thêm active theo yêu cầu của bạn
                .build();
    }

    /**
     * Cập nhật thông tin liên lạc của cửa hàng.
     * <p>
     * Phương thức này được bọc trong một Transaction để đảm bảo tính toàn vẹn dữ liệu.
     * Các thay đổi về tên, địa chỉ và số điện thoại sẽ được ghi đè an toàn vào cơ sở dữ liệu.
     * </p>
     *
     * @param username Tên đăng nhập của tài khoản quản lý thực hiện yêu cầu.
     * @param request  Đối tượng {@link StoreProfileUpdateRequest} chứa dữ liệu mới cần cập nhật.
     * @throws RuntimeException Nếu không tìm thấy cửa hàng hợp lệ để thực hiện cập nhật.
     */
    @Transactional
    public void updateProfileByUsername(String username, StoreProfileUpdateRequest request) {
        Store store = storeRepository.findByAccount_Username(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cửa hàng"));

        store.setName(request.getName());
        store.setAddress(request.getAddress());
        store.setPhone(request.getPhone());
        storeRepository.save(store);
    }

    /**
     * Bật/Tắt trạng thái hoạt động (Mở/Đóng cửa) của chi nhánh.
     * <p>
     * Đây là nghiệp vụ nhạy cảm, thường do Admin thao tác. Khi trạng thái cửa hàng bị thay đổi
     * (ví dụ: đóng cửa khẩn cấp do sự cố), hệ thống sẽ lập tức cập nhật cờ trạng thái trong DB,
     * đồng thời tự động phát đi một thông báo khẩn cấp (Warning/Info) đến tài khoản của Cửa hàng trưởng.
     * </p>
     *
     * @param storeId  Mã định danh duy nhất của Cửa hàng cần thay đổi trạng thái.
     * @param isActive Cờ boolean chỉ định trạng thái mới (true: Mở cửa, false: Đóng cửa).
     * @throws RuntimeException Nếu mã cửa hàng (storeId) không tồn tại trong hệ thống.
     */
    // Sửa chữ 'username' thành 'storeId'
    @Transactional
    public void updateStatus(String storeId, Boolean isActive) {

        // 🌟 TÌM CỬA HÀNG THEO STORE ID (Chứ không tìm theo Username nữa)
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cửa hàng với mã: " + storeId));

        store.setActive(isActive);
        storeRepository.save(store);

        // 🔥 THÔNG BÁO 3: Báo cho Cửa hàng trưởng biết bị bật/tắt khẩn cấp
        if (store.getAccount() != null) {
            notificationService.sendNotification(
                    store.getAccount(),
                    "🔒 TRẠNG THÁI CỬA HÀNG",
                    isActive ? "Admin vừa MỞ CỬA lại chi nhánh của bạn." : "Admin vừa ĐÓNG CỬA chi nhánh của bạn khẩn cấp!",
                    isActive ? Notification.NotificationType.INFO : Notification.NotificationType.WARNING,
                    null
            );
        }
    }
}