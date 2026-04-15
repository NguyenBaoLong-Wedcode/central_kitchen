package com.groupSWP.centralkitchenplatform.service.inventory;

import com.groupSWP.centralkitchenplatform.dto.inventory.ImportRequest;
import com.groupSWP.centralkitchenplatform.dto.inventory.ImportTicketResponse;
import com.groupSWP.centralkitchenplatform.entities.auth.Account;
import com.groupSWP.centralkitchenplatform.entities.auth.SystemUser;
import com.groupSWP.centralkitchenplatform.entities.common.UnitType;
import com.groupSWP.centralkitchenplatform.entities.kitchen.Ingredient;
import com.groupSWP.centralkitchenplatform.entities.notification.Notification; // 🔥 Thêm import
import com.groupSWP.centralkitchenplatform.entities.procurement.ImportItem;
import com.groupSWP.centralkitchenplatform.entities.procurement.ImportTicket;
import com.groupSWP.centralkitchenplatform.repositories.auth.AccountRepository;
import com.groupSWP.centralkitchenplatform.repositories.inventory.ImportTicketRepository;
import com.groupSWP.centralkitchenplatform.repositories.product.IngredientRepository;
import com.groupSWP.centralkitchenplatform.repositories.product.UnitConversionRepository;
import com.groupSWP.centralkitchenplatform.service.notification.NotificationService; // 🔥 Thêm import
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Service quản lý các nghiệp vụ Kho và Nhập xuất nguyên liệu (Inventory Management).
 * <p>
 * Đảm nhiệm việc tạo phiếu nhập kho, tự động tính toán quy đổi đơn vị (Unit Conversion),
 * cập nhật số lượng tồn kho vật lý (Kitchen Stock) và tính toán giá vốn nguyên liệu theo chuẩn kế toán.
 * </p>
 */
@Service
@RequiredArgsConstructor
public class InventoryService {

    private final ImportTicketRepository ticketRepository;
    private final IngredientRepository ingredientRepository;
    private final AccountRepository accountRepository;
    private final UnitConversionRepository conversionRepository;
    private final NotificationService notificationService; // 🔥 Tiêm NotificationService

