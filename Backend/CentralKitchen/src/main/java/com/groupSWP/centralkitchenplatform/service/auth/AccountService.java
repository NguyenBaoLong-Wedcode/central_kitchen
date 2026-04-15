package com.groupSWP.centralkitchenplatform.service.auth;

import com.groupSWP.centralkitchenplatform.dto.auth.AccountResponse;
import com.groupSWP.centralkitchenplatform.dto.auth.UpdateAccountRequest;
import com.groupSWP.centralkitchenplatform.entities.auth.Account;
import com.groupSWP.centralkitchenplatform.entities.auth.Store;
import com.groupSWP.centralkitchenplatform.entities.auth.SystemUser;
import com.groupSWP.centralkitchenplatform.entities.notification.Notification; // 🔥 Thêm import
import com.groupSWP.centralkitchenplatform.repositories.auth.AccountRepository;
import com.groupSWP.centralkitchenplatform.repositories.auth.SystemUserRepository;
import com.groupSWP.centralkitchenplatform.repositories.store.StoreRepository;
import com.groupSWP.centralkitchenplatform.service.notification.NotificationService; // 🔥 Thêm import
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service xử lý các nghiệp vụ quản lý Tài khoản và Luân chuyển nhân sự.
 * <p>
 * Đảm nhiệm các chức năng tra cứu nhân viên, thay đổi chức vụ (Role),
 * khóa/mở khóa tài khoản và đặc biệt là xử lý các quy tắc nghiệp vụ phức tạp
 * khi tháo/lắp Quản lý cho các Cửa hàng.
 * </p>
 */
