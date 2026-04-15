package com.groupSWP.centralkitchenplatform.dao;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * Repository chuyên thực thi các câu lệnh SQL thuần (Native SQL) cho luồng Logistics.
 * <p>
 * Lớp DAO này đóng vai trò là tầng truy cập dữ liệu hiệu năng cao, tập trung vào các truy vấn
 * đọc (Read-only) phức tạp phục vụ cho Dashboard điều phối. Việc sử dụng {@link JdbcTemplate}
 * thay vì JPA tiêu chuẩn cho phép hệ thống thực hiện các phép JOIN nhiều bảng (Orders, Stores, Shipments)
 * một cách linh hoạt, trích xuất chính xác các trường dữ liệu cần thiết mà không làm giảm
 * hiệu năng do cơ chế mapping tự động.
 * </p>
 * <p>
 * <b>Luồng nghiệp vụ:</b> Dữ liệu từ lớp này cung cấp cái nhìn toàn cảnh cho Điều phối viên
 * về vòng đời vận chuyển: từ khi đơn hàng ở trạng thái sẵn sàng (Ready), đang lưu thông trên đường
 * (Active) cho đến khi hoàn tất bàn giao (History). Các câu lệnh SQL được tối ưu hóa để đảm bảo
 * tính thời gian thực (Real-time) cho các thao tác giám sát xe và tài xế trong chuỗi cung ứng.
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0
 * @since 2026-03-29
 */
@Repository
@RequiredArgsConstructor
public class LogisticDao {

    /**
     * Công cụ hỗ trợ thực thi SQL thuần và map kết quả về dạng List/Map linh động.
     */
    private final JdbcTemplate jdbcTemplate;

    /**
     * Truy xuất danh sách đơn hàng đã sẵn sàng nhưng chưa có chuyến xe.
     * <p>
     * Câu lệnh thực hiện kết hợp bảng Orders và Stores để lấy thông tin chi nhánh đặt hàng.
     * Đây là dữ liệu đầu vào quan trọng cho quy trình gom đơn và tạo chuyến xe thủ công.
     * </p>
     * * @return Danh sách các bản ghi chứa: order_id, store_name, order_type và status.
     */
    public List<Map<String, Object>> findReadyOrders() {
        String sql = "SELECT o.order_id, s.name, o.order_type, o.status " +
                "FROM orders o " +
                "JOIN stores s ON o.store_id = s.store_id " +
                "WHERE o.status = 'READY_TO_SHIP' AND o.shipment_id IS NULL";
        return jdbcTemplate.queryForList(sql);
    }

    /**
     * Truy xuất các chuyến xe đang trong quá trình vận hành (Chờ chạy hoặc Đang chạy).
     * <p>
     * Câu lệnh JOIN 3 bảng để cung cấp đầy đủ thông tin về Tài xế, Biển số xe và
     * danh sách các Cửa hàng nằm trong lộ trình của chuyến xe đó.
     * </p>
     * * @return Danh sách thông tin vận chuyển chi tiết sắp xếp theo thời gian tạo mới nhất.
     */
    public List<Map<String, Object>> findActiveShipments() {
        // 🔥 Đã thêm: store_name (Tên cửa hàng), address, order_id, shipment_type, created_at
        String sql = "SELECT sh.shipment_id, sh.driver_name AS driver, sh.vehicle_plate AS plate, sh.status, " +
                "sh.shipment_type, sh.created_at, " +
                "o.order_id, s.name AS store_name, s.address AS store_address " +
                "FROM shipments sh " +
                "LEFT JOIN orders o ON sh.shipment_id = o.shipment_id " +
                "LEFT JOIN stores s ON o.store_id = s.store_id " +
                "WHERE sh.status IN ('PENDING', 'SHIPPING') " +
                "ORDER BY sh.created_at DESC";
        return jdbcTemplate.queryForList(sql);
    }

    /**
     * Lấy chi tiết số lượng hàng hóa cụ thể cho từng chuyến xe.
     * * @param shipmentId Mã định danh của chuyến xe cần tra cứu.
     * @return Danh sách sản phẩm kèm số lượng dự kiến có trên xe.
     */
    public List<Map<String, Object>> findShipmentDetails(String shipmentId) {
        String sql = "SELECT product_name, expected_quantity FROM shipment_details WHERE shipment_id = ?";
        return jdbcTemplate.queryForList(sql, shipmentId);
    }

    /**
     * Truy xuất lịch sử toàn bộ các chuyến xe đã kết thúc hành trình.
     * <p>
     * Hỗ trợ bộ phận đối soát xem lại các chuyến xe thành công hoặc các chuyến xe
     * gặp sự cố trong quá trình vận chuyển để có phương án xử lý (Resolve).
     * </p>
     * * @return Danh sách lịch sử vận chuyển đã hoàn tất hoặc đã xử lý xong.
     */
    public List<Map<String, Object>> findCompletedShipments() {
        // 🔥 Đã thêm: store_name, order_id, shipment_type, delivered_at (thời gian giao thực tế)
        // Lưu ý: Đã bổ sung thêm trạng thái ISSUE_REPORTED (có báo cáo lỗi) vào lịch sử
        String sql = "SELECT sh.shipment_id, sh.driver_name AS driver, sh.vehicle_plate AS plate, sh.status, " +
                "sh.shipment_type, sh.delivered_at, sh.resolved_at, " +
                "o.order_id, s.name AS store_name " +
                "FROM shipments sh " +
                "LEFT JOIN orders o ON sh.shipment_id = o.shipment_id " +
                "LEFT JOIN stores s ON o.store_id = s.store_id " +
                "WHERE sh.status IN ('DELIVERED', 'ISSUE_REPORTED', 'RESOLVED') " +
                "ORDER BY sh.updated_at DESC";
        return jdbcTemplate.queryForList(sql);
    }

    /**
     * Lấy danh sách tài khoản nhân sự có vai trò Điều phối viên (Coordinator).
     * <p>
     * Sử dụng để đổ dữ liệu vào các Dropdown chọn tài xế hoặc người chịu trách nhiệm chuyến xe.
     * </p>
     * * @return Danh sách tài khoản kèm họ tên đầy đủ từ bảng thông tin hệ thống.
     */
    public List<Map<String, Object>> findCoordinatorAccountsRaw() {
        String sql = "SELECT a.account_id AS id, a.username, a.role, su.full_name AS fullName " +
                "FROM accounts a " +
                "LEFT JOIN system_users su ON a.account_id = su.account_id " +
                "WHERE a.role = 'COORDINATOR'";

        return jdbcTemplate.queryForList(sql);
    }
}