    /**
     * Xử lý nghiệp vụ Nhập kho nguyên liệu.
     * <p>
     * Hệ thống sẽ duyệt qua danh sách nguyên liệu đầu vào, đối chiếu với cấu hình quy đổi đơn vị
     * để quy về đơn vị gốc (Base Unit). Sau đó, thực hiện:
     * <ul>
     * <li>Tính toán giá vốn của 1 đơn vị gốc dựa trên tổng tiền dòng nhập.</li>
     * <li>Cộng dồn số lượng vào tồn kho hiện tại.</li>
     * <li>Tạo và lưu trữ Phiếu nhập kho (Import Ticket) kèm chi tiết từng mặt hàng để phục vụ truy xuất FIFO.</li>
     * </ul>
     * </p>
     *
     * @param request  Payload chứa danh sách các nguyên liệu cần nhập, số lượng, đơn vị và tổng tiền.
     * @param username Tên đăng nhập của người dùng thực hiện thao tác (lấy từ Token).
     * @return Đối tượng {@link ImportTicketResponse} chứa thông tin chi tiết phiếu nhập vừa tạo.
     * @throws IllegalArgumentException nếu danh sách trống hoặc số lượng không hợp lệ.
     * @throws RuntimeException nếu không tìm thấy nguyên liệu, tài khoản hoặc luật quy đổi đơn vị.
     */
    @Transactional
    public ImportTicketResponse importIngredients(ImportRequest request, String username) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Danh sách nguyên liệu nhập không được để trống!");
        }

        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản: " + username));

        SystemUser currentUser = account.getSystemUser();
        if (currentUser == null) {
            throw new RuntimeException("Tài khoản này chưa được liên kết với hồ sơ nhân viên!");
        }

        ImportTicket ticket = ImportTicket.builder()
                .ticketId("IM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .note(request.getNote())
                .status(ImportTicket.ImportStatus.COMPLETED)
                .createdBy(currentUser)
                .totalAmount(BigDecimal.ZERO)
                .build();

        List<ImportItem> importItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (ImportRequest.ItemRequest itemReq : request.getItems()) {
            if (itemReq.getQuantity() == null || itemReq.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Số lượng nhập của nguyên liệu ID " + itemReq.getIngredientId() + " phải lớn hơn 0!");
            }

            Ingredient ingredient = ingredientRepository.findById(itemReq.getIngredientId())
                    .orElseThrow(() -> new RuntimeException("Nguyên liệu không tồn tại: " + itemReq.getIngredientId()));

            BigDecimal conversionFactor = BigDecimal.ONE;

            if (itemReq.getUnit() != null && !itemReq.getUnit().trim().equalsIgnoreCase(ingredient.getUnit().name())) {
                UnitType targetUnit;
                try {
                    targetUnit = UnitType.valueOf(itemReq.getUnit().trim().toUpperCase());
                } catch (IllegalArgumentException e) {
                    throw new IllegalArgumentException("Đơn vị tính không hợp lệ: " + itemReq.getUnit());
                }

                var conversion = conversionRepository.findByIngredientAndUnit(ingredient, targetUnit)
                        .orElseThrow(() -> new RuntimeException("Chưa cài đặt luật quy đổi cho đơn vị: " + itemReq.getUnit()));

                conversionFactor = conversion.getConversionFactor();
            }

            BigDecimal baseQuantity = itemReq.getQuantity().multiply(conversionFactor);

            // 👉 ĐIỂM FIX THEO Ý SẾP: itemReq.getImportPrice() đang là TỔNG TIỀN của dòng nhập này
            BigDecimal lineTotal = itemReq.getImportPrice();
            // 👉 CHIA NGƯỢC: Lấy Tổng tiền / Tổng số lượng gốc = Giá của 1 Đơn Vị Gốc
            // 🌟 FIX LỖI TIỀN LẺ: Chia lấy 4 số thập phân để đảm bảo chính xác tuyệt đối khi nhân ngược lại
            BigDecimal baseUnitCost = lineTotal.divide(baseQuantity, 4, RoundingMode.HALF_UP);

            // =========================================================================
            // 🌟 TÍNH TOÁN LẠI GIÁ VỐN BÌNH QUÂN GIA QUYỀN (MOVING AVERAGE COST - MAC)
            // =========================================================================
            BigDecimal currentStock = (ingredient.getKitchenStock() == null) ? BigDecimal.ZERO : ingredient.getKitchenStock();
            BigDecimal currentUnitCost = (ingredient.getUnitCost() == null) ? BigDecimal.ZERO : ingredient.getUnitCost();

            BigDecimal oldTotalValue = currentStock.multiply(currentUnitCost);
            BigDecimal newTotalValue = lineTotal;
            BigDecimal newStock = currentStock.add(baseQuantity);

            BigDecimal movingAverageCost = BigDecimal.ZERO;
            if (newStock.compareTo(BigDecimal.ZERO) > 0) {
                movingAverageCost = oldTotalValue.add(newTotalValue).divide(newStock, 4, RoundingMode.HALF_UP);
            }
            // =========================================================================

            // 🔥 ĐIỂM ĂN TIỀN LÀ ĐÂY: Thêm remainingQuantity để FIFO có data mà trừ!
            ImportItem importItem = ImportItem.builder()
                    .importTicket(ticket)
                    .ingredient(ingredient)
                    .quantity(itemReq.getQuantity())
                    .remainingQuantity(baseQuantity)      // Dòng sống còn của kho vật lý!
                    .importPrice(baseUnitCost)            // 👉 LƯU GIÁ VỐN 1 ĐƠN VỊ GỐC (Thay vì lưu itemReq.getImportPrice())
                    .build();
            importItems.add(importItem);

            // 👉 CỘNG THẲNG TIỀN VÀO TỔNG PHIẾU NHẬP (Không nhân thêm quantity nữa)
            totalAmount = totalAmount.add(lineTotal);

            // 🌟 Cập nhật lại kho và đè đơn giá bằng thuật toán MAC
            ingredient.setKitchenStock(newStock);
            ingredient.setUnitCost(movingAverageCost);

            ingredientRepository.save(ingredient);
        }

        ticket.setImportItems(importItems);
        ticket.setTotalAmount(totalAmount);
        ImportTicket savedTicket = ticketRepository.save(ticket);

        // 🔥 THÔNG BÁO: Báo cho Bếp trưởng biết là kho mới được "bơm máu"
        notificationService.broadcastNotification(
                List.of("ADMIN","KITCHEN_MANAGER"),
                "📦 NHẬP KHO THÀNH CÔNG",
                "Phiếu nhập kho " + savedTicket.getTicketId() + " đã hoàn tất. Nguyên vật liệu đã được cộng vào hệ thống!",
                Notification.NotificationType.SUCCESS
        );

        return mapToResponse(savedTicket);
    }

    /**
     * Hàm Helper: Chuyển đổi Entity ImportTicket sang DTO ImportTicketResponse.
     *
     * @param ticket Thực thể Phiếu nhập kho vừa được lưu.
     * @return DTO chứa dữ liệu phản hồi đã được định dạng cho Frontend.
     */
    private ImportTicketResponse mapToResponse(ImportTicket ticket) {
        List<ImportTicketResponse.ImportItemResponse> itemResponses = ticket.getImportItems().stream()
                .map(item -> ImportTicketResponse.ImportItemResponse.builder()
                        .ingredientName(item.getIngredient().getName())
                        .unit(item.getIngredient().getUnit().name())
                        .quantity(item.getQuantity())
                        .importPrice(item.getImportPrice())
                        .totalPrice(item.getImportPrice().multiply(item.getQuantity()))
                        .build())
                .toList();

        return ImportTicketResponse.builder()
                .ticketId(ticket.getTicketId())
                .importDate(ticket.getCreatedAt())
                .note(ticket.getNote())
                .totalAmount(ticket.getTotalAmount())
                .status(ticket.getStatus().name())
                .createdByName(ticket.getCreatedBy().getFullName())
                .items(itemResponses)
                .build();
    }

    /**
     * Lấy toàn bộ lịch sử các Phiếu nhập kho (kèm chi tiết từng món).
     * Sắp xếp từ mới nhất đến cũ nhất.
     */
    @Transactional(readOnly = true)
    public List<ImportTicketResponse> getAllImportHistory() {
        // 1. Lấy tất cả các phiếu nhập từ Database
        List<ImportTicket> tickets = ticketRepository.findAllByOrderByCreatedAtDesc();

        // 2. Dùng hàm mapToResponse có sẵn để chuyển đổi Entity sang DTO và trả về
        return tickets.stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ImportTicketResponse> getImportHistoryByTime(Integer year, Integer month, Integer day) {
        LocalDateTime startDate;
        LocalDateTime endDate;

        // Nếu không truyền năm, mặc định trả về tất cả
        if (year == null) {
            return getAllImportHistory();
        }

        if (month != null && day != null) {
            // Trường hợp 1: Lọc theo NGÀY cụ thể (Ví dụ: 18/03/2026)
            startDate = LocalDateTime.of(year, month, day, 0, 0, 0); // 00:00:00 của ngày đó
            endDate = LocalDateTime.of(year, month, day, 23, 59, 59, 999999999); // 23:59:59 của ngày đó

        } else if (month != null) {
            // Trường hợp 2: Lọc theo THÁNG (Ví dụ: Tháng 03/2026)
            YearMonth yearMonth = YearMonth.of(year, month);
            startDate = yearMonth.atDay(1).atStartOfDay(); // Ngày 1 của tháng, lúc 00:00:00
            endDate = yearMonth.atEndOfMonth().atTime(23, 59, 59, 999999999); // Ngày cuối cùng của tháng, lúc 23:59:59

        } else {
            // Trường hợp 3: Lọc theo NĂM (Ví dụ: Năm 2026)
            startDate = LocalDateTime.of(year, 1, 1, 0, 0, 0); // 01/01/Năm lúc 00:00:00
            endDate = LocalDateTime.of(year, 12, 31, 23, 59, 59, 999999999); // 31/12/Năm lúc 23:59:59
        }

        // Truy vấn DB bằng hàm đã tạo ở Repository
        List<ImportTicket> tickets = ticketRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(startDate, endDate);

        // Map sang DTO trả về cho gọn đẹp
        return tickets.stream()
                .map(this::mapToResponse)
                .toList();
    }
}