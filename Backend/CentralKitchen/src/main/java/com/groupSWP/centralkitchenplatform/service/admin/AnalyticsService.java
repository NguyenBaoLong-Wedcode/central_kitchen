package com.groupSWP.centralkitchenplatform.service.admin;

import com.groupSWP.centralkitchenplatform.dto.analytics.ChartDataPoint;
import com.groupSWP.centralkitchenplatform.dto.analytics.ComparisonMetric;
import com.groupSWP.centralkitchenplatform.dto.analytics.DashboardSummary;
import com.groupSWP.centralkitchenplatform.dto.analytics.ProductReportDto;
import com.groupSWP.centralkitchenplatform.entities.kitchen.InventoryLog;
import com.groupSWP.centralkitchenplatform.entities.logistic.Order;
import com.groupSWP.centralkitchenplatform.entities.logistic.ShipmentDetail;
import com.groupSWP.centralkitchenplatform.repositories.inventory.InventoryLogRepository;
import com.groupSWP.centralkitchenplatform.repositories.inventory.ProductionRunRepository;
import com.groupSWP.centralkitchenplatform.repositories.logistic.ShipmentDetailRepository;
import com.groupSWP.centralkitchenplatform.repositories.order.OrderRepository;
import com.groupSWP.centralkitchenplatform.repositories.inventory.ImportTicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets; // 🌟 Thêm import này
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final OrderRepository orderRepository;
    private final ProductionRunRepository productionRunRepository;
    private final InventoryLogRepository inventoryLogRepository;
    private final ImportTicketRepository importTicketRepository;
    private final ShipmentDetailRepository shipmentDetailRepository;

    // =======================================================================
    // 1. LẤY BÁO CÁO DASHBOARD THEO KHOẢNG THỜI GIAN ĐỘNG
    // =======================================================================
    /**
     * Lấy dữ liệu tổng hợp cho trang chủ Dashboard (Hỗ trợ lọc theo ngày).
     *
     * @param startDate Ngày bắt đầu.
     * @param endDate   Ngày kết thúc.
     * @return Đối tượng DashboardSummary chứa các chỉ số tổng quan và biểu đồ.
     */
    public DashboardSummary getDashboardStats(LocalDateTime startDate, LocalDateTime endDate) {

        // 1. Tính toán khoảng thời gian kỳ trước để đối chiếu tăng trưởng
        long daysBetween = ChronoUnit.DAYS.between(startDate, endDate);
        LocalDateTime previousStartDate = startDate.minusDays(daysBetween + 1);
        LocalDateTime previousEndDate = startDate.minusNanos(1);

        log.info("Đang xuất báo cáo từ {} đến {} (So sánh với {} đến {})",
                startDate.toLocalDate(), endDate.toLocalDate(),
                previousStartDate.toLocalDate(), previousEndDate.toLocalDate());

        // 2. Lấy dữ liệu đơn hàng (Kỳ này & Kỳ trước)
        List<Order> currentOrders = orderRepository.findValidOrdersBetweenDates(startDate, endDate);
        List<Order> previousOrders = orderRepository.findValidOrdersBetweenDates(previousStartDate, previousEndDate);

        // 3. Tính toán các chỉ số xuất kho
        BigDecimal currentExportValue = calculateTotal(currentOrders);
        BigDecimal previousExportValue = calculateTotal(previousOrders);
        long currentOrderCount = currentOrders.size();
        long previousOrderCount = previousOrders.size();

        // 4. Lấy Top 5 sản phẩm Xuất kho
        Pageable top5 = PageRequest.of(0, 5);
        List<ProductReportDto> topExported = orderRepository.findTopExportedProducts(startDate, endDate, top5);
        // 🔥 GỌI SIÊU VŨ KHÍ: Top 5 món bị sự cố/giao thiếu nhiều nhất
        List<ProductReportDto> topIssues = shipmentDetailRepository.findTopIssueProductsInShipment(startDate, endDate, top5);

        // 5. Lấy dữ liệu Chi phí nhập hàng (Tiền đi chợ)
        BigDecimal currentImportValue = importTicketRepository.sumTotalImportAmount(startDate, endDate);
        BigDecimal previousImportValue = importTicketRepository.sumTotalImportAmount(previousStartDate, previousEndDate);

        // 6. Lấy dữ liệu đếm số lần lệch kho (Kiểm kê) thay cho Hao hụt tiền
        long currentStocktakeCount = inventoryLogRepository.countStocktakeDiscrepancies(startDate, endDate);
        long previousStocktakeCount = inventoryLogRepository.countStocktakeDiscrepancies(previousStartDate, previousEndDate);

        // 7. Gom nhóm đơn hàng theo ngày để vẽ biểu đồ
        List<ChartDataPoint> trend = buildChartTrend(currentOrders, startDate, endDate);

        // 8. Xây dựng đối tượng phản hồi
        return DashboardSummary.builder()
                .totalExportValue(buildMetric(currentExportValue, previousExportValue))
                .totalImportValue(buildMetric(currentImportValue, previousImportValue))
                .totalOrders(buildMetric(BigDecimal.valueOf(currentOrderCount), BigDecimal.valueOf(previousOrderCount)))
                .totalStocktakeDiscrepancies(buildMetric(BigDecimal.valueOf(currentStocktakeCount), BigDecimal.valueOf(previousStocktakeCount)))
                .exportTrend(trend)
                .topExportedProducts(topExported)
                // 🔥 NÉM NÓ VÀO ĐÂY (Nhớ dùng đúng tên topIssueProducts nhé)
                .topIssueProducts(topIssues)
                .build();
    }

    // =======================================================================
    // 2. CÁC HÀM PHỤ TRỢ XỬ LÝ SỐ LIỆU (HELPER METHODS)
    // =======================================================================

    private BigDecimal calculateTotal(List<Order> orders) {
        return orders.stream()
                .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private ComparisonMetric buildMetric(BigDecimal current, BigDecimal previous) {
        double growth = 0.0;
        String trend = "FLAT";

        if (previous.compareTo(BigDecimal.ZERO) > 0) {
            growth = current.subtract(previous)
                    .divide(previous, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .doubleValue();
        } else if (current.compareTo(BigDecimal.ZERO) > 0) {
            growth = 100.0; // Từ 0 lên có số -> Tăng 100%
        }

        if (growth > 0) trend = "UP";
        else if (growth < 0) trend = "DOWN";

        return ComparisonMetric.builder()
                .currentValue(current)
                .previousValue(previous)
                .growthPercentage(Math.abs(growth))
                .trend(trend)
                .build();
    }

    private List<ChartDataPoint> buildChartTrend(List<Order> orders, LocalDateTime start, LocalDateTime end) {
        Map<LocalDate, List<Order>> ordersGroupedByDate = orders.stream()
                .collect(Collectors.groupingBy(o -> o.getCreatedAt().toLocalDate()));

        List<ChartDataPoint> trend = new ArrayList<>();
        LocalDate currentDate = start.toLocalDate();
        LocalDate endDateLocal = end.toLocalDate();

        // Chạy vòng lặp từ ngày bắt đầu đến kết thúc để điền đủ dữ liệu các ngày trống
        while (!currentDate.isAfter(endDateLocal)) {
            List<Order> dailyOrders = ordersGroupedByDate.getOrDefault(currentDate, new ArrayList<>());
            long dailyCount = dailyOrders.size();
            BigDecimal dailyRevenue = calculateTotal(dailyOrders);

            trend.add(new ChartDataPoint(currentDate.toString(), dailyRevenue, dailyCount));
            currentDate = currentDate.plusDays(1);
        }
        return trend;
    }

    // =======================================================================
    // 3. XUẤT FILE BÁO CÁO EXCEL (CSV)
    // =======================================================================
    /**
     * Xuất dữ liệu thống kê ra file định dạng CSV.
     *
     * @param startDate Ngày bắt đầu.
     * @param endDate   Ngày kết thúc.
     * @return Mảng byte chứa nội dung file CSV.
     */
    public byte[] exportDashboardToCsv(LocalDateTime startDate, LocalDateTime endDate) {
        DashboardSummary summary = getDashboardStats(startDate, endDate);

        StringBuilder csv = new StringBuilder();

        // Header (BOM để Excel hiển thị đúng tiếng Việt UTF-8)
        csv.append('\ufeff');
        csv.append("BÁO CÁO TỔNG HỢP HOẠT ĐỘNG BẾP TRUNG TÂM\n");
        csv.append("Từ ngày:,").append(startDate.toLocalDate()).append(",Đến ngày:,").append(endDate.toLocalDate()).append("\n");
        csv.append("Ngày xuất báo cáo:,").append(LocalDateTime.now().toLocalDate()).append("\n\n");

        // Chỉ số tổng quan
        csv.append("1. CHỈ SỐ TỔNG QUAN\n");
        csv.append("Tên Chỉ Số,Kỳ Này,Kỳ Trước,Tăng Trưởng (%),Xu Hướng\n");

        csv.append("Tổng Giá Trị Xuất Kho (VNĐ),").append(summary.getTotalExportValue().getCurrentValue()).append(",")
                .append(summary.getTotalExportValue().getPreviousValue()).append(",")
                .append(summary.getTotalExportValue().getGrowthPercentage()).append("%,")
                .append(summary.getTotalExportValue().getTrend()).append("\n");

        csv.append("Tổng Chi Phí Nhập Nguyên Liệu (VNĐ),").append(summary.getTotalImportValue().getCurrentValue()).append(",")
                .append(summary.getTotalImportValue().getPreviousValue()).append(",")
                .append(summary.getTotalImportValue().getGrowthPercentage()).append("%,")
                .append(summary.getTotalImportValue().getTrend()).append("\n");

        csv.append("Tổng Số Đơn Hàng Xuất Đi,").append(summary.getTotalOrders().getCurrentValue()).append(",")
                .append(summary.getTotalOrders().getPreviousValue()).append(",")
                .append(summary.getTotalOrders().getGrowthPercentage()).append("%,")
                .append(summary.getTotalOrders().getTrend()).append("\n");

        csv.append("Tổng Số Lần Lệch Kho (Hao Hụt),").append(summary.getTotalStocktakeDiscrepancies().getCurrentValue()).append(",")
                .append(summary.getTotalStocktakeDiscrepancies().getPreviousValue()).append(",")
                .append(summary.getTotalStocktakeDiscrepancies().getGrowthPercentage()).append("%,")
                .append(summary.getTotalStocktakeDiscrepancies().getTrend()).append("\n\n");

        // Top 5 sản phẩm xuất kho
        csv.append("2. TOP 5 MÓN ĂN XUẤT KHO NHIỀU NHẤT KỲ NÀY\n");
        csv.append("Mã Món Ăn,Tên Món Ăn,Tổng Số Lượng Xuất,Tổng Giá Trị (VNĐ)\n");
        if (summary.getTopExportedProducts() != null && !summary.getTopExportedProducts().isEmpty()) {
            for (ProductReportDto item : summary.getTopExportedProducts()) {
                csv.append(item.getProductId()).append(",")
                        .append(item.getProductName()).append(",")
                        .append(item.getTotalQuantity()).append(",")
                        .append(item.getTotalValue()).append("\n");
            }
        } else {
            csv.append("Không có dữ liệu xuất kho trong kỳ này.,,,\n");
        }
        csv.append("\n");

        // Nhật ký kiểm kê kho
        csv.append("3. CHI TIẾT LỊCH SỬ CHÊNH LỆCH KHO TẠI BẾP (STOCKTAKE)\n");
        csv.append("Ngày Giờ,Tên Nguyên Liệu,Khối Lượng Lệch,Ghi Chú Giải Trình\n");
        List<InventoryLog> logs = inventoryLogRepository.findStocktakeLogs(startDate, endDate);
        if (logs != null && !logs.isEmpty()) {
            for (InventoryLog log : logs) {
                csv.append(log.getCreatedAt()).append(",")
                        .append(log.getIngredient().getName()).append(",")
                        .append(log.getQuantityDeducted()).append(",")
                        .append("\"").append(log.getNote() != null ? log.getNote() : "").append("\"\n");
            }
        } else {
            csv.append("Tuyệt vời! Không phát hiện chênh lệch kho trong kỳ này.,,,\n");
        }
        csv.append("\n");

        // Truy vết lỗi vận chuyển
        csv.append("4. THEO DÕI LOGISTICS: CHI TIẾT CÁC MÓN BỊ GIAO THIẾU/THẤT THOÁT\n");
        csv.append("Mã Chuyến Xe,Tên Món Ăn,Bếp Xuất Đi,Cửa Hàng Nhận,Số Lượng Thiếu,Sự Cố (Cửa hàng báo)\n");
        List<ShipmentDetail> missingDetails = shipmentDetailRepository.findMissingShipmentDetails(startDate, endDate);
        if (missingDetails != null && !missingDetails.isEmpty()) {
            for (ShipmentDetail sd : missingDetails) {
                csv.append(sd.getShipment().getShipmentId()).append(",")
                        .append(sd.getProductName()).append(",")
                        .append(sd.getExpectedQuantity()).append(",")
                        .append(sd.getReceivedQuantity()).append(",")
                        .append(sd.getMissingQuantity()).append(",")
                        .append("\"").append(sd.getIssueNote() != null ? sd.getIssueNote() : "Không có ghi chú").append("\"\n");
            }
        } else {
            csv.append("Hoàn hảo! 100% các chuyến xe đều giao đúng và đủ số lượng.,,,,,\n");
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }
}