import {
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  Plus,
  FileText,
  Package,
  BarChart3,
  Store,
  Users,
  Megaphone,
} from "../components/icons/Icons";

/** Cấu hình hiển thị trạng thái đơn hàng */
export const ORDER_STATUS = {
  pending: { bg: "ck-badge-yellow", label: "Chờ xử lý", icon: Clock },
  processing: { bg: "ck-badge-blue", label: "Đang xử lý", icon: Activity },
  completed: { bg: "ck-badge-green", label: "Hoàn thành", icon: CheckCircle },
  cancelled: { bg: "ck-badge-red", label: "Đã hủy", icon: XCircle },
};

/** Menu sidebar trang cửa hàng franchise — cùng thuật ngữ với Admin (Cửa hàng, Sản phẩm, Đơn hàng) */
export const FRANCHISE_MENU = [
  { id: "create-order", name: "Tạo đơn hàng", icon: Plus },
  { id: "orders", name: "Đơn hàng", icon: FileText },
  { id: "inventory", name: "Tồn kho", icon: Package },
  { id: "reports", name: "Báo cáo", icon: BarChart3 },
  { id: "settings", name: "Cài đặt cửa hàng", icon: Store },
];

/** Tab trang Admin — theo cấu trúc API */
export const ADMIN_TABS = [
  { id: "accounts", label: "Tài khoản", icon: Users },
  { id: "stores", label: "Cửa hàng", icon: Store },
  { id: "kitchen", label: "Danh mục & Sản phẩm", icon: Package },
  { id: "ingredients", label: "Quản lý kho", icon: BarChart3 },
  { id: "broadcast", label: "Phát loa", icon: Megaphone },
];
/** Enum SystemRole (BE) — trùng tên và nhãn */
export const SYSTEM_ROLES = [
  { value: "ADMIN", label: "Quản trị hệ thống" },
  { value: "MANAGER", label: "Quản lý vận hành" },
  { value: "COORDINATOR", label: "Điều phối cung ứng" },
  { value: "KITCHEN_MANAGER", label: "Nhân viên quản lý bếp trung tâm" },
  { value: "STORE_MANAGER", label: "Nhân viên quản lý cửa hàng (Franchise)" },
];

/**
 * Vai trò tạo/sửa tài khoản nhân viên trên Admin (không gồm Admin).
 * value = mã BE; label = cùng bộ nhãn form "Vai trò" / chỉnh sửa.
 */
export const ADMIN_ACCOUNT_ROLE_OPTIONS = [
  { value: "STORE_MANAGER", label: "Quản lý cửa hàng" },
  { value: "KITCHEN_MANAGER", label: "Nhân viên bếp" },
  { value: "COORDINATOR", label: "Điều phối viên" },
  { value: "MANAGER", label: "Quản lý" },
];

/** Nhãn hiển thị theo enum (key = ADMIN | MANAGER | COORDINATOR | KITCHEN_MANAGER | STORE_MANAGER) */
export const ROLE_LABELS = Object.fromEntries(
  SYSTEM_ROLES.map((r) => [r.value, r.label]),
);

/** Endpoint Admin: Khóa/Mở khóa — PUT {ADMIN_ACCOUNT_STATUS_PATH}/{accountId}/status, body: { isActive } */
export const ADMIN_ACCOUNT_STATUS_PATH = "/api/admin/accounts";
