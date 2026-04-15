package com.groupSWP.centralkitchenplatform.repositories.auth;

import com.groupSWP.centralkitchenplatform.entities.auth.Account;
import com.groupSWP.centralkitchenplatform.entities.auth.SystemUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SystemUserRepository extends JpaRepository<SystemUser, String> {

    // ĐÃ SỬA: Đi qua object account để lấy role (s.account.role)
    // Đổi kiểu dữ liệu tham số thành Account.Role
    @Query("SELECT s.userId FROM SystemUser s WHERE s.account.role = :role ORDER BY s.userId DESC LIMIT 1")
    Optional<String> findLastUserIdByRole(@Param("role") Account.Role role);

    Optional<SystemUser> findByEmail(String email);

    Optional<SystemUser> findByAccount_Username(String username); // cái này đang làm task 3
}