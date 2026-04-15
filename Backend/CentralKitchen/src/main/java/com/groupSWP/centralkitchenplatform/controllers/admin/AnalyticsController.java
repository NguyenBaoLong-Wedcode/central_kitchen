package com.groupSWP.centralkitchenplatform.controllers.admin;

import com.groupSWP.centralkitchenplatform.dto.analytics.DashboardSummary;
import com.groupSWP.centralkitchenplatform.service.admin.AnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

/**
 * Controller cung cấp các API thống kê và phân tích dữ liệu (Analytics) dành cho cấp Quản lý.
 * <p>
 * Lớp này đóng vai trò quan trọng trong hệ thống CentralKitchen, giúp các cấp quản lý
 * (Manager, Admin) có cái nhìn tổng quan về tình hình hoạt động của nền tảng.
 * Thông qua các API được cung cấp, hệ thống sẽ trích xuất, tổng hợp và định dạng
 * các luồng dữ liệu phức tạp từ cơ sở dữ liệu thành các con số thống kê trực quan.
 * Hỗ trợ theo dõi sát sao tình hình xuất nhập kho, doanh thu, và hiệu suất hoạt động
 * theo từng mốc thời gian cụ thể, từ đó đưa ra các quyết định chiến lược kịp thời.
 * </p>
 *
 * @author Đạt, Huy, Triển
 * @version 1.0
 * @since 2026-03-29
 */
@Slf4j
@RestController
@RequestMapping("/api/manager/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')") // 🌟 BẢO MẬT: Khóa chặt cho cấp Quản lý
public class AnalyticsController {

    /**
     * Service xử lý các nghiệp vụ thống kê phức tạp, tính toán số liệu cho Dashboard.
     */
    private final AnalyticsService analyticsService;

    /**
     * API Lấy dữ liệu tổng hợp cho trang chủ Dashboard (Hỗ trợ lọc theo ngày).
     * <p>
     * Truy xuất dữ liệu "sống" 100% từ Database. Hỗ trợ Frontend truyền startDate và endDate
     * để xem theo tuần, tháng, quý, năm. Nếu không cung cấp tham số thời gian, hệ thống
     * sẽ tự động lấy dữ liệu mặc định của 7 ngày gần nhất tính đến thời điểm hiện tại.
     * </p>
     *
     * @param startDate Ngày bắt đầu để lọc dữ liệu (Định dạng: YYYY-MM-DD). Không bắt buộc.
     * @param endDate   Ngày kết thúc để lọc dữ liệu (Định dạng: YYYY-MM-DD). Không bắt buộc.
     * @return Phản hồi HTTP 200 chứa đối tượng {@link DashboardSummary} bao gồm các chỉ số thống kê.
     */
    @GetMapping("/dashboard") // 🔥 FIX: Đổi tên /revenue thành /dashboard
    public ResponseEntity<DashboardSummary> getDashboardStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        // 🌟 LOGIC MẶC ĐỊNH THỜI GIAN (Tránh lỗi nếu FE quên truyền)
        // Mặc định hiển thị dữ liệu 7 ngày gần nhất
        if (endDate == null) {
            endDate = LocalDate.now();
        }
        if (startDate == null) {
            startDate = endDate.minusDays(6); // Lùi 6 ngày + hôm nay = 7 ngày
        }

        // Ép kiểu sang LocalDateTime (Lấy từ 00:00:00 ngày bắt đầu -> 23:59:59 ngày kết thúc)
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);

        log.info("Manager đang xem thống kê xuất kho từ {} đến {}", startDateTime, endDateTime);

        DashboardSummary summary = analyticsService.getDashboardStats(startDateTime, endDateTime);
        return ResponseEntity.ok(summary);
    }

    /**
     * API Xuất file báo cáo Thống kê ra định dạng EXCEL (CSV).
     * <p>
     * Frontend gọi API này, Browser sẽ tự động nhận diện header Content-Disposition
     * và tải file .csv về máy tính của người dùng. Dữ liệu trong file được tổng hợp
     * theo đúng khoảng thời gian được yêu cầu, phục vụ cho mục đích lưu trữ ngoại tuyến,
     * báo cáo định kỳ hoặc import vào các công cụ phân tích dữ liệu chuyên sâu khác.
     * </p>
     *
     * @param startDate Ngày bắt đầu lấy dữ liệu báo cáo (Định dạng: YYYY-MM-DD). Không bắt buộc.
     * @param endDate   Ngày kết thúc lấy dữ liệu báo cáo (Định dạng: YYYY-MM-DD). Không bắt buộc.
     * @return Phản hồi HTTP 200 chứa mảng byte (byte[]) của nội dung file CSV kèm các header cần thiết để tải file.
     */
    @GetMapping(value = "/export/csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportDashboardCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        if (endDate == null) endDate = LocalDate.now();
        if (startDate == null) startDate = endDate.minusDays(6);

        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);

        // Lấy ruột file CSV
        byte[] csvData = analyticsService.exportDashboardToCsv(startDateTime, endDateTime);

        // Tạo tên file linh động theo ngày
        String fileName = "Bao_Cao_Dashboard_" + LocalDate.now() + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName)
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvData);
    }
}