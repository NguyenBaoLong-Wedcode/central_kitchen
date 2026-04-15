package com.groupSWP.centralkitchenplatform.service.order;

import com.groupSWP.centralkitchenplatform.dao.LogisticDao;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.ByteBuffer;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service xử lý các truy vấn và logic liên quan đến điều phối vận chuyển.
 * <p>
 * Lớp này đóng vai trò là tầng nghiệp vụ (Business Logic Layer), chịu trách nhiệm điều phối dữ liệu
 * giữa tầng truy cập dữ liệu SQL thuần (LogisticDao) và tầng giao diện (Controller).
 * Ngoài việc cung cấp các thông tin về trạng thái đơn hàng và chuyến xe, Service này còn
 * thực hiện các thao tác chuẩn hóa dữ liệu phức tạp trước khi trả về cho phía người dùng.
 * </p>
 * <p>
 * <b>Vai trò xử lý dữ liệu:</b> Một trong những nhiệm vụ cốt lõi của Service này là chuyển đổi
 * các định dạng dữ liệu đặc thù từ Database (như định dạng nhị phân của UUID) sang các kiểu
 * dữ liệu phổ thông như String. Điều này giúp đảm bảo tính tương thích tuyệt đối với các thư viện
 * JSON và giúp Frontend dễ dàng xử lý mà không cần quan tâm đến cấu trúc lưu trữ phức tạp bên dưới.
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0
 * @since 2026-03-29
 */
@Service
@RequiredArgsConstructor
public class LogisticsService {

    // Tiêm Repository vào thay vì dùng JdbcTemplate trực tiếp
    private final LogisticDao logisticDao;

    /**
     * Truy xuất danh sách các đơn hàng đã sẵn sàng nhưng chưa được gán chuyến.
     * * @return Danh sách các đơn hàng ở trạng thái READY_TO_SHIP dưới dạng Map dữ liệu.
     */
    public List<Map<String, Object>> getReadyOrders() {
        return logisticDao.findReadyOrders();
    }

    /**
     * Lấy thông tin của các chuyến xe đang trong quá trình vận hành.
     * * @return Danh sách các chuyến xe đang xử lý hoặc đang trên đường giao hàng.
     */
    public List<Map<String, Object>> getActiveShipments() {
        return logisticDao.findActiveShipments();
    }

    /**
     * Truy xuất chi tiết hàng hóa có trên một chuyến xe cụ thể.
     * * @param shipmentId Mã định danh của chuyến xe cần tra cứu.
     * @return Danh sách chi tiết các mặt hàng bao gồm tên và số lượng dự kiến.
     */
    public List<Map<String, Object>> getShipmentDetails(String shipmentId) {
        return logisticDao.findShipmentDetails(shipmentId);
    }

    /**
     * Lấy toàn bộ lịch sử các chuyến xe đã hoàn tất chu trình vận chuyển.
     * * @return Danh sách các chuyến xe đã giao thành công hoặc đã xử lý xong sự cố.
     */
    public List<Map<String, Object>> getCompletedShipments() {
        return logisticDao.findCompletedShipments();
    }

    /**
     * Lấy danh sách nhân sự điều phối và thực hiện chuẩn hóa mã định danh.
     * <p>
     * Phương thức này thực hiện một bước xử lý hậu kỳ quan trọng: Duyệt qua danh sách data thô,
     * trích xuất mảng byte (Binary) của trường ID và sử dụng {@link ByteBuffer} để chuyển đổi
     * ngược lại thành chuỗi UUID chuẩn. Bước này đảm bảo định danh nhân sự luôn chính xác
     * khi hiển thị trên các Dropdown chọn lựa tại giao diện Quản lý.
     * </p>
     * * @return Danh sách Coordinator với ID đã được chuyển đổi sang định dạng chuỗi UUID.
     */
    public List<Map<String, Object>> getCoordinatorAccounts() {
        // 1. Lấy data thô từ Repository
        List<Map<String, Object>> coordinators = logisticDao.findCoordinatorAccountsRaw();

        // 2. Logic nghiệp vụ (Dịch mảng byte Base64 sang chuỗi UUID) được giữ lại ở Service
        for (Map<String, Object> map : coordinators) {
            Object idObj = map.get("id");
            if (idObj instanceof byte[]) {
                byte[] bytes = (byte[]) idObj;
                ByteBuffer byteBuffer = ByteBuffer.wrap(bytes);
                UUID uuid = new UUID(byteBuffer.getLong(), byteBuffer.getLong());
                map.put("id", uuid.toString());
            }
        }
        return coordinators;
    }
}