@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final StoreRepository storeRepository;
    private final SystemUserRepository systemUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService; // 🔥 Tiêm NotificationService

    /**
     * Lấy danh sách toàn bộ tài khoản trong hệ thống (Loại trừ ADMIN).
     *
     * @return Danh sách {@link AccountResponse} của các nhân sự.
     */
    public List<AccountResponse> getAccountsExcludingAdmin() {
        List<Account> accounts = accountRepository.findAllExcludingAdmin();
        return accounts.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    /**
     * Lọc danh sách tài khoản theo trạng thái hoạt động (Loại trừ ADMIN).
     *
     * @param isActive Trạng thái cần lọc (true: Đang hoạt động, false: Đã khóa).
     * @return Danh sách {@link AccountResponse} tương ứng.
     */
    public List<AccountResponse> getAccountsByStatus(boolean isActive) {
        List<Account> accounts = accountRepository.findByIsActiveExcludingAdmin(isActive);
        return accounts.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    /**
     * Tra cứu tài khoản theo Tên hiển thị (Hỗ trợ tìm kiếm tương đối).
     *
     * @param keyword Từ khóa tìm kiếm (Tên nhân sự).
     * @return Danh sách {@link AccountResponse} phù hợp với từ khóa.
     */
    public List<AccountResponse> searchAccountsByFullName(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return getAccountsExcludingAdmin();
        }
        List<Account> accounts = accountRepository.searchByFullNameExcludingAdmin(keyword.trim());
        return accounts.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    /**
     * Hàm Helper: Chuyển đổi Entity Account sang DTO AccountResponse.
     */
    private AccountResponse mapToResponse(Account account) {
        AccountResponse dto = new AccountResponse();
        dto.setAccountId(account.getAccountId());
        dto.setUsername(account.getUsername());
        dto.setRole(account.getRole().name());
        dto.setActive(account.isActive());

        SystemUser systemUser = account.getSystemUser();
        if (systemUser != null) {
            dto.setUserId(systemUser.getUserId());
            dto.setFullName(systemUser.getFullName());
            dto.setEmail(systemUser.getEmail());
        }

        if (account.getStore() != null) {
            dto.setStoreName(account.getStore().getName());
        }

        return dto;
    }

    // =========================================================================
    // 🔥 CÁC HÀM XỬ LÝ NGHIỆP VỤ NHÂN SỰ (ĐÃ NỚI LỎNG CHO FE)
    // =========================================================================

    /**
     * Thay đổi chức vụ (Role) của một tài khoản.
     * <p>
     * Xử lý các quy tắc luân chuyển phức tạp: Thăng chức lên Quản lý cửa hàng,
     * Giáng chức/Chuyển công tác (Có/Không có người thế chỗ).
     * </p>
     *
     * @param accountId            Mã tài khoản cần đổi Role.
     * @param newRoleName          Tên Role mới.
     * @param storeId              (Tùy chọn) Mã cửa hàng nếu thăng chức lên Quản lý.
     * @param replacementAccountId (Tùy chọn) Mã tài khoản thế chỗ nếu rút Quản lý cũ.
     * @return Chuỗi thông báo chi tiết về kết quả luân chuyển.
     */
    @Transactional
    public String changeAccountRole(String accountId, String newRoleName, String storeId, UUID replacementAccountId) {
        Account account = accountRepository.findById(UUID.fromString(accountId))
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với ID: " + accountId));

        Account.Role oldRole = account.getRole();
        Account.Role newRole;
        try {
            newRole = Account.Role.valueOf(newRoleName.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Role không hợp lệ! Vui lòng kiểm tra lại: " + newRoleName);
        }

        if (oldRole == newRole) {
            return "Chức vụ không thay đổi, tài khoản [" + account.getUsername() + "] vẫn là " + oldRole;
        }

        String thongBao = "";

        // 🛑 LUẬT 1: LÊN LÀM QUẢN LÝ (Cho phép làm Quân dự bị nếu FE không truyền storeId)
        if (newRole == Account.Role.STORE_MANAGER) {
            if (storeId != null && !storeId.trim().isEmpty()) {
                Store newStore = storeRepository.findById(storeId)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy cửa hàng với ID: " + storeId));

                if (newStore.getAccount() != null) {
                    throw new RuntimeException("Cửa hàng này ĐÃ CÓ người quản lý! Vui lòng chọn cửa hàng đang trống.");
                }

                account.setStore(newStore);
                newStore.setAccount(account);
                thongBao = "Đã THĂNG CHỨC tài khoản [" + account.getUsername() + "] lên làm Cửa hàng trưởng và giao tiếp quản tiệm [" + newStore.getName() + "].";
            } else {
                // FE không truyền Store -> Thành quân dự bị
                thongBao = "Đã THĂNG CHỨC tài khoản [" + account.getUsername() + "] lên làm Cửa hàng trưởng (Trạng thái: Quân dự bị, chưa có cửa hàng).";
            }
        }
        // 🛑 LUẬT 2: GIÁNG CHỨC / ĐỔI NGÀNH TỪ STORE_MANAGER (Cho phép rút người tự do)
        else if (oldRole == Account.Role.STORE_MANAGER) {
            Store managedStore = account.getStore();

            if (managedStore != null) {
                // Rút ghế quản lý cũ
                account.setStore(null);
                managedStore.setAccount(null);

                // NẾU CÓ NGƯỜI THẾ CHỖ (FE truyền lên)
                if (replacementAccountId != null) {
                    Account replacementAccount = accountRepository.findById(replacementAccountId)
                            .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân sự thế chỗ!"));

                    if (!replacementAccount.isActive() || replacementAccount.getRole() != Account.Role.STORE_MANAGER) {
                        throw new RuntimeException("Người thế chỗ phải đang Hoạt động và mang chức vụ Cửa hàng trưởng!");
                    }
                    if (replacementAccount.getStore() != null) {
                        throw new RuntimeException("Người thế chỗ hiện đang quản lý một cửa hàng khác!");
                    }

                    replacementAccount.setStore(managedStore);
                    managedStore.setAccount(replacementAccount);
                    accountRepository.save(replacementAccount);

                    thongBao = "Đã chuyển công tác tài khoản [" + account.getUsername() + "] sang [" + newRole + "]. " +
                            "Đã bàn giao tiệm [" + managedStore.getName() + "] cho quản lý mới [" + replacementAccount.getUsername() + "].";
                }
                // NẾU KHÔNG CÓ NGƯỜI THẾ CHỖ (Luật mới giải cứu FE)
                else {
                    thongBao = "Đã chuyển chức vụ [" + account.getUsername() + "] sang [" + newRole + "]. " +
                            "⚠️ CẢNH BÁO: Cửa hàng [" + managedStore.getName() + "] hiện đang thiếu Quản lý!";
                }
            } else {
                thongBao = "Đã chuyển đổi chức vụ của quân dự bị [" + account.getUsername() + "] sang [" + newRole + "].";
            }
        }
        // 🛑 LUẬT 3: ĐỔI ROLE BÌNH THƯỜNG KHÁC
        else {
            thongBao = "Đã đổi chức vụ của [" + account.getUsername() + "] từ [" + oldRole + "] sang [" + newRole + "].";
        }

        account.setRole(newRole);
        accountRepository.save(account);

        // 🔥 THÔNG BÁO: Gửi cho chính nhân viên đó biết họ vừa bị luân chuyển
        notificationService.sendNotification(
                account,
                "📋 Cập nhật chức vụ mới",
                "Bạn đã được điều động sang vị trí mới: " + newRole.name() + " trên hệ thống.",
                Notification.NotificationType.INFO,
                null
        );

        // 🔥 THÔNG BÁO: Báo cáo cho MANAGER biết có biến động nhân sự
        notificationService.broadcastNotification(
                List.of("MANAGER"),
                "👥 BIẾN ĐỘNG NHÂN SỰ",
                "Admin vừa thay đổi chức vụ của tài khoản [" + account.getUsername() + "] sang " + newRole.name() + ".",
                Notification.NotificationType.INFO
        );

        return thongBao;
    }

    /**
     * Khóa hoặc Mở khóa tài khoản (Soft Delete).
     * <p>
     * Nếu tài khoản bị khóa đang là Quản lý cửa hàng, hệ thống sẽ thực hiện tháo ghế
     * và cho phép bổ nhiệm quản lý thế chỗ ngay lập tức.
     * </p>
     *
     * @param accountId            Mã tài khoản cần khóa/mở khóa.
     * @param replacementAccountId (Tùy chọn) Mã tài khoản thế chỗ nếu người bị khóa là Quản lý.
     * @return Chuỗi thông báo chi tiết về quá trình xử lý.
     */
    @Transactional
    public String toggleAccountStatus(UUID accountId, UUID replacementAccountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản trong hệ thống!"));

        if (account.getRole() == Account.Role.ADMIN) {
            throw new RuntimeException("Lỗi bảo mật: Không thể khóa tài khoản cấp ADMIN!");
        }

        String detailedMessage = "";

        if (account.isActive()) { // NẾU ĐANG HOẠT ĐỘNG -> TIẾN HÀNH KHÓA
            Store managedStore = account.getStore();

            if (managedStore != null) {
                // Tháo ghế
                account.setStore(null);
                managedStore.setAccount(null);
                accountRepository.saveAndFlush(account);

                if (replacementAccountId != null) {
                    Account replacementAccount = accountRepository.findById(replacementAccountId)
                            .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên thế chỗ!"));

                    if (!replacementAccount.isActive() || replacementAccount.getStore() != null) {
                        throw new RuntimeException("Người thế chỗ phải đang hoạt động và chưa quản lý tiệm nào!");
                    }

                    replacementAccount.setStore(managedStore);
                    managedStore.setAccount(replacementAccount);
                    accountRepository.save(replacementAccount);

                    detailedMessage = "Đã KHÓA quản lý cũ [" + account.getUsername() + "]. " +
                            "Đã bổ nhiệm quản lý mới [" + replacementAccount.getUsername() + "] vào tiệm [" + managedStore.getName() + "].";
                } else {
                    // LUẬT MỚI: Khóa nhưng không ai thế chỗ
                    detailedMessage = "Đã KHÓA tài khoản [" + account.getUsername() + "]. " +
                            "⚠️ CẢNH BÁO: Cửa hàng [" + managedStore.getName() + "] hiện đang hoạt động nhưng THIẾU QUẢN LÝ!";
                }
            } else {
                detailedMessage = "Đã KHÓA tài khoản [" + account.getUsername() + "] thành công!";
            }
        } else {
            detailedMessage = "Đã MỞ KHÓA tài khoản [" + account.getUsername() + "] thành công!";
        }

        account.setActive(!account.isActive());
        accountRepository.save(account);

        // 🔥 THÔNG BÁO: Báo cáo cho MANAGER biết tài khoản vừa bị khóa/mở
        notificationService.broadcastNotification(
                List.of("MANAGER"),
                "🔒 TRẠNG THÁI TÀI KHOẢN",
                account.isActive() ?
                        "Tài khoản [" + account.getUsername() + "] vừa được MỞ KHÓA lại." :
                        "Tài khoản [" + account.getUsername() + "] vừa bị KHÓA.",
                Notification.NotificationType.WARNING
        );

        return detailedMessage;
    }

    /**
     * Gán hoặc Tháo Cửa hàng của một tài khoản STORE_MANAGER.
     *
     * @param accountId Mã tài khoản Quản lý.
     * @param storeId   Mã cửa hàng (Nếu null hoặc rỗng -> Tháo cửa hàng hiện tại để rút về dự bị).
     * @return Chuỗi thông báo chi tiết luân chuyển.
     */
    @Transactional
    public String assignStoreToAccount(String accountId, String storeId) {
        Account account = accountRepository.findById(UUID.fromString(accountId))
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với ID: " + accountId));

        if (account.getRole() != Account.Role.STORE_MANAGER) {
            throw new RuntimeException("Chỉ tài khoản STORE_MANAGER mới có thể gán hoặc tháo cửa hàng!");
        }

        Store oldStore = account.getStore();
        String thongBao = "";

        // NẾU THÁO CỬA HÀNG (Rút về dự bị)
        if (storeId == null || storeId.trim().isEmpty()) {
            if (oldStore != null) {
                oldStore.setAccount(null);
                account.setStore(null);
                thongBao = "Đã RÚT QUẢN LÝ [" + account.getUsername() + "] khỏi tiệm. " +
                        "⚠️ CẢNH BÁO: Cửa hàng [" + oldStore.getName() + "] hiện đang THIẾU QUẢN LÝ!";
            } else {
                thongBao = "Tài khoản [" + account.getUsername() + "] hiện tại đã là Quân dự bị rồi!";
            }
        }
        // NẾU GÁN VÀO CỬA HÀNG MỚI
        else {
            Store newStore = storeRepository.findById(storeId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy cửa hàng với ID: " + storeId));

            if (newStore.getAccount() != null && !newStore.getAccount().getAccountId().equals(account.getAccountId())) {
                throw new RuntimeException("Cửa hàng đích ĐÃ CÓ người quản lý rồi! Không thể gán thêm.");
            }

            if (oldStore != null && !oldStore.getStoreId().equals(storeId)) {
                oldStore.setAccount(null);
                account.setStore(null);
                accountRepository.saveAndFlush(account);
                thongBao = "Đã luân chuyển quản lý [" + account.getUsername() + "] sang tiệm [" + newStore.getName() + "]. " +
                        "⚠️ CẢNH BÁO: Cửa hàng cũ [" + oldStore.getName() + "] hiện đang THIẾU QUẢN LÝ!";
            } else if (oldStore == null) {
                thongBao = "Đã BỔ NHIỆM quản lý dự bị [" + account.getUsername() + "] vào tiếp quản tiệm [" + newStore.getName() + "].";
            } else {
                thongBao = "Nhân sự [" + account.getUsername() + "] đang quản lý tiệm [" + newStore.getName() + "] này rồi!";
            }

            account.setStore(newStore);
            newStore.setAccount(account);
        }

        accountRepository.save(account);

        // 🔥 THÔNG BÁO: Báo cho MANAGER biết việc tháo/lắp Cửa hàng trưởng
        notificationService.broadcastNotification(
                List.of("MANAGER"),
                "🏪 CẬP NHẬT QUẢN LÝ CỬA HÀNG",
                thongBao,
                Notification.NotificationType.INFO
        );

        return thongBao;
    }

    /**
     * Hoán đổi vị trí cửa hàng giữa 2 Cửa hàng trưởng.
     * <p>Xử lý luân chuyển chéo an toàn trong cùng một giao dịch (Transaction).</p>
     *
     * @param accountId1 Mã tài khoản Quản lý thứ 1.
     * @param accountId2 Mã tài khoản Quản lý thứ 2.
     * @return Chuỗi thông báo hoán đổi thành công.
     */
    @Transactional
    public String swapManagers(UUID accountId1, UUID accountId2) {
        if (accountId1.equals(accountId2)) {
            throw new RuntimeException("Lỗi: Không thể hoán đổi cùng một người!");
        }

        Account acc1 = accountRepository.findById(accountId1)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản nhân viên thứ 1!"));
        Account acc2 = accountRepository.findById(accountId2)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản nhân viên thứ 2!"));

        if (!acc1.isActive() || !acc2.isActive()) {
            throw new RuntimeException("Cả hai tài khoản phải đang hoạt động (Active) mới có thể hoán đổi!");
        }

        Store store1 = acc1.getStore();
        Store store2 = acc2.getStore();

        if (store1 == null || store2 == null) {
            throw new RuntimeException("Cả hai nhân viên đều phải đang quản lý cửa hàng thì mới có thể hoán đổi cho nhau!");
        }

        // BƯỚC 1: THÁO GHẾ CẢ 2 NGƯỜI RA TRƯỚC
        acc1.setStore(null);
        store1.setAccount(null);
        acc2.setStore(null);
        store2.setAccount(null);
        accountRepository.saveAndFlush(acc1);
        accountRepository.saveAndFlush(acc2);

        // BƯỚC 2: TRÁO ĐỔI HỘ KHẨU
        acc1.setStore(store2);
        store2.setAccount(acc1);
        acc2.setStore(store1);
        store1.setAccount(acc2);

        accountRepository.save(acc1);
        accountRepository.save(acc2);

        // 🔥 THÔNG BÁO: Báo cho MANAGER biết việc hoán đổi
        notificationService.broadcastNotification(
                List.of("MANAGER"),
                "🔄 HOÁN ĐỔI NHÂN SỰ",
                "Admin vừa thực hiện hoán đổi vị trí giữa [" + acc1.getUsername() + "] và [" + acc2.getUsername() + "].",
                Notification.NotificationType.INFO
        );

        return "Đã HOÁN ĐỔI VỊ TRÍ thành công! " +
                "Quản lý [" + acc1.getUsername() + "] chuyển sang tiệm [" + store2.getName() + "]. " +
                "Quản lý [" + acc2.getUsername() + "] chuyển sang tiệm [" + store1.getName() + "].";
    }

    /**
     * Cập nhật thông tin Email của tài khoản.
     * <p>Đảm bảo email mới không bị trùng lặp với người khác trong hệ thống.</p>
     *
     * @param accountId Mã tài khoản cần cập nhật.
     * @param request   Payload chứa địa chỉ Email mới.
     * @return Chuỗi thông báo cập nhật thành công.
     */
    @Transactional(rollbackFor = Exception.class)
    public String updateAccountEmail(String accountId, UpdateAccountRequest request) {
        // 1. Tìm Account
        Account account = accountRepository.findById(UUID.fromString(accountId))
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với ID: " + accountId));

        // 2. Lấy hồ sơ (SystemUser)
        SystemUser profile = account.getSystemUser();
        if (profile == null) {
            throw new RuntimeException("Tài khoản này chưa có hồ sơ nhân sự (SystemUser)!");
        }

        // 3. Kiểm tra và Cập nhật Email
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new RuntimeException("Vui lòng nhập Email mới cần cập nhật!");
        }

        String cleanEmail = request.getEmail().trim();

        // Kiểm tra xem email mới này có bị ai khác dùng chưa (loại trừ chính mình)
        Optional<SystemUser> existingEmailUser = systemUserRepository.findByEmail(cleanEmail);
        if (existingEmailUser.isPresent() && !existingEmailUser.get().getUserId().equals(profile.getUserId())) {
            throw new RuntimeException("Lỗi: Email [" + cleanEmail + "] đã được sử dụng cho một tài khoản khác!");
        }

        // Lưu email mới
        profile.setEmail(cleanEmail);
        systemUserRepository.save(profile);

        return "Đã cập nhật Email mới thành công cho tài khoản [" + account.getUsername() + "]!";
    }
}