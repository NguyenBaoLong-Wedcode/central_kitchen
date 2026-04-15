import React, { useState, useEffect } from "react";
import api from "./services/api";
import LoginPage from "./pages/Login";
import FranchiseStorePage from "./pages/FranchiseStore";
import AdminPage from "./pages/Admin";
import CentralKitchenPage from "./pages/CentralKitchen";
// BƯỚC QUAN TRỌNG: IMPORT THÊM TRANG CỦA MANAGER VÀO ĐÂY NHA BẠN
import ManagerPage from "./pages/Manager"; // Tí nhớ tạo file này nha!
import SupplyCoordinatorPage from "./pages/SupplyCoordinator"; //

import "./styles/app.css";
import ThemeToggleButton from "./components/common/ThemeToggleButton";
import { useUiTheme } from "./context/UiThemeContext";
import { UnitsProvider } from "./context/UnitsContext";

function App() {
  const { uiTheme } = useUiTheme();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    api.init();
    if (api.isAuthenticated()) {
      const stored = api.getStoredUser();
      if (stored) setCurrentUser(stored);
    }
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  /** Sau khi cập nhật hồ sơ (PUT /api/auth/update-profile), đồng bộ lại user từ storage (dùng cho các role trừ Admin). */
  const handleProfileUpdated = () => {
    const stored = api.getStoredUser();
    if (stored) setCurrentUser(stored);
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const userData = {
    ...currentUser,
    name: currentUser.fullName || currentUser.name || currentUser.username,
    storeName:
      currentUser.storeName ||
      (currentUser.role === "kitchen" ? "Bếp trung tâm" : currentUser.username),
  };

  // 1. NHÁNH 1: DÀNH RIÊNG CHO SẾP TỔNG (ADMIN)
  if (currentUser.role === "admin") {
    return (
      <UnitsProvider>
        <AdminPage onLogout={handleLogout} userData={userData} />
      </UnitsProvider>
    );
  }

  // 2. NHÁNH 2: DÀNH RIÊNG CHO QUẢN LÝ (MANAGER)
  if (currentUser.role === "manager") {
    return (
      <ManagerPage
        onLogout={handleLogout}
        userData={userData}
        onProfileUpdated={handleProfileUpdated}
      />
    );
  }

  // 3. NHÁNH 3: DÀNH RIÊNG CHO BẾP TRƯỞNG (KITCHEN)
  if (currentUser.role === "kitchen") {
    return (
      <CentralKitchenPage
        onLogout={handleLogout}
        userData={userData}
        onProfileUpdated={handleProfileUpdated}
      />
    );
  }

  // 4. NHÁNH 4: DÀNH RIÊNG CHO CHỦ CỬA HÀNG (FRANCHISE)
  if (currentUser.role === "franchise") {
    return (
      <FranchiseStorePage
        onLogout={handleLogout}
        userData={userData}
        onProfileUpdated={handleProfileUpdated}
      />
    );
  }
  // 5. NHÁNH 5: DÀNH RIÊNG CHO ĐIỀU PHỐI CUNG ỨNG (SUPPLY)
  if (currentUser.role === "supply") {
    return (
      <SupplyCoordinatorPage
        onLogout={handleLogout}
        userData={userData}
        onProfileUpdated={handleProfileUpdated}
      />
    );
  }

  // NẾU LỌT VÀO ROLE LẠ THÌ BÁO LỖI
  return (
    <div
      className={`ck-root ck-min-h-screen ck-flex ck-items-center ck-justify-center ${
        uiTheme === "light" ? "ck-theme-light" : "ck-bg-black"
      }`}
    >
      <div className="ck-grain" />
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 10030,
        }}
      >
        <ThemeToggleButton />
      </div>
      <div className="ck-text-center">
        <h1 className="ck-text-4xl ck-font-black ck-text-white ck-mb-4">
          Chức năng đang phát triển
        </h1>
        <p className="ck-text-gray-400 ck-mb-8">
          Vai trò này chưa được hoàn thiện hoặc không hợp lệ.
        </p>
        <button
          type="button"
          className="ck-btn ck-px-6 ck-py-3 ck-bg-red-500 ck-text-white ck-rounded-xl ck-font-bold"
          style={{ border: "none" }}
          onClick={handleLogout}
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

export default App;
