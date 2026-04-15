import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  LayoutDashboard,
  Plus,
  Store,
  BarChart3,
  Package,
  CheckCircle,
  ChefHat,
  Settings,
  AlertTriangle,
} from "../../components/icons/Icons";
import api from "../../services/api";
import ChangePasswordModal from "../../components/common/ChangePasswordModal";
import UpdateProfileModal from "../../components/common/UpdateProfileModal";
import HeaderSettingsMenu from "../../components/common/HeaderSettingsMenu";
import NotificationBell from "../../components/common/NotificationBell";
import ThemeToggleButton from "../../components/common/ThemeToggleButton";
import { useUiTheme } from "../../context/UiThemeContext";
import "../../styles/admin-theme.css";
import "../../styles/manager-ui.css";

const MANAGER_TAB_ITEMS = [
  { label: "Bảng KPI", icon: BarChart3 },
  { label: "Quản lý sản phẩm & Danh mục", icon: Package },
  { label: "Tổng quan tồn kho", icon: LayoutDashboard },
  { label: "Kiểm kê kho", icon: CheckCircle },
  { label: "Quản lý công thức", icon: ChefHat },
  { label: "Cửa hàng Franchise", icon: Store },
  { label: "Cài đặt hệ thống", icon: Settings },
];

const SYSTEM_CONFIG_LABELS = {
  OPEN_TIME: {
    label: "Giờ mở cửa",
    description: "Thời gian bắt đầu hoạt động trong ngày của hệ thống",
    icon: "⏰",
  },
  STANDARD_CUTOFF_TIME: {
    label: "Giờ chốt đơn tiêu chuẩn",
    description: "Thời hạn cuối cùng để đặt các đơn hàng giao tiêu chuẩn",
    icon: "📦",
  },
  URGENT_CUTOFF_TIME: {
    label: "Giờ chốt đơn hỏa tốc",
    description: "Thời hạn cuối cùng để đặt các đơn hàng giao hỏa tốc (URGENT)",
    icon: "⚡",
  },
  URGENT_SURCHARGE: {
    label: "Phụ phí giao hỏa tốc",
    description: "Mức phụ phí áp dụng cho các đơn hàng URGENT (VNĐ)",
    icon: "💵",
  },
  AUTO_CONFIRM_HOURS: {
    label: "Giờ tự động xác nhận",
    description: "Số giờ hệ thống tự động xác nhận/chốt đơn",
    icon: "⏱️",
  },
};

// Hàm helper lấy label — nếu không có trong map thì tự format key thành chữ đọc được
const getConfigLabel = (key) => {
  if (SYSTEM_CONFIG_LABELS[key]) return SYSTEM_CONFIG_LABELS[key];
  // Fallback: AUTO_RESOLVE_HOURS → Auto Resolve Hours
  const fallbackLabel = key
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { label: fallbackLabel, description: "", icon: "⚙️" };
};

const ManagerPage = ({ onLogout, userData, onProfileUpdated }) => {
  const { uiTheme } = useUiTheme();
  const isLight = uiTheme === "light";
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showUpdateProfileModal, setShowUpdateProfileModal] = useState(false);
  const [activeManagementTab, setActiveManagementTab] = useState("Bảng KPI");
  const [isLoading, setIsLoading] = useState(false);

  const [masterProducts, setMasterProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [, setReports] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [kpiStats, setKpiStats] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [stores, setStores] = useState([]);
  const [unitMasterData, setUnitMasterData] = useState([]);
  // Khai báo state cho form nguyên liệu
const [showAddIngredient, setShowAddIngredient] = useState(false);

// (Tùy chọn) Nếu bạn chưa có 2 state này thì thêm vào để khỏi lỗi khi click nút "Thêm nguyên liệu"
const [editingIngredient, setEditingIngredient] = useState(null);


const [ingredientForm, setIngredientForm] = useState({
  name: "",
  unit: "",
  unitCost: "",
});
  const getUnitLabel = useCallback(
    (code) => {
      if (!code) return code;
      const found = unitMasterData.find(
        (u) => u.value === String(code).toUpperCase(),
      );
      return found ? found.label : code;
    },
    [unitMasterData],
  );
  const [allOrders, setAllOrders] = useState([]);

  const [systemConfigs, setSystemConfigs] = useState({});
  const [selectedConfig, setSelectedConfig] = useState(null);

  // --- BỘ LỌC DATE PICKER KPI ---
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  // STATE CHO BIỂU ĐỒ (Không liên quan đến API lọc ở trên)
  const [tempChartMode, setTempChartMode] = useState("day"); // Lưu tạm lúc chọn Dropdown
  const [appliedChartMode, setAppliedChartMode] = useState("day"); // Mode chính thức vẽ biểu đồ
  // --- STATE CHI TIẾT ĐƠN HÀNG FRANCHISE ---
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);

  // --- STATE KIỂM KÊ KHO ---
  const [stocktakeForm, setStocktakeForm] = useState({});
  const [isSubmittingStocktake, setIsSubmittingStocktake] = useState(false);

  // --- STATE QUẢN LÝ SỰ CỐ ---
  const [reportedShipments, setReportedShipments] = useState([]);
  const [showIncidentsModal, setShowIncidentsModal] = useState(false);

  const [showImportHistoryModal, setShowImportHistoryModal] = useState(false);
  const [importHistory, setImportHistory] = useState([]);
  const [importHistoryLoading, setImportHistoryLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null); // modal con

  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
const [unitSearchText, setUnitSearchText] = useState("");
const unitDropdownRef = useRef(null);

const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
const [categorySearchText, setCategorySearchText] = useState("");
const categoryDropdownRef = useRef(null);
const [openIngredientDropdownIdx, setOpenIngredientDropdownIdx] = useState(null);
const [ingredientSearchTexts, setIngredientSearchTexts] = useState({});
const ingredientDropdownRefs = useRef({});
const [filterRecipeCategory, setFilterRecipeCategory] = useState("Tất cả");
const [isFilterRecipeCatOpen, setIsFilterRecipeCatOpen] = useState(false);
const [filterRecipeCatSearch, setFilterRecipeCatSearch] = useState("");
const filterRecipeCatRef = useRef(null);
  // --- STATE NHẬP KHO ---
  const [showImportModal, setShowImportModal] = useState(false);
  const [importForm, setImportForm] = useState({
    note: "",
    items: [{ ingredientId: "", quantity: "", importPrice: "" }],
  });
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  //state quản lý
  const [showForceConfirmModal, setShowForceConfirmModal] = useState(false);
  const [forceConfirmChecked, setForceConfirmChecked] = useState(false);
  const [backendWarningMsg, setBackendWarningMsg] = useState("");

  // --- STATE QUẢN LÝ SẢN PHẨM & DANH MỤC ---
  const [productSubTab, setProductSubTab] = useState("products");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    productId: "",
    productName: "",
    categoryId: "",
    sellingPrice: "",
    baseUnit: "PHAN",
    isActive: true,
    ingredients: [],
  });

  const [productSearchText, setProductSearchText] = useState("");
  const [productAppliedSearch, setProductAppliedSearch] = useState("");
  const [filterProductCategory, setFilterProductCategory] =
    useState("Tất cả danh mục");

  const [showCreateReport, setShowCreateReport] = useState(false);
  const [newReport, setNewReport] = useState({
    name: "",
    type: "EXCEL",
    fromDate: "",
    toDate: "",
  });
  // --- STATE LỊCH SỬ KIỂM KÊ ---

  const [stocktakeHistory, setStocktakeHistory] = useState([]);
  const [historyDetails, setHistoryDetails] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedSessionCode, setSelectedSessionCode] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isConvUnitDropdownOpen, setIsConvUnitDropdownOpen] = useState(false);
const [convUnitSearchText, setConvUnitSearchText] = useState();
const convUnitDropdownRef = useRef(null);
const [isRecipeIngDropdownOpen, setIsRecipeIngDropdownOpen] = useState(false);
const [recipeIngSearchText, setRecipeIngSearchText] = useState("");
const recipeIngDropdownRef = useRef(null);
const [openImportDropdownIdx, setOpenImportDropdownIdx] = useState(null);
const [importIngSearchTexts, setImportIngSearchTexts] = useState({});
const importIngDropdownRefs = useRef({});
const [isFilterCatDropdownOpen, setIsFilterCatDropdownOpen] = useState(false);
const [filterCatSearchText, setFilterCatSearchText] = useState("");
const filterCatDropdownRef = useRef(null);
  // --- STATE TÌM KIẾM KIỂM KÊ KHO ---
  const [stocktakeSearchText, setStocktakeSearchText] = useState("");
  const [stocktakeAppliedSearch, setStocktakeAppliedSearch] = useState("");

  // --- STATE TÌM KIẾM FRANCHISE STORE ---
  const [franchiseStoreSearchText, setFranchiseStoreSearchText] = useState("");
  const [franchiseStoreAppliedSearch, setFranchiseStoreAppliedSearch] =
    useState("");

  // Mở popup và lấy danh sách
  const handleOpenHistory = async () => {
    setShowHistoryModal(true);
    setSelectedSessionCode(""); // Reset lại về màn danh sách
    setIsLoadingHistory(true);
    try {
      const res = await api.getStocktakeHistory();
      setStocktakeHistory(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Lỗi:", err);
    }
    setIsLoadingHistory(false);
  };

  // Xem chi tiết 1 phiên
  const handleViewHistoryDetail = async (sessionCode) => {
    setSelectedSessionCode(sessionCode);
    setHistoryDetails([]);
    try {
      const res = await api.getStocktakeHistoryDetail(sessionCode);
      setHistoryDetails(Array.isArray(res) ? res : []);
    } catch (err) {
      alert("Lỗi tải chi tiết: " + err.message);
    }
  };

  const fetchImportHistory = async () => {
    setImportHistoryLoading(true);
    try {
      const list = await api.getImportHistory();
      setImportHistory(list);
    } catch (err) {
      alert("❌ Lỗi tải lịch sử: " + err.message);
    } finally {
      setImportHistoryLoading(false);
    }
  };

  // --- BỔ SUNG STATE QUY ĐỔI ĐƠN VỊ ---
  const [conversions, setConversions] = useState([]);
  const [showAddConversion, setShowAddConversion] = useState(false);
  const [newConversion, setNewConversion] = useState({
    unitName: "",
    conversionFactor: "",
  });
  const [testData, setTestData] = useState({ unit: "", qty: "" });
  const [testResult, setTestResult] = useState(null);

  // --- STATE PHÂN TRANG (PAGINATION) ---
  const ITEMS_PER_PAGE = 15;
  const [productPage, setProductPage] = useState(1);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [stocktakePage, setStocktakePage] = useState(1);
  const [recipePage, setRecipePage] = useState(1);
  const [franchiseOrderPage, setFranchiseOrderPage] = useState(1);
  const [franchiseStorePage, setFranchiseStorePage] = useState(1);
  const [viewingNoteDetail, setViewingNoteDetail] = useState(null);
  const renderPagination = (currentPage, totalItems, setPageFunc) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "8px",
          padding: "16px 0",
          borderTop: "1px solid #1f2937",
        }}
      >
        {/* NÚT TRƯỚC */}
        <button
          type="button"
          onClick={() => setPageFunc((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          style={{
            padding: "8px 18px",
            borderRadius: "10px",
            fontWeight: "700",
            fontSize: "13px",
            border: "none",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            background: currentPage === 1 ? "#1f2937" : "#374151",
            color: currentPage === 1 ? "#4b5563" : "#e5e7eb",
            transition: "all 0.2s ease",
            transform: "translateY(0)",
            opacity: currentPage === 1 ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (currentPage !== 1) {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.background = "#4b5563";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.background =
              currentPage === 1 ? "#1f2937" : "#374151";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          ← Trước
        </button>

        {/* SỐ TRANG */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((page) => {
            // Hiện: trang đầu, trang cuối, trang hiện tại và 1 trang kề 2 bên
            return (
              page === 1 ||
              page === totalPages ||
              Math.abs(page - currentPage) <= 1
            );
          })
          .reduce((acc, page, idx, arr) => {
            // Thêm dấu "..." nếu bị nhảy cóc
            if (idx > 0 && page - arr[idx - 1] > 1) {
              acc.push("...");
            }
            acc.push(page);
            return acc;
          }, [])
          .map((item, idx) =>
            item === "..." ? (
              <span
                key={`dot-${idx}`}
                style={{
                  color: "#4b5563",
                  fontSize: "13px",
                  padding: "0 4px",
                  userSelect: "none",
                }}
              >
                ···
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => setPageFunc(item)}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  fontWeight: item === currentPage ? "800" : "600",
                  fontSize: "13px",
                  border:
                    item === currentPage
                      ? "2px solid #14b8a6"
                      : isLight
                        ? "1px solid #cbd5e1"
                        : "1px solid #374151",
                  cursor: item === currentPage ? "default" : "pointer",
                  background:
                    item === currentPage
                      ? "rgba(20,184,166,0.15)"
                      : isLight
                        ? "#f1f5f9"
                        : "#1f2937",
                  color: item === currentPage ? "#2dd4bf" : "#9ca3af",
                  transition: "all 0.2s ease",
                  transform: "translateY(0)",
                }}
                onMouseEnter={(e) => {
                  if (item !== currentPage) {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.background = isLight
                      ? "#e2e8f0"
                      : "#374151";
                    e.currentTarget.style.color = isLight ? "#0f172a" : "#fff";
                    e.currentTarget.style.boxShadow = isLight
                      ? "0 4px 12px rgba(15,23,42,0.12)"
                      : "0 4px 12px rgba(0,0,0,0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (item !== currentPage) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.background = isLight
                      ? "#f1f5f9"
                      : "#1f2937";
                    e.currentTarget.style.color = "#9ca3af";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                {item}
              </button>
            ),
          )}

        {/* NÚT SAU */}
        <button
          type="button"
          onClick={() => setPageFunc((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          style={{
            padding: "8px 18px",
            borderRadius: "10px",
            fontWeight: "700",
            fontSize: "13px",
            border: "none",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            background: currentPage === totalPages ? "#1f2937" : "#374151",
            color: currentPage === totalPages ? "#4b5563" : "#e5e7eb",
            transition: "all 0.2s ease",
            transform: "translateY(0)",
            opacity: currentPage === totalPages ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (currentPage !== totalPages) {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.background = "#4b5563";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.background =
              currentPage === totalPages ? "#1f2937" : "#374151";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          Sau →
        </button>
      </div>
    );
  };
  const getMinChartMode = useCallback((start, end) => {
    if (!start || !end) return "day";
    const s = new Date(start);
    const e = new Date(end);
    const diffDays = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 365) return "year"; // > 12 tháng → năm
    if (diffDays > 56) return "month"; // > 8 tuần   → tháng
    if (diffDays > 14) return "week"; // > 14 ngày  → tuần
    return "day";
  }, []);
// 1. HÀM THÊM MỚI NGUYÊN LIỆU
  const handleCreateIngredient = async (e) => {
    e.preventDefault();
    if (!ingredientForm.name || !ingredientForm.unit) {
      return alert("Vui lòng nhập đủ Tên nguyên liệu và Đơn vị!");
    }
    
    try {
      const payload = {
        name: ingredientForm.name,
        unit: ingredientForm.unit,
        unitCost: Number(ingredientForm.unitCost) || 0,
        kitchenStock: 0, 
        minThreshold: 0, 
      };

      // Gọi API thêm mới (bạn kiểm tra lại tên hàm API cho đúng nhé)
      await api.createIngredient(payload); 
      
      alert("✅ Thêm nguyên liệu thành công!");
      setShowAddIngredient(false);
      setIngredientForm({ name: "", unit: "", unitCost: "", kitchenStock: "", minThreshold: "" });
      
      // Load lại danh sách sau khi thêm
     loadData();
      
    } catch (error) {
      alert("❌ Lỗi khi thêm: " + (error.message || "Vui lòng thử lại"));
    }
  };

  // 2. HÀM CẬP NHẬT (SỬA) NGUYÊN LIỆU
  const handleUpdateIngredient = async (e) => {
    e.preventDefault();
    if (!ingredientForm.name || !ingredientForm.unit) {
      return alert("Vui lòng nhập đủ Tên nguyên liệu và Đơn vị!");
    }

    try {
      const payload = {
        name: ingredientForm.name,
        unit: ingredientForm.unit,
        unitCost: Number(ingredientForm.unitCost) || 0,
        kitchenStock: Number(ingredientForm.kitchenStock) || 0,
        minThreshold: Number(ingredientForm.minThreshold) || 0,
        version: editingIngredient.version, // Truyền version để backend check conflict
      };

      const ingredientId = editingIngredient.ingredientId || editingIngredient.id;

      // Gọi API cập nhật (bạn kiểm tra lại tên hàm API update cho đúng nhé)
      await api.updateIngredient(ingredientId, payload); 
      
      alert("✅ Cập nhật nguyên liệu thành công!");
      setShowAddIngredient(false);
      setEditingIngredient(null);
      setIngredientForm({ name: "", unit: "", unitCost: "", kitchenStock: "", minThreshold: "" });
      
      // Load lại danh sách sau khi sửa
      loadData();

    } catch (error) {
      alert("❌ Lỗi khi cập nhật: " + (error.message || "Vui lòng thử lại"));
    }
  };

  const CHART_MODE_LEVELS = { day: 0, week: 1, month: 2, year: 3 };

  const CHART_MODE_OPTIONS = [
    { value: "day", label: "Từng Ngày" },
    { value: "week", label: "Theo Tuần" },
    { value: "month", label: "Theo Tháng" },
    { value: "year", label: "Theo Năm" },
  ];

  // Thêm state này
  const [appliedDateRange, setAppliedDateRange] = useState({
    start: "",
    end: "",
  });

  // Tính minMode chỉ từ khoảng ngày ĐÃ LỌC (không phải đang chọn trên picker)
  const minChartMode = useMemo(
    () => getMinChartMode(appliedDateRange.start, appliedDateRange.end),
    [appliedDateRange, getMinChartMode],
  );

  const [productStatistics, setProductStatistics] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        prods,
        reps,
        invs,
        kpis,
        sts,
        cfgs,
        dashFull,
        cats,
        reportedData,
        units,
        productStats,
      ] = await Promise.all([
        api.getMasterProducts().catch(() => []),
        api.getReports().catch(() => []),
        api.getManagerInventory().catch(() => []),
        api.getKPIStats().catch(() => []),
        api.getStoresAll?.().catch(() => []),
        api.getSystemConfigs?.().catch(() => ({})),
        api.getManagerAnalytics().catch(() => null),
        api.getCategories().catch(() => []),
        api.getReportedShipments().catch(() => []),
        api.getUnits().catch(() => []),
        api.getProductStatistics().catch(() => ({})),
      ]);

      setMasterProducts(prods);
      setCategoriesList(cats);
      setReports(reps);
      setInventory(invs);
      setKpiStats(kpis);
      setStores(sts);
      setSystemConfigs(cfgs || {});
      setDashboardData(dashFull || {});
      setReportedShipments(Array.isArray(reportedData) ? reportedData : []);
      setUnitMasterData(Array.isArray(units) ? units : []);
      setProductStatistics(productStats);
    } catch (error) {
      console.error("Lỗi tải dữ liệu Manager:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => setStocktakePage(1), [stocktakeAppliedSearch]);
  useEffect(() => setFranchiseStorePage(1), [franchiseStoreAppliedSearch]);
  useEffect(() => {
  const handleClickOutside = (event) => {
    if (convUnitDropdownRef.current && !convUnitDropdownRef.current.contains(event.target)) {
      setIsConvUnitDropdownOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);
  useEffect(() => {
  const handleClickOutside = (event) => {
    if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target)) {
      setIsUnitDropdownOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);
useEffect(() => {
  const handleClickOutside = (event) => {
    // Đóng Đơn vị tính
    if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target)) {
      setIsUnitDropdownOpen(false);
    }
    // Đóng Danh mục (Phần mới thêm)
    if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
      setIsCategoryDropdownOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);
useEffect(() => {
  const handleClickOutside = (event) => {
    if (openIngredientDropdownIdx !== null) {
      const ref = ingredientDropdownRefs.current[openIngredientDropdownIdx];
      if (ref && !ref.contains(event.target)) {
        setOpenIngredientDropdownIdx(null);
      }
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, [openIngredientDropdownIdx]);
useEffect(() => {
  const handleClickOutside = (event) => {
    if (recipeIngDropdownRef.current && !recipeIngDropdownRef.current.contains(event.target)) {
      setIsRecipeIngDropdownOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);
useEffect(() => {
  const handleClickOutside = (event) => {
    if (openImportDropdownIdx !== null) {
      const ref = importIngDropdownRefs.current[openImportDropdownIdx];
      if (ref && !ref.contains(event.target)) {
        setOpenImportDropdownIdx(null);
      }
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, [openImportDropdownIdx]);
useEffect(() => {
  const handleClickOutside = (event) => {
    if (filterCatDropdownRef.current && !filterCatDropdownRef.current.contains(event.target)) {
      setIsFilterCatDropdownOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);
useEffect(() => {
  const handleClickOutside = (event) => {
    if (filterRecipeCatRef.current && !filterRecipeCatRef.current.contains(event.target)) {
      setIsFilterRecipeCatOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);


  // ==========================================
  // HÀM XỬ LÝ KIỂM KÊ KHO
  // ==========================================
  const handleStocktakeChange = (ingredientId, field, value) => {
    setStocktakeForm((prev) => ({
      ...prev,
      [ingredientId]: {
        ...prev[ingredientId],
        [field]: value,
      },
    }));
  };
  // HÀM XỬ LÝ KHI BẤM NÚT XÁC NHẬN Ở DROPDOWN

  // ==========================================
  // HÀM XỬ LÝ SỰ CỐ (ĐỀN BÙ)
  // ==========================================
  const handleResolveReplacement = async (shipId) => {
    if (
      window.confirm(
        `Xác nhận duyệt đền bù cho chuyến xe ${shipId} và chuyển lệnh xuống Bếp?`,
      )
    ) {
      try {
        await api.resolveReplacement(shipId);
        alert("✅ Đã tạo đơn bù (COMP-xxx) thành công. Bếp sẽ tiến hành nấu!");
        loadData(); // Tải lại để xóa sự cố khỏi danh sách
      } catch (err) {
        alert("❌ Lỗi duyệt đền bù: " + (err.message || "Vui lòng thử lại"));
      }
    }
  };

  const handleSubmitStocktake = async (isForce = false) => {
    const payloadItems = Object.entries(stocktakeForm)
      .filter(
        ([id, data]) => data.actualQty !== "" && data.actualQty !== undefined,
      )
      .map(([id, data]) => ({
        ingredientId: id,
        actualQty: Number(data.actualQty),
        forceConfirm: isForce, // Gắn cờ ghi đè (mặc định false)
        note: data.note || "",
      }));

    if (payloadItems.length === 0) {
      return alert("Bạn chưa nhập số lượng kiểm kê cho nguyên liệu nào!");
    }

    // Chỉ hỏi confirm nếu là bấm lần 1 (chưa mở popup)
    if (
      !isForce &&
      !window.confirm(`Xác nhận kiểm kê ${payloadItems.length} nguyên liệu?`)
    ) {
      return;
    }

    setIsSubmittingStocktake(true);

    try {
      const response = await api.submitStocktake({ items: payloadItems });

      alert(
        "✅ " +
          (response?.message ||
            "Đã hoàn tất quá trình đối soát và kiểm kê kho!"),
      );

      // Thành công thì reset hết
      setShowForceConfirmModal(false);
      setForceConfirmChecked(false);
      setStocktakeForm({});
      loadData();
    } catch (err) {
      // Lúc này err chỉ có mỗi cái message do api.js đã "bọc" lại
      const beMessage =
        err.response?.data?.message || err.message || "Lỗi không xác định";

      // 💡 CHIÊU MỚI: Dò tìm từ khóa trong câu báo lỗi của Backend
      const isOverLimitError =
        beMessage.includes("Xác nhận hao hụt bất thường") ||
        beMessage.includes("chênh lệch");

      if (isOverLimitError) {
        // Nếu câu lỗi có chứa chữ cảnh báo hao hụt -> MỞ POPUP NGAY!
        setBackendWarningMsg(beMessage.replace("Error: ", "")); // Cắt chữ Error: cho đẹp
        setShowForceConfirmModal(true);
        setForceConfirmChecked(false);
      } else {
        // Nếu là các lỗi khác (lỗi mạng, sai token...) thì báo bình thường
        alert("❌ " + beMessage);
      }
    } finally {
      setIsSubmittingStocktake(false);
    }
  };
  // ==========================================
  // HÀM XỬ LÝ SẢN PHẨM & DANH MỤC
  // ==========================================

  const handleSaveCategory = async () => {
    if (!newCategoryName) return alert("Vui lòng nhập tên danh mục!");
    try {
      await api.createCategory({
        name: newCategoryName,
        description: newCategoryDescription,
      });
      alert("Thêm danh mục thành công!");
      setShowAddCategory(false);
      setNewCategoryName("");
      setNewCategoryDescription("");
      loadData();
    } catch (err) {
      alert("Lỗi thêm danh mục: " + err.message);
    }
  };

 const handleSaveProduct = async () => {
    if (!newProduct.productName || !newProduct.sellingPrice)
      return alert("Vui lòng điền Tên và Giá bán!");

    // Check trùng nguyên liệu (chỉ áp dụng khi tạo mới, vì sửa đã bị ẩn)
    if (!editingProduct && newProduct.ingredients && newProduct.ingredients.length > 0) {
      const validIngredients = newProduct.ingredients.filter(
        (i) => (i.ingredientId ?? "").toString().trim() !== ""
      );
      const ingredientIds = validIngredients.map((ing) => String(ing.ingredientId).trim());
      const uniqueIds = new Set(ingredientIds);
      if (uniqueIds.size !== ingredientIds.length) {
        alert("Lỗi: Bạn đang chọn trùng nguyên liệu trong công thức! Vui lòng gộp lại hoặc xóa dòng trùng.");
        return; 
      }
    }

    const payload = {
      productId: newProduct.productId || undefined,
      productName: newProduct.productName,
      categoryId: newProduct.categoryId || (categoriesList[0]?.id ?? null),
      sellingPrice: Number(newProduct.sellingPrice),
      baseUnit: "PHAN", 
      isActive: newProduct.isActive,
      // Nếu đang sửa thì ép mảng rỗng để không gửi nguyên liệu bậy bạ xuống
      ingredients: editingProduct ? [] : (newProduct.ingredients || []),
    };

    try {
      if (editingProduct) {
        // NGHIỆP VỤ SỬA: CHỈ CẬP NHẬT THÔNG TIN CƠ BẢN
        const idToUpdate =
          editingProduct.product_id ||
          editingProduct.productId ||
          editingProduct.id;
          
        await api.updateProduct(idToUpdate, payload);
        
        // ĐÃ XÓA TOÀN BỘ LOGIC api.saveRecipe() Ở ĐÂY ĐỂ TRÁNH LỖI BACKEND
        
        alert("Cập nhật sản phẩm thành công!");
      } else {
        // NGHIỆP VỤ TẠO MỚI: Gửi hết cả thông tin và BOM xuống
        await api.createProduct(payload);
        alert("Thêm sản phẩm thành công!");
      }
      setShowAddProduct(false);
      setOpenIngredientDropdownIdx(null); 
      setIngredientSearchTexts({});
      loadData();
    } catch (error) {
      alert("Lỗi lưu sản phẩm: " + error.message);
    }
  };

  const handleToggleMasterProductStatus = async (prod) => {
    const productId = prod.product_id || prod.productId;
    const isCurrentlySelling =
      prod.isActive === true ||
      prod.active === true ||
      prod.is_active === true ||
      prod.is_active === 1 ||
      String(prod.is_active) === "true";
    const newStatus = !isCurrentlySelling;

    const confirmMsg = newStatus
      ? "Bạn có chắc muốn chuyển SP này sang trạng thái ĐANG BÁN không?"
      : "Bạn có chắc muốn chuyển SP này sang trạng thái NGỪNG BÁN không?";

    if (window.confirm(confirmMsg)) {
      try {
        await api.updateProductStatus(productId, newStatus);

        // Thành công thì cập nhật state
        setMasterProducts((prevProducts) =>
          prevProducts.map((p) =>
            (p.product_id || p.productId) === productId
              ? {
                  ...p,
                  isActive: newStatus,
                  active: newStatus,
                  is_active: newStatus,
                }
              : p,
          ),
        );
      } catch (error) {
        // HỨNG LỖI TỪ BACKEND Ở ĐÂY
        const errMsg = error.message || error.response?.data?.message || "";

        // Dò từ khóa lỗi thiếu BOM từ Backend
        if (
          errMsg.includes("Không thể mở bán") ||
          errMsg.includes("BOM") ||
          errMsg.includes("công thức")
        ) {
          alert(
            "❌ Không thể mở bán! Sản phẩm này chưa có định lượng nguyên liệu. Vui lòng chuyển sang tab [Quản lý công thức] để thiết lập BOM trước khi tung ra thị trường.",
          );
        } else {
          alert("Lỗi cập nhật trạng thái: " + errMsg);
        }
      }
    }
  };

  // ==========================================
  // HÀM XỬ LÝ KHÁC
  // ==========================================
  const handleCreateReport = async () => {
    if (!newReport.fromDate || !newReport.toDate) {
      return alert("Vui lòng chọn Từ ngày và Đến ngày để xuất báo cáo!");
    }
    try {
      api.exportAnalyticsCSV(newReport.fromDate, newReport.toDate);
      setShowCreateReport(false);
      loadData();
    } catch (error) {
      alert("Lỗi tạo báo cáo: " + error.message);
    }
  };

  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [inventorySearchText, setInventorySearchText] = useState("");
  const [inventoryAppliedSearch, setInventoryAppliedSearch] = useState("");
  const [filterInventoryStatus] = useState("Cảnh báo tồn kho");

  const filteredInventory = inventory.filter((item) => {
    const name = item.ingredientName || item.name || "";
    const id = item.ingredientId || item.id || "";

    let matchText = true;
    if (inventoryAppliedSearch)
      matchText =
        id.toLowerCase().includes(inventoryAppliedSearch.toLowerCase()) ||
        name.toLowerCase().includes(inventoryAppliedSearch.toLowerCase());

    const isLowStock = item.stock <= (item.minThreshold || item.min || 10);
    let matchStat = true;
    if (filterInventoryStatus === "Sắp hết hàng")
      matchStat = isLowStock && item.stock > 0;
    if (filterInventoryStatus === "Đã hết hàng") matchStat = item.stock <= 0;

    return matchText && matchStat;
  });

  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeSearchText, setRecipeSearchText] = useState("");
  const [recipeAppliedSearch, setRecipeAppliedSearch] = useState("");
  const [editingRecipeIngredients, setEditingRecipeIngredients] = useState([]);

  // --- EFFECT CHO QUY ĐỔI ĐƠN VỊ ---
  useEffect(() => {
    if (selectedInventoryItem) {
      const ingId =
        selectedInventoryItem.ingredientId ||
        selectedInventoryItem.id ||
        selectedInventoryItem.sku;
      api
        .getConversionsByIngredient(ingId)
        .then((res) =>
          setConversions(Array.isArray(res) ? res : res?.data || []),
        )
        .catch(() => setConversions([]));
    } else {
      setConversions([]);
    }
    setTestResult(null);
    setTestData({ unit: "", qty: "" });
    setShowAddConversion(false);
  }, [selectedInventoryItem]);

  // ==========================================
  // HÀM XỬ LÝ NHẬP KHO
  // ==========================================
  const handleAddImportRow = () => {
    setImportForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { ingredientId: "", quantity: "", importPrice: "" },
      ],
    }));
  };

  const handleRemoveImportRow = (index) => {
    setImportForm((prev) => ({
      ...prev,
      items:
        prev.items.length <= 1
          ? [{ ingredientId: "", quantity: "", importPrice: "" }]
          : prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleImportRowChange = (index, field, value) => {
    setImportForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const handleSubmitImport = async (e) => {
    e.preventDefault();
    const validItems = importForm.items.filter(
      (i) => i.ingredientId && (Number(i.quantity) || 0) > 0,
    );
    if (validItems.length === 0) return;
    setImportSubmitting(true);
    try {
      await api.importInventory({
        note: importForm.note.trim(),
        items: validItems.map((i) => {
          const ing = inventory.find(
            (x) => (x.ingredientId ?? x.id) === i.ingredientId,
          );
          return {
            ingredientId: i.ingredientId,
            unit: ing?.unit || "KG",
            quantity: Number(i.quantity) || 0,
            importPrice: Number(i.importPrice) || 0,
          };
        }),
      });
      setShowImportModal(false);
      setOpenImportDropdownIdx(null);
setImportIngSearchTexts({});
      setImportForm({
        note: "",
        items: [{ ingredientId: "", quantity: "", importPrice: "" }],
      });
      loadData();
      alert("✅ Nhập kho thành công!");
    } catch (err) {
      alert("❌ Lỗi nhập kho: " + err.message);
    } finally {
      setImportSubmitting(false);
    }
  };

  // GOM CỤM DỮ LIỆU BIỂU ĐỒ - ĐỒNG BỘ VỚI BỘ LỌC DỮ LIỆU
  const chartData = React.useMemo(() => {
    const raw = dashboardData?.exportTrend || [];

    // ✅ Dùng appliedDateRange thay vì filterStart/filterEnd
    let start = appliedDateRange.start
      ? new Date(appliedDateRange.start)
      : null;
    let end = appliedDateRange.end
      ? new Date(appliedDateRange.end)
      : new Date();

    if (!start && raw.length > 0) {
      start = new Date(raw[0].date || raw[0].timeLabel);
    } else if (!start) {
      start = new Date();
      start.setDate(end.getDate() - 6);
    }

    // Chuẩn hóa giờ để không bị lệch ngày
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Đảo lại nếu lỡ chọn ngày bắt đầu lớn hơn ngày kết thúc
    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }

    const getIsoDate = (dObj) => {
      return `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, "0")}-${String(dObj.getDate()).padStart(2, "0")}`;
    };

    const result = [];

    // 2. VẼ BIỂU ĐỒ DỰA TRÊN KHOẢNG THỜI GIAN ĐÃ LỌC
    if (appliedChartMode === "day") {
      let curr = new Date(start);
      while (curr <= end) {
        const dateStr = getIsoDate(curr);
        const match =
          raw.find((x) => (x.date || x.timeLabel) === dateStr) || {};

        result.push({
          label: `${String(curr.getDate()).padStart(2, "0")}/${String(curr.getMonth() + 1).padStart(2, "0")}`,
          val: Number(
            match.revenue || match.exportValue || match.totalValue || 0,
          ),
          count: Number(match.orderCount || match.totalOrders || 0),
          tooltipTitle: `Ngày: ${dateStr}`,
        });
        curr.setDate(curr.getDate() + 1); // Tăng lên 1 ngày
      }
    } else if (appliedChartMode === "week") {
      let curr = new Date(start);
      // Lùi về Thứ 2 của tuần chứa ngày start
      const dayOfWeek = curr.getDay() === 0 ? 6 : curr.getDay() - 1;
      curr.setDate(curr.getDate() - dayOfWeek);

      while (curr <= end) {
        const startWeek = new Date(curr);
        const endWeek = new Date(curr);
        endWeek.setDate(curr.getDate() + 6);

        let sumVal = 0,
          sumCount = 0;
        for (let j = 0; j < 7; j++) {
          const tempDay = new Date(startWeek);
          tempDay.setDate(startWeek.getDate() + j);
          const match = raw.find(
            (x) => (x.date || x.timeLabel) === getIsoDate(tempDay),
          );
          if (match) {
            sumVal += Number(
              match.revenue || match.exportValue || match.totalValue || 0,
            );
            sumCount += Number(match.orderCount || match.totalOrders || 0);
          }
        }

        const startLabel = `${String(startWeek.getDate()).padStart(2, "0")}/${String(startWeek.getMonth() + 1).padStart(2, "0")}`;
        const endLabel = `${String(endWeek.getDate()).padStart(2, "0")}/${String(endWeek.getMonth() + 1).padStart(2, "0")}`;

        result.push({
          label: `${startLabel} - ${endLabel}`, // Vẫn giữ label từ ngày mấy đến ngày mấy nhé
          val: sumVal,
          count: sumCount,
          tooltipTitle: `Từ ${getIsoDate(startWeek)} đến ${getIsoDate(endWeek)}`,
        });

        curr.setDate(curr.getDate() + 7); // Tăng lên 1 tuần
      }
    } else if (appliedChartMode === "month") {
      let curr = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

      while (curr <= endMonth) {
        const monthPrefix = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}`;
        let sumVal = 0,
          sumCount = 0;

        raw.forEach((match) => {
          if ((match.date || match.timeLabel || "").startsWith(monthPrefix)) {
            sumVal += Number(
              match.revenue || match.exportValue || match.totalValue || 0,
            );
            sumCount += Number(match.orderCount || match.totalOrders || 0);
          }
        });

        result.push({
          label: `Tháng ${curr.getMonth() + 1}`,
          val: sumVal,
          count: sumCount,
          tooltipTitle: `Tháng ${curr.getMonth() + 1}/${curr.getFullYear()}`,
        });
        curr.setMonth(curr.getMonth() + 1); // Tăng lên 1 tháng
      }
    } else if (appliedChartMode === "year") {
      let currYear = start.getFullYear();
      const endYear = end.getFullYear();

      while (currYear <= endYear) {
        let sumVal = 0,
          sumCount = 0;

        // Tạo một biến const (hằng số) để "chốt" cái năm lại, ESLint sẽ không kêu ca nữa
        const targetYearStr = currYear.toString();

        // Đổi từ raw.forEach(...) sang for...of để không tạo ra function trong vòng lặp
        for (const match of raw) {
          if ((match.date || match.timeLabel || "").startsWith(targetYearStr)) {
            sumVal += Number(
              match.revenue || match.exportValue || match.totalValue || 0,
            );
            sumCount += Number(match.orderCount || match.totalOrders || 0);
          }
        }

        result.push({
          label: `Năm ${currYear}`,
          val: sumVal,
          count: sumCount,
          tooltipTitle: `Năm ${currYear}`,
        });
        currYear++;
      }
    }
    return result;
  }, [
    dashboardData?.exportTrend,
    appliedChartMode,
    appliedDateRange.start,
    appliedDateRange.end,
  ]);
  useEffect(
    () => setProductPage(1),
    [productAppliedSearch, filterProductCategory],
  );
  useEffect(
    () => setInventoryPage(1),
    [inventoryAppliedSearch, filterInventoryStatus],
  );
  useEffect(() => setRecipePage(1), [recipeAppliedSearch]);
  useEffect(() => setFranchiseOrderPage(1), [selectedStore]);

  return (
    <div
      data-manager-page
      className={`ck-root ck-min-h-screen ${uiTheme === "light" ? "ck-theme-light" : "ck-bg-black"}`}
    >
      <div className="ck-grain" />

      <header className="ck-header ck-px-6 ck-py-4 ck-flex ck-items-center ck-justify-between">
        <div className="ck-flex ck-items-center ck-gap-4">
          <div className="ck-w-12-h-12 ck-bg-gradient-btn-admin ck-rounded-xl ck-flex ck-items-center ck-justify-center ck-shadow-lg">
            <LayoutDashboard className="ck-text-white" size={24} />
          </div>
          <div>
            <h1 className="ck-text-lg ck-font-bold ck-text-white">
              Phân hệ quản lý
            </h1>
            <span className="admin-page-badge">Quản lý vận hành</span>
          </div>
        </div>
        <div className="ck-flex ck-items-center ck-gap-2">
          <ThemeToggleButton />
          <NotificationBell variant={uiTheme === "dark" ? "dark" : "light"} />
          <HeaderSettingsMenu
            userData={userData}
            showProfile={true}
            onOpenProfile={() => setShowUpdateProfileModal(true)}
            onChangePassword={() => setShowChangePasswordModal(true)}
            onLogout={
              onLogout ??
              (() => {
                api.logout();
                window.location.reload();
              })
            }
          />
        </div>
      </header>

      <ChangePasswordModal
        open={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
      <UpdateProfileModal
        open={showUpdateProfileModal}
        onClose={() => setShowUpdateProfileModal(false)}
        initialFullName={userData?.name ?? ""}
        initialEmail={userData?.email ?? ""}
        onSuccess={() => {
          onProfileUpdated?.();
          setShowUpdateProfileModal(false);
        }}
      />

      <main className="ck-p-8">
        <div
          className="ck-max-w-7xl ingredient-polished manager-shell"
          style={{ marginLeft: "auto", marginRight: "auto" }}
        >
          <div className="ing-app manager-ui">
            <div className="tabs" style={{ marginBottom: 24 }}>
              {MANAGER_TAB_ITEMS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.label}
                    type="button"
                    className={`tab ${activeManagementTab === tab.label ? "active" : ""}`}
                    onClick={() => {
                      setActiveManagementTab(tab.label);
                      setEditingProduct(null);
                      setShowAddProduct(false);
                      setShowAddCategory(false);
                      setShowCreateReport(false);
                    }}
                  >
                    <Icon size={16} style={{ flexShrink: 0 }} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* ================== 1. TAB BẢNG KPI ================== */}
            {activeManagementTab === "Bảng KPI" && (
              <div className="ck-animate-fade-in relative mgr-section">
                <div className="mgr-section-head">
                  <div>
                    <div className="mgr-section-head__eyebrow">
                      Tổng quan vận hành
                    </div>
                    <h2 className="mgr-section-head__title">
                      Thống kê &amp; xu hướng xuất kho
                    </h2>
                    <p className="mgr-section-head__sub">
                      Theo dõi chỉ số KPI theo khoảng thời gian, giá trị xuất
                      kho và các món cần lưu ý.
                    </p>
                  </div>
                  <div className="mgr-toolbar">
                    <div className="mgr-toolbar__grow">
                      <input
                        type="date"
                        value={filterStart}
                        onChange={(e) => setFilterStart(e.target.value)}
                        className="mgr-input-date"
                      />
                      <span className="mgr-toolbar-sep">đến</span>
                      <input
                        type="date"
                        value={filterEnd}
                        onChange={(e) => setFilterEnd(e.target.value)}
                        className="mgr-input-date"
                      />
                      <button
                        type="button"
                        className="mgr-btn mgr-btn--green"
                        onClick={async () => {
                          setAppliedDateRange({
                            start: filterStart,
                            end: filterEnd,
                          });
                          setIsLoading(true);

                          // Tính mode tối thiểu dựa trên khoảng ngày
                          const autoMode = getMinChartMode(
                            filterStart,
                            filterEnd,
                          );
                          const autoLevel = CHART_MODE_LEVELS[autoMode];

                          // Nếu mode đang chọn thấp hơn mức tối thiểu → ép về autoMode
                          const currentLevel = CHART_MODE_LEVELS[tempChartMode];
                          const resolvedMode =
                            currentLevel >= autoLevel
                              ? tempChartMode
                              : autoMode;

                          setTempChartMode(resolvedMode);
                          setAppliedChartMode(resolvedMode);

                          try {
                            const kpis = await api.getKPIStats(
                              filterStart,
                              filterEnd,
                            );
                            const dash = await api.getManagerAnalytics(
                              filterStart,
                              filterEnd,
                            );
                            setKpiStats(kpis);
                            setDashboardData(dash);
                          } catch (e) {
                            console.error(e);
                          }
                          setIsLoading(false);
                        }}
                        disabled={isLoading}
                      >
                        {isLoading ? "Đang tải…" : "Lọc dữ liệu"}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="mgr-btn mgr-btn--primary"
                      onClick={() => setShowCreateReport(true)}
                    >
                      <Plus size={16} /> Xuất báo cáo
                    </button>
                  </div>
                </div>

                <div className="mgr-stat-grid">
                  {kpiStats.length > 0 ? (
                    kpiStats.map((stat, idx) => (
                      <div
                        key={idx}
                        className={`mgr-stat-card mgr-stat-card--${idx % 4}`}
                      >
                        <div className="mgr-stat-card__label">{stat.label}</div>
                        <div className="mgr-stat-card__value">{stat.value}</div>
                        <div className="mgr-stat-card__foot">
                          <span
                            className={`mgr-delta ${stat.isUp ? "mgr-delta--up" : "mgr-delta--down"}`}
                          >
                            {stat.isUp ? "↗ Tăng" : "↘ Giảm"} {stat.change}
                          </span>
                          <span className="mgr-delta-hint">
                            so với kỳ trước
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="mgr-empty" style={{ gridColumn: "1 / -1" }}>
                      <div className="mgr-empty__icon">📊</div>
                      <p className="mgr-empty__title">Đang tải dữ liệu KPI</p>
                    </div>
                  )}
                </div>

                <div className="mgr-kpi-layout">
                  <div className="mgr-panel" style={{ minHeight: 360 }}>
                    <div
                      className="mgr-panel__head"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <h3 className="mgr-panel__title">
                          Giá trị xuất kho theo thời gian
                        </h3>
                      </div>

                      <div className="ck-flex ck-items-center ck-gap-2">
                        <span className="ck-text-sm ck-text-gray-400">
                          Gộp theo:
                        </span>
                        <select
                          className="mgr-select ck-bg-gray-800 ck-text-white ck-border ck-border-gray-700 ck-rounded-lg ck-px-3 ck-py-1.5 ck-text-sm ck-outline-none focus:ck-border-teal-500"
                          value={tempChartMode}
                          onChange={(e) => setTempChartMode(e.target.value)}
                        >
                          {CHART_MODE_OPTIONS.map((opt) => {
                            const isDisabled =
                              CHART_MODE_LEVELS[opt.value] <
                              CHART_MODE_LEVELS[minChartMode];
                            return (
                              <option
                                key={opt.value}
                                value={opt.value}
                                disabled={isDisabled}
                                style={{
                                  color: isDisabled ? "#4b5563" : undefined,
                                }}
                              >
                                {opt.label}
                                {isDisabled ? " (không khả dụng)" : ""}
                              </option>
                            );
                          })}
                        </select>

                        <button
                          type="button"
                          className="mgr-btn mgr-btn--primary"
                          style={{
                            padding: "6px 16px",
                            fontSize: "13px",
                            borderRadius: "6px",
                          }}
                          onClick={() => {
                            // Kiểm tra lần cuối trước khi apply
                            const minMode = minChartMode;
                            const minLevel = CHART_MODE_LEVELS[minMode];
                            const selectedLevel =
                              CHART_MODE_LEVELS[tempChartMode];
                            if (selectedLevel < minLevel) {
                              // Không cho apply, hiện thông báo
                              alert(
                                `Khoảng thời gian đang chọn yêu cầu gộp tối thiểu theo "${
                                  CHART_MODE_OPTIONS.find(
                                    (o) => o.value === minMode,
                                  )?.label
                                }"`,
                              );
                              return;
                            }
                            setAppliedChartMode(tempChartMode);
                          }}
                        >
                          Xác nhận
                        </button>
                      </div>
                    </div>
                    <div className="mgr-panel__body">
                      <div
                        className="mgr-chart ck-flex ck-items-end ck-w-full ck-px-2 ck-overflow-x-auto ck-scrollbar"
                        style={{ minHeight: 280, paddingTop: 20, gap: "8px" }} // Thêm gap để các cột cách đều nhau
                      >
                        {chartData.length > 0 ? (
                          chartData.map((item, i) => {
                            const maxVal =
                              Math.max(...chartData.map((d) => d.val)) || 1;
                            const heightPercent =
                              item.val > 0 ? (item.val / maxVal) * 100 : 1;
                            return (
                              <div
                                key={i}
                                className="ck-flex ck-flex-col ck-items-center ck-justify-end ck-h-full"
                                style={{ flex: 1, padding: "0 4px" }}
                              >
                                <div
                                  className="ck-flex ck-flex-col ck-items-center ck-mb-3"
                                  style={{ opacity: item.val > 0 ? 1 : 0.4 }}
                                >
                                  <span className="ck-text-xs ck-font-bold ck-text-green-400">
                                    {item.val > 0
                                      ? `${(item.val / 1000).toLocaleString()}k`
                                      : "0đ"}
                                  </span>
                                  <span className="ck-text-[10px] ck-text-gray-400">
                                    {item.count} đơn
                                  </span>
                                </div>
                                <div
                                  className="ck-w-full ck-max-w-[48px] ck-flex ck-items-end ck-justify-center"
                                  style={{ height: "160px" }}
                                >
                                  <div
                                    className="ck-w-full ck-rounded-t-lg ck-transition-all ck-duration-700"
                                    style={{
                                      height: `${heightPercent}%`,
                                      background:
                                        item.val > 0
                                          ? "linear-gradient(to top, #0f766e, #2dd4bf)"
                                          : "#374151",
                                      boxShadow:
                                        item.val > 0
                                          ? "0 -4px 12px rgba(45, 212, 191, 0.2)"
                                          : "none",
                                    }}
                                  />
                                </div>
                                <div
                                  className="ck-text-[10px] ck-text-gray-400 ck-mt-3 ck-pt-3 ck-w-full ck-text-center ck-border-t ck-border-gray-700/50"
                                  title={item.tooltipTitle || item.label}
                                >
                                  {item.label}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div
                            className="mgr-empty"
                            style={{
                              margin: "auto",
                              border: "none",
                              background: "transparent",
                            }}
                          >
                            <div className="mgr-empty__icon">📉</div>
                            <p className="mgr-empty__title">
                              Chưa có dữ liệu biểu đồ
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ck-flex ck-flex-col ck-gap-5">
                    <div className="mgr-mini-panel">
                      <h3 className="mgr-mini-panel__title">
                        Top xuất kho{" "}
                        <span className="mgr-mini-panel__title-badge">
                          Theo giá trị
                        </span>
                      </h3>
                      <div className="mgr-mini-panel__scroll ck-scrollbar">
                        {dashboardData?.topExportedProducts?.length > 0 ? (
                          dashboardData.topExportedProducts.map((p, i) => (
                            <div key={i} className="mgr-row">
                              <div>
                                <p className="mgr-row__name">{p.productName}</p>
                                <p className="mgr-row__meta">
                                  Đã xuất: {p.totalQuantity} · #{i + 1}
                                </p>
                              </div>
                              <span className="mgr-row__val">
                                {Number(p.totalValue || 0).toLocaleString(
                                  "vi-VN",
                                )}
                                đ
                              </span>
                            </div>
                          ))
                        ) : (
                          <p
                            className="mgr-empty__sub"
                            style={{ textAlign: "center", padding: "1rem 0" }}
                          >
                            Chưa có dữ liệu xếp hạng.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mgr-mini-panel">
                      <h3 className="mgr-mini-panel__title">
                        Cảnh báo sự cố{" "}
                        <span
                          className="mgr-mini-panel__title-badge"
                          style={{
                            background: "rgba(239, 68, 68, 0.15)",
                            color: "#fca5a5",
                          }}
                        >
                          Top
                        </span>
                      </h3>
                      <div className="mgr-mini-panel__scroll ck-scrollbar">
                        {dashboardData?.topIssueProducts?.length > 0 ? (
                          dashboardData.topIssueProducts.map((w, i) => (
                            <div key={i} className="mgr-row mgr-row--alert">
                              <div>
                                <p className="mgr-row__name">{w.productName}</p>
                                <p className="mgr-row__meta">
                                  Số ca ghi nhận: {w.totalQuantity}
                                </p>
                              </div>
                              <span className="mgr-row__val">
                                {Number(w.totalValue || 0).toLocaleString(
                                  "vi-VN",
                                )}
                                đ
                              </span>
                            </div>
                          ))
                        ) : (
                          <p
                            className="mgr-empty__sub"
                            style={{
                              textAlign: "center",
                              padding: "1rem 0",
                              color: "#86efac",
                            }}
                          >
                            Không có sự cố.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================== 2. TAB QUẢN LÝ SẢN PHẨM & DANH MỤC ================== */}
            {activeManagementTab === "Quản lý sản phẩm & Danh mục" && (
              <div className="ck-flex ck-flex-col ck-gap-6 ck-h-full mgr-section ck-animate-fade-in">
                <div className="ck-flex ck-justify-between ck-items-center">
                  <div>
                    <div
                      className="mgr-section-head__eyebrow"
                      style={{ marginBottom: "4px" }}
                    >
                      Thực đơn & Công thức
                    </div>
                    <h2
                      className="mgr-section-head__title"
                      style={{ margin: 0 }}
                    >
                      Quản lý sản phẩm
                    </h2>
                  </div>
                  <div className="ck-flex ck-gap-3">
                    <button
                      type="button"
                      className="btn btn-outline-teal"
                      onClick={() => {
                        setShowAddCategory(true);
                        setShowAddProduct(false);
                        setEditingProduct(null);
                        setNewCategoryName("");
                        setNewCategoryDescription("");
                      }}
                    >
                      <Plus size={16} />
                      Thêm danh mục
                    </button>
                    <button
                      type="button"
                      className="mgr-btn mgr-btn--primary"
                      onClick={() => {
                        setShowAddProduct(true);
                        setShowAddCategory(false);
                        setEditingProduct(null);
                        setNewProduct({
                          productId: "",
                          productName: "",
                          categoryId: categoriesList[0]?.id ?? "",
                          sellingPrice: "",
                          baseUnit: "PHAN",
                          isActive: false,
                          ingredients: [],
                        });
                      }}
                    >
                      <Plus size={16} />
                      Thêm sản phẩm
                    </button>
                  </div>
                </div>
                <div className="tabs sub-tabs" style={{ marginBottom: 24 }}>
                  <button
                    type="button"
                    className={`tab ${productSubTab === "products" ? "active" : ""}`}
                    onClick={() => {
                      setProductSubTab("products");
                      setShowAddCategory(false);
                    }}
                  >
                    Sản phẩm
                  </button>
                  <button
                    type="button"
                    className={`tab ${productSubTab === "categories" ? "active" : ""}`}
                    onClick={() => {
                      setProductSubTab("categories");
                      setShowAddProduct(false);
                    }}
                  >
                    Danh mục
                  </button>
                </div>
                <div className="mgr-stat-grid">
                  {/* Thẻ 1: Đang bán — Xanh lá */}
                  <div className="mgr-stat-card mgr-stat-card--0">
                    <div className="mgr-stat-card__label">
                      Sản phẩm đang bán
                    </div>
                    <div
                      className="mgr-stat-card__value"
                      style={{ color: isLight ? "#15803d" : "#4ade80" }}
                    >
                      {productStatistics?.activeProducts ?? "—"}
                    </div>
                    <div className="mgr-stat-card__foot">đang kinh doanh</div>
                  </div>

                  {/* Thẻ 2: Ngừng bán — Xám */}
                  <div className="mgr-stat-card mgr-stat-card--1">
                    <div className="mgr-stat-card__label">
                      Sản phẩm ngừng bán
                    </div>
                    <div
                      className="mgr-stat-card__value"
                      style={{ color: "#9ca3af" }}
                    >
                      {productStatistics?.inactiveProducts ?? "—"}
                    </div>
                    <div className="mgr-stat-card__foot">bao gồm bản nháp</div>
                  </div>

                  {/* Thẻ 3: Có định lượng — Xanh blue */}
                  <div className="mgr-stat-card mgr-stat-card--2">
                    <div className="mgr-stat-card__label">Đã có định lượng</div>
                    <div
                      className="mgr-stat-card__value"
                      style={{ color: "#60a5fa" }}
                    >
                      {productStatistics?.withFormula ?? "—"}
                    </div>
                    <div className="mgr-stat-card__foot">đã cấu hình BOM</div>
                  </div>

                  {/* Thẻ 4: Thiếu định lượng — Đỏ/Cam báo động */}
                  <div
                    className="mgr-stat-card mgr-stat-card--3"
                    style={{
                      border:
                        (productStatistics?.withoutFormula ?? 0) > 0
                          ? "1px solid rgba(251, 146, 60, 0.6)"
                          : undefined,
                      background:
                        (productStatistics?.withoutFormula ?? 0) > 0
                          ? "rgba(251, 146, 60, 0.07)"
                          : undefined,
                    }}
                  >
                    <div className="mgr-stat-card__label">
                      {(productStatistics?.withoutFormula ?? 0) > 0 && (
                        <span style={{ marginRight: 4 }}>⚠️</span>
                      )}
                      Cần thêm định lượng
                    </div>
                    <div
                      className="mgr-stat-card__value"
                      style={{
                        color:
                          (productStatistics?.withoutFormula ?? 0) > 0
                            ? "#fb923c"
                            : "#4ade80",
                      }}
                    >
                      {productStatistics?.withoutFormula ?? "—"}
                    </div>
                    <div className="mgr-stat-card__foot">
                      {(productStatistics?.withoutFormula ?? 0) > 0
                        ? "⬆ Cần xử lý ngay"
                        : "✅ Tất cả đã đủ BOM"}
                    </div>
                  </div>
                </div>

                {/* === SUBTAB SẢN PHẨM === */}
                {productSubTab === "products" && (
                  <>
                    <div className="mgr-search-row">
                      <div className="mgr-search-bar mgr-search-bar--rose">
                        <input
                          type="text"
                          placeholder="Tìm theo mã sản phẩm hoặc tên sản phẩm…"
                          defaultValue={productSearchText}
                          onChange={(e) => setProductSearchText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              setProductAppliedSearch(productSearchText);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setProductAppliedSearch(productSearchText)
                          }
                        >
                          Tìm
                        </button>
                      </div>
                      <div ref={filterCatDropdownRef} style={{ position: "relative" }}>
  {/* Nút hiển thị */}
  <div
    onClick={() => {
      setIsFilterCatDropdownOpen(!isFilterCatDropdownOpen);
      setFilterCatSearchText("");
    }}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      background: isLight ? "#fff" : "#111827",
      color: isLight ? "#0f172a" : "#e5e7eb",
      border: isLight ? "1px solid #cbd5e1" : "1px solid #374151",
      borderRadius: "12px",
      padding: "8px 14px",
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer",
      userSelect: "none",
      minWidth: "180px",
    }}
  >
    <span>
      {filterProductCategory === "Tất cả danh mục"
        ? "🗂 Tất cả danh mục"
        : categoriesList.find((c) => c.name === filterProductCategory)?.name || filterProductCategory}
    </span>
    <span style={{ fontSize: "10px", color: "#6b7280" }}>
      {isFilterCatDropdownOpen ? "▲" : "▼"}
    </span>
  </div>

  {/* Dropdown panel */}
  {isFilterCatDropdownOpen && (
    <div
      style={{
        position: "absolute",
        top: "100%",
        right: 0,
        marginTop: "6px",
        minWidth: "220px",
        background: isLight ? "#fff" : "#1f2937",
        border: isLight ? "1px solid #e2e8f0" : "1px solid #374151",
        borderRadius: "12px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        zIndex: 999,
        overflow: "hidden",
      }}
    >
      {/* Ô tìm kiếm */}
      <div
        style={{
          padding: "8px",
          borderBottom: isLight ? "1px solid #e2e8f0" : "1px solid #374151",
        }}
      >
        <input
          type="text"
          autoFocus
          placeholder="Tìm danh mục..."
          value={filterCatSearchText}
          onChange={(e) => setFilterCatSearchText(e.target.value)}
          style={{
            width: "100%",
            background: isLight ? "#f8fafc" : "#111827",
            color: isLight ? "#0f172a" : "#fff",
            border: isLight ? "1px solid #cbd5e1" : "1px solid #4b5563",
            borderRadius: "8px",
            padding: "6px 10px",
            fontSize: "12px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Danh sách */}
      <div
        className="hide-scrollbar"
        style={{ maxHeight: "220px", overflowY: "auto", padding: "4px 0" }}
      >
        {/* Option "Tất cả" */}
        <div
          onClick={() => {
            setFilterProductCategory("Tất cả danh mục");
            setIsFilterCatDropdownOpen(false);
            setFilterCatSearchText("");
          }}
          style={{
            padding: "8px 14px",
            fontSize: "13px",
            cursor: "pointer",
            fontWeight: filterProductCategory === "Tất cả danh mục" ? "700" : "400",
            background: filterProductCategory === "Tất cả danh mục"
              ? "rgba(20,184,166,0.12)"
              : "transparent",
            color: filterProductCategory === "Tất cả danh mục"
              ? "#2dd4bf"
              : isLight ? "#0f172a" : "#e5e7eb",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
          onMouseEnter={(e) => {
            if (filterProductCategory !== "Tất cả danh mục") {
              e.currentTarget.style.background = "#14b8a6";
              e.currentTarget.style.color = "#fff";
            }
          }}
          onMouseLeave={(e) => {
            if (filterProductCategory !== "Tất cả danh mục") {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = isLight ? "#0f172a" : "#e5e7eb";
            }
          }}
        >
          <span>🗂</span> Tất cả danh mục
        </div>

        {/* Các danh mục */}
        {categoriesList
          .filter((cat) =>
            cat.name.toLowerCase().includes(filterCatSearchText.toLowerCase())
          )
          .map((cat) => {
            const isSelected = filterProductCategory === cat.name;
            return (
              <div
                key={cat.id}
                onClick={() => {
                  setFilterProductCategory(cat.name);
                  setIsFilterCatDropdownOpen(false);
                  setFilterCatSearchText("");
                }}
                style={{
                  padding: "8px 14px",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: isSelected ? "700" : "400",
                  background: isSelected ? "rgba(20,184,166,0.12)" : "transparent",
                  color: isSelected ? "#2dd4bf" : isLight ? "#0f172a" : "#e5e7eb",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "#14b8a6";
                    e.currentTarget.style.color = "#fff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = isLight ? "#0f172a" : "#e5e7eb";
                  }
                }}
              >
                {cat.name}
              </div>
            );
          })}

        {/* Không tìm thấy */}
        {categoriesList.filter((cat) =>
          cat.name.toLowerCase().includes(filterCatSearchText.toLowerCase())
        ).length === 0 && (
          <div
            style={{
              padding: "14px",
              textAlign: "center",
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            Không tìm thấy "{filterCatSearchText}"
          </div>
        )}
      </div>
    </div>
  )}
</div>
                    </div>

                    <div className="mgr-split">
                      <div
                        className="mgr-split__main mgr-table-wrap ck-transition-all ck-duration-300"
                        style={{ flexBasis: "100%", maxWidth: "100%" }}
                      >
                        <table>
                          <thead>
                            <tr>
                              <th>Mã món</th>
                              <th>Sản phẩm</th>
                              <th>Danh mục</th>
                              <th>Giá franchise</th>
                              <th style={{ textAlign: "center" }}>
                                Trạng thái
                              </th>
                              <th style={{ textAlign: "center" }}>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const rows = masterProducts.filter((prod) => {
                                let matchText = true;
                                if (productAppliedSearch)
                                  matchText =
                                    (prod.product_id || prod.productId || "")
                                      .toLowerCase()
                                      .includes(
                                        productAppliedSearch.toLowerCase(),
                                      ) ||
                                    (prod.product_name || prod.name || "")
                                      .toLowerCase()
                                      .includes(
                                        productAppliedSearch.toLowerCase(),
                                      );
                                const matchCat =
                                  filterProductCategory === "Tất cả danh mục" ||
                                  prod.category === filterProductCategory;
                                return matchText && matchCat;
                              });

                              // CẮT DỮ LIỆU ĐỂ PHÂN TRANG
                              const currentRows = rows.slice(
                                (productPage - 1) * ITEMS_PER_PAGE,
                                productPage * ITEMS_PER_PAGE,
                              );

                              if (rows.length === 0) {
                                return (
                                  <tr>
                                    <td
                                      colSpan={6}
                                      style={{ padding: 0, border: "none" }}
                                    >
                                      <div
                                        className="mgr-empty"
                                        style={{ margin: 16 }}
                                      >
                                        <div className="mgr-empty__icon">
                                          🍽️
                                        </div>
                                        <p className="mgr-empty__title">
                                          Không có sản phẩm phù hợp
                                        </p>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <>
                                  {currentRows.map((prod, idx) => {
                                    const isSelling =
                                      prod.isActive === true ||
                                      prod.active === true ||
                                      prod.is_active === true ||
                                      prod.is_active === 1 ||
                                      String(prod.is_active) === "true";
                                    const createdDate =
                                      prod.createdAt || prod.created_at
                                        ? new Date(
                                            prod.createdAt || prod.created_at,
                                          )
                                        : new Date();
                                    const daysSinceCreation = Math.floor(
                                      (new Date() - createdDate) /
                                        (1000 * 60 * 60 * 24),
                                    );

                                    return (
                                      /* ... (TOÀN BỘ NỘI DUNG THẺ <tr> HIỂN THỊ CỦA BẠN GIỮ NGUYÊN Ở ĐÂY) ... */
                                      <tr key={idx}>
                                        <td className="mgr-mono-muted">
                                          {prod.product_id || prod.productId}
                                        </td>
                                        <td className="mgr-cell-strong">
                                          {prod.product_name || prod.name}
                                        </td>
                                        {/* ... Các cột còn lại giữ nguyên ... */}
                                        <td
                                          style={{
                                            color: "var(--text2, #d1d5db)",
                                          }}
                                        >
                                          {prod.category}
                                        </td>
                                        <td
                                          className="mgr-mono-muted"
                                          style={{
                                            color: isLight
                                              ? "#047857"
                                              : "#86efac",
                                            fontWeight: 600,
                                          }}
                                        >
                                          {Number(
                                            prod.selling_price ||
                                              prod.sellingPrice ||
                                              prod.price ||
                                              0,
                                          ).toLocaleString("vi-VN")}{" "}
                                          ₫
                                        </td>
                                        {/* Cột trạng thái và Cột Thao tác */}
                                        <td style={{ textAlign: "center" }}>
                                          {isSelling ? (
                                            <span className="mgr-pill mgr-pill--ok">
                                              🟢 Đang bán
                                            </span>
                                          ) : daysSinceCreation <= 7 ? (
                                            <span
                                              className="mgr-pill"
                                              style={{
                                                background: isLight
                                                  ? "rgba(245, 158, 11, 0.22)"
                                                  : "rgba(245, 158, 11, 0.15)",
                                                color: isLight
                                                  ? "#9a3412"
                                                  : "#fbbf24",
                                                border: isLight
                                                  ? "1px solid rgba(180, 83, 9, 0.35)"
                                                  : undefined,
                                              }}
                                            >
                                              🟠 Bản nháp (Chưa có BOM)
                                            </span>
                                          ) : (
                                            <span
                                              className="mgr-pill"
                                              style={{
                                                background: isLight
                                                  ? "rgba(71, 85, 105, 0.12)"
                                                  : "rgba(75, 85, 99, 0.2)",
                                                color: isLight
                                                  ? "#475569"
                                                  : "#9ca3af",
                                                border: isLight
                                                  ? "1px solid rgba(71, 85, 105, 0.25)"
                                                  : undefined,
                                              }}
                                            >
                                              ⚫ Ngừng bán
                                            </span>
                                          )}
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                          <div
                                            className="mgr-action-group"
                                            style={{
                                              display: "flex",
                                              justifyContent: "center",
                                              alignItems: "center",
                                              gap: "8px",
                                            }}
                                          >
                                            <button
                                              type="button"
                                              title="Chỉnh sửa"
                                              onClick={() => {
                                                // 1. Tìm ID danh mục (để đổ vào dropdown trong modal)
                                                let catId =
                                                  prod.categoryId ||
                                                  prod.category_id;
                                                if (!catId) {
                                                  const foundCat =
                                                    categoriesList.find(
                                                      (c) =>
                                                        c.name ===
                                                        prod.category,
                                                    );
                                                  catId = foundCat
                                                    ? foundCat.id
                                                    : (categoriesList[0]?.id ??
                                                      "");
                                                }

                                                // 2. Gán SP đang sửa vào state để Modal biết đường hiển thị
                                                setEditingProduct(prod);

                                                // 3. Đổ dữ liệu cũ vào Form
                                                setNewProduct({
                                                  productId:
                                                    prod.product_id ||
                                                    prod.productId ||
                                                    "",
                                                  productName:
                                                    prod.product_name ||
                                                    prod.name ||
                                                    "",
                                                  categoryId: catId,
                                                  sellingPrice:
                                                    prod.selling_price ||
                                                    prod.sellingPrice ||
                                                    prod.price ||
                                                    "",
                                                  baseUnit:
                                                    prod.baseUnit || "PHAN",
                                                  isActive: isSelling,
                                                  ingredients:
                                                    prod.ingredients || [],
                                                });

                                                // 4. Mở Modal lên
                                                setShowAddProduct(true);
                                                // Load BOM khi mở form sửa
const pId = editingProduct?.product_id || editingProduct?.productId || editingProduct?.id || prod.product_id || prod.productId || prod.id;
api.getRecipeOfProduct(pId)
  .then((res) => {
    if (res?.ingredients) {
      setNewProduct((prev) => ({
        ...prev,
        ingredients: res.ingredients.map((ing) => ({
          ingredientId: ing.ingredientId || ing.id,
          amountNeeded: Number(ing.qty || ing.amountNeeded || 0),
        })),
      }));
    }
  })
  .catch(() => {});
                                              }}
                                              className="mgr-icon-btn"
                                              style={{ padding: "6px 12px" }}
                                            >
                                              Sửa
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleToggleMasterProductStatus(
                                                  prod,
                                                )
                                              }
                                              className="mgr-icon-btn"
                                              style={{
                                                color: isSelling
                                                  ? ""
                                                  : "#4ade80",
                                                fontSize: "14px",
                                                padding: "6px 12px",
                                                minWidth: "60px",
                                              }}
                                            >
                                              {isSelling ? "Đóng" : "Mở"}
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {/* DÒNG NÀY SẼ HIỆN NÚT PHÂN TRANG Ở CUỐI BẢNG */}
                                  <tr>
                                    <td
                                      colSpan={6}
                                      style={{ padding: 0, border: "none" }}
                                    >
                                      {renderPagination(
                                        productPage,
                                        rows.length,
                                        setProductPage,
                                      )}
                                    </td>
                                  </tr>
                                </>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* === SUBTAB DANH MỤC === */}
                {productSubTab === "categories" && (
                  <div className="ck-flex ck-gap-6 ck-items-start">
                    <div
                      className="cat-grid ck-transition-all ck-duration-300 ck-w-full"
                      style={{ flexBasis: "100%", maxWidth: "100%" }}
                    >
                      {categoriesList.length === 0 ? (
                        <div
                          className="empty-state"
                          style={{ gridColumn: "1 / -1" }}
                        >
                          Chưa có danh mục. Bấm "Thêm danh mục" để tạo.
                        </div>
                      ) : (
                        categoriesList.map((cat) => {
                          const count = masterProducts.filter(
                            (p) =>
                              p.category === cat.name ||
                              String(p.categoryId) === String(cat.id),
                          ).length;
                          return (
                            <div key={cat.id} className="cat-card">
                              <div className="cat-icon">
                                {cat.name &&
                                  (cat.name.toLowerCase().includes("cơm")
                                    ? "🍚"
                                    : cat.name.toLowerCase().includes("nước") ||
                                        cat.name.toLowerCase().includes("nuoc")
                                      ? "🍜"
                                      : cat.name
                                            .toLowerCase()
                                            .includes("uống") ||
                                          cat.name
                                            .toLowerCase()
                                            .includes("uong")
                                        ? "🧋"
                                        : cat.name
                                              .toLowerCase()
                                              .includes("tráng") ||
                                            cat.name
                                              .toLowerCase()
                                              .includes("trang")
                                          ? "🍮"
                                          : "🍽")}
                              </div>
                              <div className="cat-name">{cat.name}</div>
                              <div className="cat-desc">
                                {cat.description || "Chưa có mô tả"}
                              </div>
                              <div className="cat-meta">
                                <span className="cat-id">ID: {cat.id}</span>
                                <span className="cat-count">{count} món</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* MODAL ĐƯỢC CHUYỂN RA NGOÀI ĐÂY ĐỂ LUÔN GỌI ĐƯỢC */}
                {/* ========================================================= */}

                {/* MODAL THÊM / SỬA SẢN PHẨM */}
{showAddProduct && (
  <>
    {/* Thêm một chút CSS inline để ẩn thanh cuộn cho Webkit (Chrome, Safari) */}
    <style>
      {`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}
    </style>

    <div
      className="ck-fixed ck-inset-0 ck-z-50 ck-flex ck-items-center ck-justify-center ck-animate-fade-in"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
    >
      <div
        className="mgr-aside ck-bg-gray-900 ck-border ck-border-gray-700 ck-rounded-xl ck-shadow-2xl hide-scrollbar"
        style={{
          width: "550px", /* 1. CHỈNH BỰ BỀ NGANG TẠI ĐÂY (Cũ là 400px) */
          maxWidth: "90vw",
          maxHeight: "90vh",
          overflowY: "auto",
          margin: 0,
          msOverflowStyle: "none", /* 3. Ẩn scrollbar cho IE/Edge */
          scrollbarWidth: "none",  /* 3. Ẩn scrollbar cho Firefox */
          paddingBottom: "20px"    /* Thêm khoảng không dưới cùng cho thoáng */
        }}
      >
        <div className="mgr-aside__head">
          <div>
            <h3 className="mgr-aside__title">
              {editingProduct
                ? "Chi tiết sản phẩm"
                : "Thêm sản phẩm mới"}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
  setShowAddProduct(false);
  setOpenIngredientDropdownIdx(null); 
  setIngredientSearchTexts({});         
}}
            
            className="mgr-icon-btn"
          >
            ✕
          </button>
        </div>
        
        <div className="ck-space-y-4 ck-text-sm ck-px-1">
          <div>
            <label className="ck-block ck-text-gray-400 ck-mb-1">
              Mã Sản Phẩm
            </label>
            <input
              type="text"
              readOnly={!!editingProduct}
              value={newProduct.productId}
              onChange={(e) =>
                setNewProduct({
                  ...newProduct,
                  productId: e.target.value,
                })
              }
              className={`ck-w-full ck-bg-gray-800 ${editingProduct ? "ck-text-gray-500" : "ck-text-white"} ck-px-3 ck-py-2 ck-rounded-lg ck-border ck-border-gray-700 ck-outline-none`}
              placeholder={
                editingProduct ? "" : "Tự động tạo hoặc nhập mã"
              }
            />
          </div>
          <div>
            <label className="ck-block ck-text-gray-400 ck-mb-1">
              Tên sản phẩm *
            </label>
            <input
              type="text"
              value={newProduct.productName}
              onChange={(e) =>
                setNewProduct({
                  ...newProduct,
                  productName: e.target.value,
                })
              }
              className="ck-w-full ck-bg-gray-800 ck-text-white ck-px-3 ck-py-2 ck-rounded-lg ck-border ck-border-gray-700 focus:ck-border-red-500 ck-outline-none"
            />
          </div>
          {/* ================= DANH MỤC (CÓ SEARCH) MỚI ================= */}
<div ref={categoryDropdownRef} className="ck-relative">
  <label className="ck-block ck-text-gray-400 ck-mb-1 ck-text-sm">
    Danh mục
  </label>
  
  <div
    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
    className="ck-w-full ck-bg-gray-800 ck-text-white ck-px-3 ck-py-2 ck-rounded-lg ck-border ck-border-gray-700 ck-outline-none ck-cursor-pointer ck-flex ck-justify-between ck-items-center"
  >
    <span>
      {newProduct.categoryId
        ? categoriesList.find((c) => String(c.id) === String(newProduct.categoryId))?.name || "Đã chọn danh mục"
        : "-- Chọn danh mục --"}
    </span>
    <span className="ck-text-gray-500 ck-text-xs">▼</span>
  </div>

  {isCategoryDropdownOpen && (
    <div
      className="ck-absolute ck-z-50 ck-w-full ck-bg-gray-800 ck-border ck-border-gray-600 ck-rounded-lg ck-shadow-2xl"
      style={{ top: "100%", marginTop: "4px" }} 
    >
      <div className="ck-p-2 ck-border-b ck-border-gray-700">
        <input
          type="text"
          autoFocus
          placeholder="Tìm danh mục..."
          value={categorySearchText}
          onChange={(e) => setCategorySearchText(e.target.value)}
          className="ck-w-full ck-bg-gray-900 ck-text-white ck-px-3 ck-py-1.5 ck-rounded-md ck-border ck-border-gray-700 focus:ck-border-teal-500 ck-outline-none ck-text-sm"
        />
      </div>

      <div className="ck-max-h-48 ck-overflow-y-auto hide-scrollbar ck-py-1">
        <div
          onClick={() => {
            setNewProduct({ ...newProduct, categoryId: "" });
            setIsCategoryDropdownOpen(false);
            setCategorySearchText("");
          }}
          className={`ck-px-3 ck-py-2 ck-cursor-pointer ck-text-sm hover:ck-bg-teal-600 hover:ck-text-white ${
            !newProduct.categoryId ? "ck-bg-teal-700 ck-text-white" : "ck-text-gray-300"
          }`}
        >
          -- Chọn danh mục --
        </div>

        {categoriesList
          .filter((cat) =>
            cat.name.toLowerCase().includes(categorySearchText.toLowerCase())
          )
          .map((cat) => (
            <div
              key={cat.id}
              onClick={() => {
                setNewProduct({ ...newProduct, categoryId: cat.id });
                setIsCategoryDropdownOpen(false);
                setCategorySearchText(""); 
              }}
              className={`ck-px-3 ck-py-2 ck-cursor-pointer ck-text-sm hover:ck-bg-teal-600 hover:ck-text-white ${
                String(newProduct.categoryId) === String(cat.id)
                  ? "ck-bg-teal-700 ck-text-white"
                  : "ck-text-gray-300"
              }`}
            >
              {cat.name}
            </div>
          ))}

        {categoriesList.filter((cat) =>
          cat.name.toLowerCase().includes(categorySearchText.toLowerCase())
        ).length === 0 && (
          <div className="ck-px-3 ck-py-3 ck-text-gray-500 ck-text-center ck-text-sm">
            Không tìm thấy "{categorySearchText}"
          </div>
        )}
      </div>
    </div>
  )}
</div>
{/* ================= END DANH MỤC ================= */}

          {/* ================= CHIA 2 CỘT: GIÁ BÁN & ĐƠN VỊ ================= */}
          <div className="ck-grid ck-grid-cols-2 ck-gap-4 ck-mt-4">
            <div>
              <label className="ck-block ck-text-gray-400 ck-mb-1">
                Giá Bán (₫)
              </label>
              <input
                type="number"
                value={newProduct.sellingPrice}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    sellingPrice: e.target.value,
                  })
                }
                className="ck-w-full ck-bg-gray-800 ck-text-green-400 ck-font-bold ck-px-3 ck-py-2 ck-rounded-lg ck-border ck-border-gray-700 focus:ck-border-green-400 ck-outline-none"
              />
            </div>

            {/* ================= ĐƠN VỊ TÍNH (CÓ SEARCH) ================= */}
            <div ref={unitDropdownRef} className="ck-relative">
              <label className="ck-block ck-text-gray-400 ck-mb-1">
                Đơn vị tính <span className="ck-text-red-500">*</span>
              </label>
              
              <div
                onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                className="ck-w-full ck-bg-gray-800 ck-text-white ck-px-3 ck-py-2 ck-rounded-lg ck-border ck-border-gray-700 ck-outline-none ck-cursor-pointer ck-flex ck-justify-between ck-items-center"
              >
                <span>
                  {newProduct.baseUnit
                    ? unitMasterData.find((u) => u.value === newProduct.baseUnit)?.label || newProduct.baseUnit
                    : "-- Chọn đơn vị --"}
                </span>
                <span className="ck-text-gray-500 ck-text-xs">▼</span>
              </div>

              {isUnitDropdownOpen && (
               <div
      className="ck-absolute ck-z-50 ck-w-full ck-bg-gray-800 ck-border ck-border-gray-600 ck-rounded-lg ck-shadow-2xl"
      // 👇 SỬA DÒNG NÀY: Đổi bottom thành top để nó rớt xuống dưới 👇
      style={{ top: "100%", marginTop: "4px" }} 
    >
      {/* Ô Nhập Tìm Kiếm */}
      <div className="ck-p-2 ck-border-b ck-border-gray-700">
        <input
          type="text"
          autoFocus // Tự động trỏ chuột vào khi mở
          placeholder="Tìm đơn vị..."
                      value={unitSearchText}
                      onChange={(e) => setUnitSearchText(e.target.value)}
                      className="ck-w-full ck-bg-gray-900 ck-text-white ck-px-3 ck-py-1.5 ck-rounded-md ck-border ck-border-gray-700 focus:ck-border-teal-500 ck-outline-none ck-text-sm"
                    />
                  </div>

                  <div className="ck-max-h-48 ck-overflow-y-auto hide-scrollbar ck-py-1">
  {(() => {
    const filtered = unitMasterData.filter((u) =>
  u.isSales === true &&
  u.label.toLowerCase().includes(unitSearchText.toLowerCase())
);

    const grouped = filtered.reduce((acc, u) => {
      const g = u.group || "Khác";
      if (!acc[g]) acc[g] = [];
      acc[g].push(u);
      return acc;
    }, {});

    if (filtered.length === 0) {
      return (
        <div className="ck-px-3 ck-py-3 ck-text-gray-500 ck-text-center ck-text-sm">
          Không tìm thấy "{unitSearchText}"
        </div>
      );
    }

    return Object.entries(grouped).map(([groupName, units]) => (
      <div key={groupName}>
        {/* Tiêu đề nhóm */}
        <div style={{
          padding: "6px 12px 4px",
          fontSize: "11px",
          fontWeight: "700",
          color: "#9ca3af",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          userSelect: "none",
        }}>
          {groupName}
        </div>

        {/* Các đơn vị trong nhóm */}
        {units.map((u) => (
          <div
            key={u.value}
            onClick={() => {
              setNewProduct({ ...newProduct, baseUnit: u.value });
              setIsUnitDropdownOpen(false);
              setUnitSearchText("");
            }}
            className={`ck-px-3 ck-py-2 ck-cursor-pointer ck-text-sm hover:ck-bg-teal-600 hover:ck-text-white ${
              newProduct.baseUnit === u.value
                ? "ck-bg-teal-700 ck-text-white"
                : "ck-text-gray-300"
            }`}
            style={{ paddingLeft: "20px" }}
          >
            {u.label}
          </div>
        ))}
      </div>
    ));
  })()}
</div>
                </div>
              )}
            </div>
            {/* ================= END ĐƠN VỊ TÍNH ================= */}
          </div>
          {/* =============================================================== */}

          {/* ===== CÔNG THỨC NGUYÊN LIỆU (CHỈ HIỆN KHI THÊM MỚI) ===== */}
          {!editingProduct && (
            <div style={{
              marginTop: "20px",
              paddingTop: "20px",
              borderTop: typeof isLight !== 'undefined' && isLight ? "1px solid #e2e8f0" : "1px solid #374151",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: typeof isLight !== 'undefined' && isLight ? "#64748b" : "#6b7280" }}>
                    Công thức nguyên liệu
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#4b5563", fontStyle: "italic" }}>
                    Tùy chọn — có thể thêm sau
                  </p>
                </div>
                {(newProduct.ingredients || []).length > 0 && (
                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px", background: "rgba(20,184,166,0.15)", color: "#2dd4bf", border: "1px solid rgba(45,212,191,0.3)" }}>
                    {(newProduct.ingredients || []).length} NL
                  </span>
                )}
              </div>

              {(newProduct.ingredients || []).map((row, idx) => {
  const searchText = ingredientSearchTexts[idx] || "";
  const filteredIngredients = inventory.filter((ing) => {
    const name = ing.ingredientName ?? ing.name ?? "";
    return name.toLowerCase().includes(searchText.toLowerCase());
  });
  const selectedIng = inventory.find(
    (ing) => String(ing.ingredientId ?? ing.id) === String(row.ingredientId)
  );

  return (
    <div
      key={idx}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 10px",
        borderRadius: "10px",
        background: isLight ? "#f8fafc" : "rgba(15,23,42,0.5)",
        border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
      }}
    >
      {/* ===== DROPDOWN NGUYÊN LIỆU CÓ SEARCH ===== */}
      <div
        ref={(el) => (ingredientDropdownRefs.current[idx] = el)}
        className="ck-relative"
        style={{ flex: 1, minWidth: 0 }}
      >
        {/* Nút hiển thị tên đã chọn */}
        <div
          onClick={() =>
            setOpenIngredientDropdownIdx(
              openIngredientDropdownIdx === idx ? null : idx
            )
          }
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: isLight ? "#fff" : "#111827",
            color: selectedIng
              ? isLight ? "#0f172a" : "#e5e7eb"
              : "#6b7280",
            border: isLight ? "1px solid #cbd5e1" : "1px solid #374151",
            borderRadius: "8px",
            padding: "6px 8px",
            fontSize: "12px",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedIng
              ? `${selectedIng.ingredientName ?? selectedIng.name} (${selectedIng.unit ?? "KG"})`
              : "-- Chọn nguyên liệu --"}
          </span>
          <span style={{ color: "#6b7280", fontSize: "10px", marginLeft: "4px", flexShrink: 0 }}>▼</span>
        </div>

        {/* Dropdown panel */}
        {openIngredientDropdownIdx === idx && (
          <div
            className="ck-absolute ck-z-50 ck-bg-gray-800 ck-border ck-border-gray-600 ck-rounded-lg ck-shadow-2xl"
            style={{
              top: "100%",
              marginTop: "4px",
              left: 0,
              right: 0,
              minWidth: "220px",
            }}
          >
            {/* Ô tìm kiếm */}
            <div className="ck-p-2 ck-border-b ck-border-gray-700">
              <input
                type="text"
                autoFocus
                placeholder="Tìm nguyên liệu..."
                value={searchText}
                onChange={(e) =>
                  setIngredientSearchTexts((prev) => ({
                    ...prev,
                    [idx]: e.target.value,
                  }))
                }
                className="ck-w-full ck-bg-gray-900 ck-text-white ck-px-3 ck-py-1.5 ck-rounded-md ck-border ck-border-gray-700 focus:ck-border-teal-500 ck-outline-none ck-text-sm"
              />
            </div>

            {/* Danh sách */}
            <div className="ck-max-h-48 ck-overflow-y-auto hide-scrollbar ck-py-1">
              {/* Option trống */}
              <div
                onClick={() => {
                  setNewProduct((prev) => ({
                    ...prev,
                    ingredients: prev.ingredients.map((it, i) =>
                      i === idx ? { ...it, ingredientId: "" } : it
                    ),
                  }));
                  setOpenIngredientDropdownIdx(null);
                  setIngredientSearchTexts((prev) => ({ ...prev, [idx]: "" }));
                }}
                className="ck-px-3 ck-py-2 ck-cursor-pointer ck-text-sm hover:ck-bg-teal-600 hover:ck-text-white ck-text-gray-400"
              >
                -- Chọn nguyên liệu --
              </div>

              {filteredIngredients.map((ing) => {
                const ingId = ing.ingredientId ?? ing.id;
                const isSelected = String(row.ingredientId) === String(ingId);
                return (
                  <div
                    key={ingId}
                    onClick={() => {
                      setNewProduct((prev) => ({
                        ...prev,
                        ingredients: prev.ingredients.map((it, i) =>
                          i === idx ? { ...it, ingredientId: ingId } : it
                        ),
                      }));
                      setOpenIngredientDropdownIdx(null);
                      setIngredientSearchTexts((prev) => ({ ...prev, [idx]: "" }));
                    }}
                    className={`ck-px-3 ck-py-2 ck-cursor-pointer ck-text-sm hover:ck-bg-teal-600 hover:ck-text-white ${
                      isSelected ? "ck-bg-teal-700 ck-text-white" : "ck-text-gray-300"
                    }`}
                  >
                    {ing.ingredientName ?? ing.name}
                    <span style={{ color: "#9ca3af", marginLeft: "4px", fontSize: "11px" }}>
                      ({ing.unit ?? "KG"})
                    </span>
                  </div>
                );
              })}

              {filteredIngredients.length === 0 && (
                <div className="ck-px-3 ck-py-3 ck-text-gray-500 ck-text-center ck-text-sm">
                  Không tìm thấy "{searchText}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* ===== END DROPDOWN NGUYÊN LIỆU ===== */}

      {/* Ô nhập số lượng — giữ nguyên */}
      <input
        type="number" min="0.001" step="0.001" placeholder="SL"
        value={row.amountNeeded ?? ""}
        onChange={(e) =>
          setNewProduct((prev) => ({
            ...prev,
            ingredients: prev.ingredients.map((it, i) =>
              i === idx ? { ...it, amountNeeded: Number(e.target.value) || 0 } : it
            ),
          }))
        }
        style={{
          width: "64px", flexShrink: 0,
          background: isLight ? "#fff" : "#111827",
          color: isLight ? "#0f172a" : "#e5e7eb",
          border: isLight ? "1px solid #cbd5e1" : "1px solid #374151",
          borderRadius: "8px", padding: "6px 8px",
          fontSize: "12px", outline: "none", textAlign: "right",
        }}
      />

      {/* Nút xóa dòng — giữ nguyên */}
      <button
        type="button"
        onClick={() =>
          setNewProduct((prev) => ({
            ...prev,
            ingredients: prev.ingredients.filter((_, i) => i !== idx),
          }))
        }
        title="Xóa"
        style={{
          background: "transparent", border: "none", cursor: "pointer",
          fontSize: "15px", color: "#6b7280",
          width: "28px", height: "28px",
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "8px",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#f87171"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6b7280"; }}
      >
        ➖
      </button>
    </div>
  );
})}

              <button type="button"
                onClick={() => setNewProduct((prev) => ({ ...prev, ingredients: [...(prev.ingredients || []), { ingredientId: "", amountNeeded: 0.1 }] }))}
                style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "transparent", color: typeof isLight !== 'undefined' && isLight ? "#0d9488" : "#2dd4bf", border: typeof isLight !== 'undefined' && isLight ? "1px dashed #0d9488" : "1px dashed rgba(45,212,191,0.4)", cursor: "pointer", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <span style={{ fontSize: "16px" }}>➕</span> Thêm nguyên liệu vào công thức
              </button>
            </div>
          )}
        </div>

        {/* 2. CÁCH NÚT TẠO SẢN PHẨM Ở ĐÂY */}
        <div className="ck-px-1" style={{ marginTop: "32px" }}>
          <button
            type="button"
            onClick={handleSaveProduct}
            className="mgr-btn mgr-btn--primary ck-w-full"
            style={{ 
              justifyContent: "center", 
              padding: "12px 0", // Cho nút bự và dễ bấm hơn một chút
              fontSize: "15px" 
            }}
          >
            {editingProduct ? "Lưu thay đổi" : "Tạo sản phẩm"}
          </button>
        </div>
      </div>
    </div>
  </>
)}

                {/* MODAL THÊM DANH MỤC */}
                {showAddCategory && (
                  <div
                    className="ck-fixed ck-inset-0 ck-z-50 ck-flex ck-items-center ck-justify-center ck-animate-fade-in"
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.8)",zIndex: 9999 }}
                  >
                    <div
                      className="mgr-aside ck-bg-gray-900 ck-border ck-border-gray-700 ck-rounded-xl ck-shadow-2xl"
                      style={{
                        width: "400px",
                        maxWidth: "90vw",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        margin: 0,
                      }}
                    >
                      <div className="mgr-aside__head">
                        <div>
                          <h3 className="mgr-aside__title">
                            Thêm danh mục mới
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddCategory(false)}
                          className="mgr-icon-btn"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="ck-space-y-4 ck-text-sm ck-px-1">
                        <div>
                          <label className="ck-block ck-text-gray-400 ck-mb-1">
                            Tên danh mục *
                          </label>
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="ck-w-full ck-bg-gray-800 ck-text-white ck-px-3 ck-py-2 ck-rounded-lg ck-border ck-border-gray-700 focus:ck-border-red-500 ck-outline-none"
                            placeholder="VD: Đồ uống"
                          />
                        </div>
                        <div>
                          <label className="ck-block ck-text-gray-400 ck-mb-1">
                            Mô tả
                          </label>
                          <textarea
                            value={newCategoryDescription}
                            onChange={(e) =>
                              setNewCategoryDescription(e.target.value)
                            }
                            className="ck-w-full ck-bg-gray-800 ck-text-white ck-px-3 ck-py-2 ck-rounded-lg ck-border ck-border-gray-700 focus:ck-border-red-500 ck-outline-none ck-resize-none"
                            rows={3}
                            placeholder="Mô tả về nhóm sản phẩm này..."
                          />
                        </div>
                      </div>
                      <div className="ck-mt-6">
                        <button
                          type="button"
                          onClick={handleSaveCategory}
                          className="mgr-btn mgr-btn--primary ck-w-full"
                          style={{ justifyContent: "center", marginTop: 8 }}
                        >
                          Lưu danh mục
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================== 3. TAB TỔNG QUAN TỒN KHO ================== */}
            {activeManagementTab === "Tổng quan tồn kho" && (
              <div className="ck-flex ck-flex-col ck-gap-6 ck-h-full mgr-section">
                <div className="mgr-section-head">
                  <div>
                    <div className="mgr-section-head__eyebrow">
                      Kho trung tâm
                    </div>
                    <h2 className="mgr-section-head__title">
                      Tồn kho nguyên liệu
                    </h2>
                    <p className="mgr-section-head__sub">
                      Bảng dưới lọc theo ô tìm kiếm. Dùng{" "}
                      <strong>Nhập kho</strong> để tạo phiếu.
                    </p>
                  </div>
                </div>
                <div className="mgr-search-row">
                  <div className="mgr-search-bar mgr-search-bar--amber">
                    <input
                      type="text"
                      placeholder="Tìm kiếm..."
                      defaultValue={inventorySearchText}
                      onChange={(e) => setInventorySearchText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          setInventoryAppliedSearch(inventorySearchText);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setInventoryAppliedSearch(inventorySearchText)
                      }
                    >
                      Tìm
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportHistoryModal(true);
                      fetchImportHistory();
                    }}
                    className="mgr-btn"
                    style={{
                      background: "#1e3a5f",
                      color: "#38bdf8",
                      border: "1px solid #1d4ed8",
                    }}
                  >
                    📋 Lịch sử nhập kho
                  </button>

                  {/* DÁN NÚT THÊM NGUYÊN LIỆU VÀO ĐÂY */}
  <button
    type="button"
    onClick={() => {
      setIngredientForm({
        name: "",
        kitchenStock: "",
        unit: "",
        unitCost: "",
        minThreshold: "",
      });
      setShowAddIngredient(true);
    }}
    className="btn btn-outline-teal"
    style={{
      background: "#0f766e", 
      color: "#fff",
      border: "1px solid #0d9488",
    }}
  >
    ➕ Thêm nguyên liệu
  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImportForm({
                        note: "",
                        items: [
                          { ingredientId: "", quantity: "", importPrice: "" },
                        ],
                      });
                      setShowImportModal(true);
                    }}
                    className="mgr-btn mgr-btn--primary"
                  >
                    Nhập kho
                  </button>
                </div>

                <div className="mgr-split">
                  <div
                    className="mgr-split__main mgr-table-wrap ck-transition-all ck-duration-300"
                    style={{
                      flexBasis: selectedInventoryItem ? "64%" : "100%",
                      maxWidth: selectedInventoryItem ? "64%" : "100%",
                    }}
                  >
                    <table>
                      <thead>
                        <tr>
                          <th>Mã hàng</th>
                          <th>Nguyên liệu</th>
                          <th style={{ textAlign: "left", paddingLeft: "" }}>
                            Tồn
                          </th>
                          <th style={{ textAlign: "right" }}>Đơn giá</th>
                          <th style={{ textAlign: "center" }}>Tình trạng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const currentInventoryRows = filteredInventory.slice(
                            (inventoryPage - 1) * ITEMS_PER_PAGE,
                            inventoryPage * ITEMS_PER_PAGE,
                          );

                          if (filteredInventory.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5}>
                                  <div className="mgr-empty">
                                    <p className="mgr-empty__title">
                                      Không có dòng phù hợp
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <>
                              {currentInventoryRows.map((item, idx) => {
                                const isOutOfStock = item.stock <= 0;
                                const minTh = Number(
                                  item.minThreshold ?? item.min ?? 10,
                                );
                                const isLowStock =
                                  !isOutOfStock && item.stock <= minTh;
                                const isActive =
                                  selectedInventoryItem &&
                                  (selectedInventoryItem.ingredientId ||
                                    selectedInventoryItem.sku) ===
                                    (item.ingredientId || item.sku);

                                return (
                                  <tr
                                    key={idx}
                                    role="button"
                                    onClick={() =>
                                      setSelectedInventoryItem(item)
                                    }
                                    className={`ck-cursor-pointer ${isActive ? "mgr-tr--active" : ""}`}
                                  >
                                    <td className="mgr-mono-muted">
                                      {item.ingredientId || item.sku}
                                    </td>
                                    <td className="mgr-cell-strong">
                                      {item.ingredientName || item.name}
                                    </td>
                                    <td
                                      className="mgr-mono-muted"
                                      style={{
                                        color: isOutOfStock
                                          ? "#f87171"
                                          : isLowStock
                                            ? "#fcd34d"
                                            : isLight
                                              ? "#0f172a"
                                              : "#fff",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "baseline",
                                          justifyContent: "flex-start",
                                          gap: "8px",
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontFamily: "monospace",
                                            fontWeight: "700",
                                            fontSize: "15px",
                                          }}
                                        >
                                          {Number(
                                            item.stock || 0,
                                          ).toLocaleString("vi-VN")}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: "11px",
                                            color: "var(--ink3, #9ca3af)",
                                            minWidth: "56px",
                                            textAlign: "left",
                                            fontWeight: "400",
                                          }}
                                        >
                                          {getUnitLabel(item.unit)}
                                        </span>
                                      </div>
                                    </td>
                                    <td
                                      className="mgr-mono-muted"
                                      style={{ textAlign: "right" }}
                                    >
                                      {Number(
                                        item.unitCost || 0,
                                      ).toLocaleString("vi-VN")}
                                      đ
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                      {isOutOfStock ? (
                                        <span className="mgr-pill mgr-pill--danger">
                                          Hết hàng
                                        </span>
                                      ) : isLowStock ? (
                                        <span className="mgr-pill mgr-pill--warn">
                                          Sắp hết
                                        </span>
                                      ) : (
                                        <span className="mgr-pill mgr-pill--ok">
                                          An toàn
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr>
                                <td
                                  colSpan={5}
                                  style={{ padding: 0, border: "none" }}
                                >
                                  {renderPagination(
                                    inventoryPage,
                                    filteredInventory.length,
                                    setInventoryPage,
                                  )}
                                </td>
                              </tr>
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {selectedInventoryItem && (
                    <div
                      className="mgr-aside ck-animate-fade-in"
                      style={{ flex: "0 0 32%", minWidth: 280,overflow: "visible"  }}
                    >
                      <div className="mgr-aside__head">
                        <div>
                          <h3 className="mgr-aside__title">Chi tiết tồn kho</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedInventoryItem(null)}
                          className="mgr-icon-btn"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="ck-space-y-5 ck-text-sm">
                        <div
                          className="ck-p-4 ck-rounded-xl"
                          style={{
                            background: "rgba(20, 184, 166, 0.08)",
                            border: "1px solid rgba(45, 212, 191, 0.25)",
                          }}
                        >
                          <p className="ck-text-lg ck-text-white ck-font-bold ck-mb-1">
                            {selectedInventoryItem.ingredientName ||
                              selectedInventoryItem.name}
                          </p>
                          <p
                            className="ck-text-xs ck-font-bold ck-mb-3"
                            style={{ color: "#c4b5fd" }}
                          >
                            Đơn vị gốc:{" "}
                            {getUnitLabel(selectedInventoryItem.unit)}
                          </p>

                          <div className="ck-flex ck-justify-between ck-items-end mt-4">
                            <div>
                              <p className="ck-text-xs ck-text-gray-400 ck-mb-1">
                                Số lượng tồn
                              </p>
                              <p className="ck-text-2xl ck-font-black ck-text-white">
                                {Number(
                                  selectedInventoryItem.stock || 0,
                                ).toLocaleString("vi-VN")}{" "}
                                <span className="ck-text-sm ck-text-gray-500 ck-font-normal">
                                  {getUnitLabel(selectedInventoryItem.unit)}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* BẮT ĐẦU KHỐI QUY ĐỔI ĐƠN VỊ */}
                        <div className="ck-mt-6 ck-pt-6 ck-border-t ck-border-gray-700">
                          <div className="ck-flex ck-justify-between ck-items-center ck-mb-4">
                            <h4 className="ck-text-sm ck-font-bold ck-text-white">
                              Quy đổi đơn vị (Gốc:{" "}
                              {getUnitLabel(selectedInventoryItem.unit)})
                            </h4>
                            <button
                              onClick={() =>
                                setShowAddConversion(!showAddConversion)
                              }
                              className="ck-text-xs ck-bg-gray-800 hover:ck-bg-gray-700 ck-text-blue-400 ck-px-3 ck-py-1 ck-rounded-lg ck-font-bold ck-border ck-border-gray-600 ck-transition-colors"
                            >
                              {showAddConversion ? "Đóng" : "+ Thêm Đơn Vị"}
                            </button>
                          </div>

                          {showAddConversion && (
                            <div className="ck-bg-gray-800 ck-p-4 ck-rounded-xl ck-mb-4 ck-border ck-border-blue-500/30 ck-animate-fade-in">
                              {/* Group 2 ô Input chia đều 50/50 */}
                              <div className="conversion-input-group ck-flex ck-gap-2 ck-w-full">
                                {/* MỚI: search dropdown quy đổi đơn vị */}
<div ref={convUnitDropdownRef} style={{ position: "relative", flex: 1, minWidth: 0 }}>
  
  {/* Ô trigger */}
  <div
    id="conv-unit-trigger"
    onClick={() => {
      setIsConvUnitDropdownOpen((prev) => !prev);
      setConvUnitSearchText("");
    }}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "7px 10px",
      borderRadius: "8px",
      border: "1px solid #374151",
      background: "#111827",
      color: newConversion.unitName ? "#e5e7eb" : "#6b7280",
      cursor: "pointer",
      fontSize: "12px",
      userSelect: "none",
      minHeight: "34px",
    }}
  >
    <span>
      {newConversion.unitName
        ? unitMasterData.find((u) => u.value === newConversion.unitName)?.label ?? newConversion.unitName
        : "-- Chọn đơn vị --"}
    </span>
    <span style={{ fontSize: "10px", color: "#6b7280" }}>
      {isConvUnitDropdownOpen ? "▲" : "▼"}
    </span>
  </div>

  {/* Dropdown panel - fixed để thoát overflow */}
  {isConvUnitDropdownOpen && (
  <div
    style={{
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      marginTop: "4px",
      background: "#1f2937",
      border: "1px solid #374151",
      borderRadius: "8px",
      zIndex: 99999,
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      overflow: "hidden",
    }}
  >
    {/* Ô search */}
    <div style={{ padding: "6px", borderBottom: "1px solid #374151" }}>
      <input
        autoFocus
        type="text"
        placeholder="Tìm đơn vị..."
        value={convUnitSearchText}
        onChange={(e) => setConvUnitSearchText(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          padding: "5px 8px",
          borderRadius: "6px",
          border: "1px solid #374151",
          background: "#111827",
          color: "#e5e7eb",
          fontSize: "12px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>

    {/* Danh sách */}
    <ul
      className="hide-scrollbar"
      style={{
        listStyle: "none",
        margin: 0,
        padding: "4px 0",
        maxHeight: "160px",
        overflowY: "auto",
      }}
    >
      {unitMasterData
        .filter(
          (u) =>
            u.label.toLowerCase().includes(convUnitSearchText.toLowerCase()) ||
            u.value.toLowerCase().includes(convUnitSearchText.toLowerCase())
        )
        .map((u) => (
          <li
            key={u.value}
            onClick={() => {
              setNewConversion({ ...newConversion, unitName: u.value });
              setIsConvUnitDropdownOpen(false);
              setConvUnitSearchText("");
            }}
            style={{
              padding: "7px 12px",
              cursor: "pointer",
              fontSize: "12px",
              color: newConversion.unitName === u.value ? "#2dd4bf" : "#e5e7eb",
              background:
                newConversion.unitName === u.value
                  ? "rgba(20,184,166,0.12)"
                  : "transparent",
              fontWeight: newConversion.unitName === u.value ? "600" : "400",
            }}
            onMouseEnter={(e) => {
              if (newConversion.unitName !== u.value)
                e.currentTarget.style.background = "#374151";
            }}
            onMouseLeave={(e) => {
              if (newConversion.unitName !== u.value)
                e.currentTarget.style.background = "transparent";
            }}
          >
            {u.label}
          </li>
        ))}

      {unitMasterData.filter(
        (u) =>
          u.label.toLowerCase().includes(convUnitSearchText.toLowerCase()) ||
          u.value.toLowerCase().includes(convUnitSearchText.toLowerCase())
      ).length === 0 && (
        <li style={{ padding: "8px 12px", color: "#6b7280", fontSize: "12px" }}>
          Không tìm thấy
        </li>
      )}
    </ul>
  </div>
)}
</div>

                                <input
                                  type="number"
                                  placeholder="Tỉ lệ (VD: 20)"
                                  value={newConversion.conversionFactor}
                                  onChange={(e) =>
                                    setNewConversion({
                                      ...newConversion,
                                      conversionFactor: e.target.value,
                                    })
                                  }
                                  className="ck-flex-1 ck-min-w-0 ck-bg-gray-900 ck-text-white ck-px-3 ck-py-2 ck-rounded-lg ck-border ck-border-gray-700 ck-outline-none ck-text-xs"
                                />
                              </div>

                              {newConversion.unitName &&
                                newConversion.conversionFactor && (
                                  <div
                                    className="ck-animate-fade-in"
                                    style={{
                                      marginTop: 10,
                                      marginBottom: 10,
                                      padding: "10px 12px",
                                      borderRadius: 10,
                                      background: "rgba(15, 23, 42, 0.6)", // ← tối hơn
                                      border:
                                        "1px dashed rgba(71, 85, 105, 0.5)", // ← viền xám tối
                                      display: "flex",
                                      gap: 8,
                                      alignItems: "flex-start",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 14,
                                        flexShrink: 0,
                                        marginTop: 1,
                                      }}
                                    >
                                      💡
                                    </span>
                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: 11.5,
                                        color: "#94a3b8",
                                        lineHeight: 1.6,
                                      }}
                                    >
                                      {" "}
                                      {/* ← chữ xám */}
                                      <strong style={{ color: "#cbd5e1" }}>
                                        Chú thích:{" "}
                                      </strong>
                                      Khi tạo Phiếu Nhập Kho{" "}
                                      <strong style={{ color: "#e2e8f0" }}>
                                        1 {getUnitLabel(newConversion.unitName)}
                                      </strong>
                                      {selectedInventoryItem.ingredientName ||
                                        selectedInventoryItem.name}
                                      , hệ thống sẽ tự động cộng{" "}
                                      <strong style={{ color: "#4ade80" }}>
                                        {newConversion.conversionFactor}{" "}
                                        {getUnitLabel(
                                          selectedInventoryItem.unit,
                                        )}
                                      </strong>
                                      vào tồn kho vật lý.
                                    </p>
                                  </div>
                                )}

                              <button
                                type="button"
                                className="mgr-pill mgr-pill--ok mgr-btn-save-conversion ck-mt-3"
                                style={{
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                  transform: "translateY(0)",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform =
                                    "translateY(-3px)";
                                  e.currentTarget.style.filter =
                                    "brightness(1.15)";
                                  e.currentTarget.style.boxShadow =
                                    "0 6px 16px rgba(20, 184, 166, 0.3)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform =
                                    "translateY(0)";
                                  e.currentTarget.style.filter =
                                    "brightness(1)";
                                  e.currentTarget.style.boxShadow = "none";
                                }}
                                onClick={async () => {
                                  if (
                                    !newConversion.unitName ||
                                    !newConversion.conversionFactor
                                  ) {
                                    return alert(
                                      "Vui lòng nhập đủ thông tin (Tên đơn vị và Tỉ lệ)!",
                                    );
                                  }
                                  try {
                                    const ingId =
                                      selectedInventoryItem.ingredientId ||
                                      selectedInventoryItem.id ||
                                      selectedInventoryItem.sku;
                                    const payload = {
                                      ingredientId: ingId,
                                      unitName: newConversion.unitName, // Không cần .toUpperCase() nữa vì select đã fix sẵn value
                                      conversionFactor: Number(
                                        newConversion.conversionFactor,
                                      ),
                                    };
                                    const newConv =
                                      await api.createUnitConversion(payload);
                                    setConversions((prev) => [
                                      ...prev,
                                      newConv.data || newConv,
                                    ]);
                                    alert(
                                      "✅ Đã thêm quy đổi đơn vị thành công!",
                                    );
                                    setNewConversion({
                                      unitName: "",
                                      conversionFactor: "",
                                    });
                                    setShowAddConversion(false);
                                  } catch (error) {
                                    alert(
                                      "❌ Lỗi thêm quy đổi: " +
                                        (error.message || "Vui lòng thử lại"),
                                    );
                                  }
                                }}
                              >
                                LƯU QUY ĐỔI
                              </button>
                            </div>
                          )}
                          <div className="ck-space-y-2 ck-max-h-40 ck-overflow-y-auto ck-scrollbar pr-1">
                            {conversions.length > 0 ? (
                              conversions.map((conv, idx) => (
                                <div
                                  key={idx}
                                  className="ck-flex ck-justify-between ck-items-center ck-bg-gray-800 ck-p-2 ck-rounded-lg ck-border ck-border-gray-700"
                                  style={{ position: "relative" }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget
                                      .querySelectorAll(".conv-action-btn")
                                      .forEach((b) => (b.style.opacity = "1"));
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget
                                      .querySelectorAll(".conv-action-btn")
                                      .forEach((b) => (b.style.opacity = "0"));
                                  }}
                                >
                                  {/* Nội dung quy đổi */}
                                  <div className="ck-text-xs ck-text-gray-300">
                                    1{" "}
                                    <strong className="ck-text-white ck-font-mono">
                                      {getUnitLabel(
                                        conv.unitName ||
                                          conv.unit_name ||
                                          conv.name ||
                                          conv.unit,
                                      )}
                                    </strong>{" "}
                                    ={" "}
                                    {conv.conversionFactor ||
                                      conv.conversion_factor}{" "}
                                    {getUnitLabel(selectedInventoryItem.unit)}
                                  </div>

                                  {/* Nhóm nút hành động */}
                                  <div
                                    className="ck-flex ck-items-center"
                                    style={{ gap: 4 }}
                                  >
                                    {/* Nút sửa */}
                                    <button
                                      type="button"
                                      className="conv-action-btn mgr-icon-btn"
                                      title="Sửa tỉ lệ"
                                      style={{
                                        opacity: 0,
                                        transition: "opacity 0.2s ease",
                                        marginRight: 4,
                                      }}
                                      onClick={async () => {
                                        const currentFactor =
                                          conv.conversionFactor ||
                                          conv.conversion_factor;
                                        const unit =
                                          conv.unitName || conv.unit_name;
                                        const newFactor = window.prompt(
                                          `Nhập tỉ lệ quy đổi mới cho ${unit} (Gốc: ${selectedInventoryItem.unit}):`,
                                          currentFactor,
                                        );
                                        if (
                                          newFactor &&
                                          newFactor !== String(currentFactor) &&
                                          !isNaN(newFactor)
                                        ) {
                                          try {
                                            await api.updateUnitConversion(
                                              conv.id,
                                              Number(newFactor),
                                            );
                                            setConversions(
                                              conversions.map((c) =>
                                                c.id === conv.id
                                                  ? {
                                                      ...c,
                                                      conversionFactor:
                                                        Number(newFactor),
                                                      conversion_factor:
                                                        Number(newFactor),
                                                    }
                                                  : c,
                                              ),
                                            );
                                            alert(
                                              `✅ Đã cập nhật tỉ lệ ${unit} = ${newFactor} ${selectedInventoryItem.unit}`,
                                            );
                                          } catch (e) {
                                            alert(
                                              "❌ Lỗi cập nhật: " + e.message,
                                            );
                                          }
                                        }
                                      }}
                                    >
                                      Sửa
                                    </button>

                                    {/* Nút xóa */}
                                    <button
                                      type="button"
                                      className="conv-action-btn mgr-icon-btn"
                                      title="Xóa quy đổi"
                                      style={{
                                        opacity: 0,
                                        transition: "opacity 0.2s ease",
                                        color: "",

                                        fontSize: 16,
                                      }}
                                      onClick={async () => {
                                        if (
                                          window.confirm(
                                            `Bạn muốn xóa quy đổi ${conv.unitName || conv.unit_name}?`,
                                          )
                                        ) {
                                          try {
                                            await api.deleteUnitConversion(
                                              conv.id,
                                            );
                                            setConversions(
                                              conversions.filter(
                                                (c) => c.id !== conv.id,
                                              ),
                                            );
                                          } catch (e) {
                                            alert("Lỗi xóa: " + e.message);
                                          }
                                        }
                                      }}
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="ck-text-xs ck-text-gray-500 ck-italic ck-text-center ck-py-2">
                                Chưa có quy đổi nào được thiết lập.
                              </p>
                            )}
                          </div>

                          {conversions.length > 0 && (
                            <div className="ck-mt-4 ck-pt-4 ck-border-t ck-border-gray-700 border-dashed">
                              <p className="ck-text-sm ck-text-gray-300 ck-font-bold ck-mb-3">
                                🧪 Test công thức quy đổi
                              </p>
                              <div className="ck-flex ck-gap-3 ck-items-center">
                                <input
                                  type="number"
                                  placeholder="SL..."
                                  value={testData.qty}
                                  onChange={(e) =>
                                    setTestData({
                                      ...testData,
                                      qty: e.target.value,
                                    })
                                  }
                                  className="ck-w-20 ck-bg-gray-900 ck-text-white ck-px-3 ck-py-2 ck-rounded-lg ck-border ck-border-gray-700 ck-outline-none ck-text-sm"
                                />
                                <select
                                  value={testData.unit}
                                  onChange={(e) =>
                                    setTestData({
                                      ...testData,
                                      unit: e.target.value,
                                    })
                                  }
                                  className="ck-flex-1 ck-bg-gray-900 ck-text-white ck-px-3 ck-py-2 ck-rounded-lg ck-border ck-border-gray-700 ck-outline-none ck-text-sm"
                                >
                                  <option value="" disabled>
                                    Chọn ĐV
                                  </option>
                                  {conversions.map((c, i) => {
                                    const unitCode =
                                      typeof c === "string"
                                        ? c
                                        : c.unitName ||
                                          c.unit_name ||
                                          c.name ||
                                          c.unit ||
                                          c.unit_type ||
                                          "";
                                    return (
                                      <option key={i} value={unitCode}>
                                        {getUnitLabel(unitCode)}
                                      </option>
                                    );
                                  })}
                                </select>

                                <button
                                  onClick={async () => {
                                    if (!testData.qty || !testData.unit) return;
                                    try {
                                      const ingId =
                                        selectedInventoryItem.ingredientId ||
                                        selectedInventoryItem.id ||
                                        selectedInventoryItem.sku;
                                      const res = await api.calculateConversion(
                                        ingId,
                                        testData.unit,
                                        testData.qty,
                                      );
                                      setTestResult(
                                        res.calculatedQuantity ||
                                          res.result ||
                                          res.data ||
                                          res,
                                      );
                                    } catch (e) {
                                      alert("Lỗi tính toán: " + e.message);
                                    }
                                  }}
                                  className="mgr-pill mgr-pill--ok ck-px-5 ck-py-2 ck-border-none ck-text-sm ck-font-bold"
                                  style={{
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    transform: "translateY(0)",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform =
                                      "translateY(-3px)";
                                    e.currentTarget.style.filter =
                                      "brightness(1.15)";
                                    e.currentTarget.style.boxShadow =
                                      "0 6px 16px rgba(20, 184, 166, 0.3)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform =
                                      "translateY(0)";
                                    e.currentTarget.style.filter =
                                      "brightness(1)";
                                    e.currentTarget.style.boxShadow = "none";
                                  }}
                                >
                                  Tính
                                </button>
                              </div>
                              {testResult !== null &&
                                typeof testResult !== "object" && (
                                  <p className="ck-text-base ck-mt-3 ck-text-green-400 ck-font-black ck-text-right">
                                    = {testResult}{" "}
                                    {getUnitLabel(selectedInventoryItem.unit)}
                                  </p>
                                )}
                            </div>
                          )}
                        </div>
                        {/* KẾT THÚC KHỐI QUY ĐỔI ĐƠN VỊ */}
                      </div>
                    </div>
                  )}
                </div>
                {showImportModal && (
                  <div
                    className="ck-modal-overlay ingredient-form-modal ck-animate-fade-in manager-ui"
                    onClick={() =>
                      !importSubmitting && setShowImportModal(false)
                    }
                    role="presentation"
                    style={{ zIndex: 9999 }}
                  >
                    <div
                      className="ck-modal-box ingredient-form-box ck-max-w-lg ck-w-full"
                      onClick={(e) => e.stopPropagation()}
                      role="presentation"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        maxHeight: "85vh",
                        width: "500px",
                      }}
                    >
                      {/* HEADER */}
                      <div className="form-header" style={{ flexShrink: 0 }}>
                        <div>
                          <h3>Tạo phiếu nhập kho</h3>
                        </div>
                        <button
                          type="button"
                          className="btn-close"
                          disabled={importSubmitting}
                          onClick={() => setShowImportModal(false)}
                        >
                          ✕
                        </button>
                      </div>

                      <form
                        onSubmit={handleSubmitImport}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          flex: 1,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          className="form-body ck-scrollbar"
                          style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "20px",
                          }}
                        >
                          {/* GHI CHÚ */}
                          <div className="field ck-mb-4">
                            <label className="ck-mb-1.5 ck-block ck-text-xs ck-font-medium ck-text-gray-400">
                              Ghi chú phiếu nhập
                            </label>
                            <textarea
                              className="ck-input ck-w-full ck-min-h-[64px] ck-py-2.5 ck-px-3 ck-rounded-xl ck-resize-none ck-bg-gray-900 ck-text-white ck-border-gray-700"
                              placeholder="VD: Nhập hàng thịt đợt 1..."
                              value={importForm.note}
                              onChange={(e) =>
                                setImportForm((prev) => ({
                                  ...prev,
                                  note: e.target.value,
                                }))
                              }
                            />
                          </div>

                          {/* DANH SÁCH NGUYÊN LIỆU */}
                          <div className="field">
                            <label className="ck-mb-2 ck-block ck-text-xs ck-font-medium ck-text-gray-400">
                              Danh sách nguyên liệu nhập (
                              {importForm.items.length} dòng)
                            </label>
                            <div className="ck-rounded-xl ck-border ck-border-gray-700 ck-overflow-hidden ck-bg-gray-900/40">
                              {/* Header bảng */}
                              <div
                                className="ck-grid ck-gap-2 ck-p-2 ck-items-center ck-text-[10px] ck-font-bold ck-text-gray-500 ck-border-b ck-border-gray-700 ck-uppercase"
                                style={{
                                  gridTemplateColumns: "1fr 80px 100px 36px",
                                }}
                              >
                                <span>Nguyên liệu</span>
                                <span>Số lượng</span>
                                <span>Đơn giá (đ)</span>
                                <span />
                              </div>

                              {/* Danh sách dòng */}
                              {importForm.items.map((row, index) => {
  const searchText = importIngSearchTexts[index] || "";
  const selectedIng = inventory.find(
    (ing) => String(ing.ingredientId ?? ing.id) === String(row.ingredientId)
  );
  const filteredList = inventory.filter((ing) => {
    const name = ing.name ?? ing.ingredientName ?? "";
    return name.toLowerCase().includes(searchText.toLowerCase());
  });

  return (
    <div
      key={index}
      className="ck-grid ck-gap-2 ck-p-2 ck-items-center ck-border-b ck-border-gray-700/50 last:ck-border-b-0 hover:ck-bg-gray-800/40"
      style={{ gridTemplateColumns: "1fr 80px 100px 36px" }}
    >
      {/* ===== DROPDOWN NGUYÊN LIỆU ===== */}
      <div
        ref={(el) => (importIngDropdownRefs.current[index] = el)}
        style={{ position: "relative" }}
      >
        {/* Nút hiển thị */}
        <div
          onClick={() =>
            setOpenImportDropdownIdx(
              openImportDropdownIdx === index ? null : index
            )
          }
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#111827",
            color: selectedIng ? "#fff" : "#6b7280",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "7px 10px",
            fontSize: "12px",
            cursor: "pointer",
            userSelect: "none",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              minWidth: 0,
            }}
          >
            {selectedIng
              ? `${selectedIng.name ?? selectedIng.ingredientName} (${getUnitLabel(selectedIng.unit) ?? "KG"})`
              : "-- Chọn --"}
          </span>
          <span style={{ fontSize: "9px", color: "#6b7280", marginLeft: "4px", flexShrink: 0 }}>
            ▼
          </span>
        </div>

        {/* Dropdown panel */}
        {openImportDropdownIdx === index && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              marginTop: "4px",
              left: 0,
              minWidth: "220px",
              zIndex: 9999,
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "10px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}
          >
            {/* Ô tìm kiếm */}
            <div style={{ padding: "8px", borderBottom: "1px solid #374151" }}>
              <input
                type="text"
                autoFocus
                placeholder="Tìm nguyên liệu..."
                value={searchText}
                onChange={(e) =>
                  setImportIngSearchTexts((prev) => ({
                    ...prev,
                    [index]: e.target.value,
                  }))
                }
                style={{
                  width: "100%",
                  background: "#111827",
                  color: "#fff",
                  border: "1px solid #4b5563",
                  borderRadius: "7px",
                  padding: "6px 10px",
                  fontSize: "12px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Danh sách */}
            <div
              className="hide-scrollbar"
              style={{ maxHeight: "180px", overflowY: "auto", padding: "4px 0" }}
            >
              {/* Option trống */}
              <div
                onClick={() => {
                  handleImportRowChange(index, "ingredientId", "");
                  setOpenImportDropdownIdx(null);
                  setImportIngSearchTexts((prev) => ({ ...prev, [index]: "" }));
                }}
                style={{
                  padding: "7px 12px",
                  fontSize: "12px",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#14b8a6";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#6b7280";
                }}
              >
                -- Chọn --
              </div>

              {filteredList.map((ing) => {
                const ingId = ing.ingredientId ?? ing.id;
                const isSelected = String(row.ingredientId) === String(ingId);
                return (
                  <div
                    key={ingId}
                    onClick={() => {
                      handleImportRowChange(index, "ingredientId", ingId);
                      setOpenImportDropdownIdx(null);
                      setImportIngSearchTexts((prev) => ({ ...prev, [index]: "" }));
                    }}
                    style={{
                      padding: "7px 12px",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: isSelected ? "#0d9488" : "transparent",
                      color: isSelected ? "#fff" : "#e5e7eb",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "#14b8a6";
                        e.currentTarget.style.color = "#fff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#e5e7eb";
                      }
                    }}
                  >
                    <span>{ing.name ?? ing.ingredientName}</span>
                    <span style={{ fontSize: "10px", color: isSelected ? "#99f6e4" : "#9ca3af" }}>
                      {getUnitLabel(ing.unit) ?? "KG"}
                    </span>
                  </div>
                );
              })}

              {filteredList.length === 0 && (
                <div
                  style={{
                    padding: "14px",
                    textAlign: "center",
                    fontSize: "12px",
                    color: "#6b7280",
                  }}
                >
                  Không tìm thấy "{searchText}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* ===== END DROPDOWN ===== */}

      {/* Số lượng — giữ nguyên */}
      <input
        type="number" min="0" step="0.01"
        className="ck-input ck-w-full ck-px-3 ck-py-2 ck-rounded-lg ck-text-xs ck-bg-gray-950 ck-text-right"
        value={row.quantity}
        onChange={(e) => handleImportRowChange(index, "quantity", e.target.value)}
        placeholder="0"
      />

      {/* Đơn giá — giữ nguyên */}
      <input
        type="number" min="0"
        className="ck-input ck-w-full ck-px-3 ck-py-2 ck-rounded-lg ck-text-xs ck-bg-gray-950 ck-text-right"
        value={row.importPrice}
        onChange={(e) => handleImportRowChange(index, "importPrice", e.target.value)}
        placeholder="0"
      />

      {/* Nút xóa dòng — giữ nguyên */}
      <button
        type="button"
        onClick={() => handleRemoveImportRow(index)}
        className="ck-flex ck-items-center ck-justify-center ck-w-8 ck-h-8 ck-rounded-full ck-text-gray-500 hover:ck-bg-red-500/10 hover:ck-text-red-500 ck-transition-all"
        style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "15px" }}
        title="Xóa dòng"
      >
        ➖
      </button>
    </div>
  );
})}

                              {/* Nút thêm dòng - CSS Admin + Icon + */}
                              <button
                                type="button"
                                className="import-add-row-btn ck-w-full ck-py-2.5 ck-px-3 ck-text-xs ck-flex ck-items-center ck-justify-center ck-gap-2 ck-transition-colors hover:ck-bg-gray-800 ck-text-gray-400"
                                onClick={handleAddImportRow}
                                style={{
                                  borderTop: "1px solid #374151",
                                  background: "transparent",
                                }}
                              >
                                <span style={{ fontSize: "14px" }}>➕</span>
                                Thêm dòng nguyên liệu
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Nút bấm kiểu Lưu công thức */}
                        {/* Nút bấm kiểu Lưu công thức */}
                        <div
                          className="form-actions"
                          style={{
                            padding: "20px",
                            borderTop: "1px solid #374151",
                            display: "flex",
                            gap: "12px",
                          }}
                        >
                          <button
                            type="button"
                            className="btn-cancel ck-flex-1 ck-py-3 ck-rounded-xl ck-font-bold"
                            onClick={() =>
                              !importSubmitting && setShowImportModal(false)
                            }
                            style={{
                              background: "#4b5563",
                              color: "#fff",
                              border: "none",
                              cursor: "pointer", // Biến thành hình bàn tay
                              transition: "all 0.2s ease", // Tạo độ mượt khi nhảy
                            }}
                            // Hiệu ứng nhảy nhẹ khi hover
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.transform =
                                "translateY(-3px)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.transform =
                                "translateY(0)")
                            }
                          >
                            Hủy bỏ
                          </button>

                          <button
                            type="submit"
                            className="btn-submit ck-flex-1 ck-py-3 ck-rounded-xl ck-font-bold"
                            disabled={importSubmitting}
                            style={{
                              background: "#14b8a6",
                              color: "#fff",
                              border: "none",
                              cursor: importSubmitting
                                ? "not-allowed"
                                : "pointer", // Chỉ hiện bàn tay khi không bị disabled
                              transition: "all 0.2s ease",
                            }}
                            // Hiệu ứng nhảy nhẹ khi hover
                            onMouseEnter={(e) => {
                              if (!importSubmitting)
                                e.currentTarget.style.transform =
                                  "translateY(-3px)";
                            }}
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.transform =
                                "translateY(0)")
                            }
                          >
                            {importSubmitting
                              ? "Đang xử lý..."
                              : "Tạo phiếu nhập"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================== KIỂM KÊ KHO ================== */}
            {activeManagementTab === "Kiểm kê kho" &&
              (() => {
                const hasInput = Object.keys(stocktakeForm).length > 0;

                return (
                  <div className="ck-flex ck-flex-col ck-gap-6 ck-h-full ck-animate-fade-in mgr-section">
                    {/* HERO HEADER */}
                    <div className="mgr-hero">
                      <div>
                        <h2 className="mgr-hero__title">Kiểm kê định kỳ</h2>
                        <p className="mgr-hero__sub">
                          Nhập <strong>đếm thực tế</strong> cho từng dòng cần
                          đối soát.
                        </p>
                      </div>
                      <div className="ck-flex ck-items-center ck-gap-3">
                        <button
                          type="button"
                          onClick={handleOpenHistory}
                          className="mgr-btn"
                          style={{
                            background: isLight ? "#f1f5f9" : "#1f2937",
                            color: isLight ? "#475569" : "#9ca3af",
                            border: isLight
                              ? "1px solid #cbd5e1"
                              : "1px solid #374151",
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span style={{ fontSize: "15px" }}>🗂️</span> Lịch sử
                          kiểm kê
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitStocktake(false)}
                          disabled={isSubmittingStocktake || !hasInput}
                          className="mgr-btn mgr-btn--primary"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            borderRadius: "12px",
                          }}
                        >
                          <span style={{ fontSize: "15px" }}>✅</span>
                          {isSubmittingStocktake
                            ? "Đang xử lý…"
                            : "Xác nhận kiểm kê"}
                        </button>
                      </div>
                    </div>

                    {/* TABLE */}
                    <div
                      className="mgr-table-wrap"
                      style={{
                        borderRadius: "16px",
                        overflow: "hidden",
                        border: isLight
                          ? "1px solid #cbd5e1"
                          : "1px solid #1f2937",
                      }}
                    >
                      {/* THANH TÌM KIẾM — thêm vào đây, trước phần bảng */}
                      <div
                        style={{
                          padding: "12px 18px",
                          background: isLight ? "#f1f5f9" : "#0d1117",
                          borderBottom: isLight
                            ? "1px solid #cbd5e1"
                            : "1px solid #1f2937",
                          display: "flex",
                          gap: "8px",
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Tìm nguyên liệu cần kiểm kê…"
                          value={stocktakeSearchText}
                          onChange={(e) =>
                            setStocktakeSearchText(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              setStocktakeAppliedSearch(stocktakeSearchText);
                          }}
                          style={{
                            flex: 1,
                            background: isLight
                              ? "#ffffff"
                              : "rgba(15,23,42,0.6)",
                            color: isLight ? "#0f172a" : "#e5e7eb",
                            border: isLight
                              ? "1px solid #94a3b8"
                              : "1px solid rgba(55,65,81,0.8)",
                            borderRadius: "10px",
                            padding: "8px 14px",
                            fontSize: "13px",
                            outline: "none",
                          }}
                          onFocus={(e) =>
                            (e.currentTarget.style.border =
                              "1px solid rgba(45,212,191,0.5)")
                          }
                          onBlur={(e) =>
                            (e.currentTarget.style.border = isLight
                              ? "1px solid #94a3b8"
                              : "1px solid rgba(55,65,81,0.8)")
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setStocktakeAppliedSearch(stocktakeSearchText)
                          }
                          style={{
                            padding: "8px 18px",
                            borderRadius: "10px",
                            background: "#0f766e",
                            color: "#fff",
                            border: "none",
                            fontSize: "13px",
                            fontWeight: "700",
                            cursor: "pointer",
                          }}
                        >
                          Tìm
                        </button>
                        {stocktakeAppliedSearch && (
                          <button
                            type="button"
                            onClick={() => {
                              setStocktakeSearchText("");
                              setStocktakeAppliedSearch("");
                            }}
                            style={{
                              padding: "8px 12px",
                              borderRadius: "10px",
                              background: isLight ? "#e2e8f0" : "#374151",
                              color: isLight ? "#64748b" : "#9ca3af",
                              border: isLight ? "1px solid #cbd5e1" : "none",
                              fontSize: "13px",
                              cursor: "pointer",
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="ck-max-h-[580px] ck-overflow-y-auto ck-scrollbar">
                        <table
                          style={{
                            position: "relative",
                            width: "100%",
                            borderCollapse: "collapse",
                          }}
                        >
                          <thead
                            style={{
                              position: "sticky",
                              top: 0,
                              zIndex: 2,
                              background: isLight ? "#f1f5f9" : "#111827",
                              borderBottom: isLight
                                ? "1px solid #cbd5e1"
                                : undefined,
                            }}
                          >
                            <tr>
                              <th
                                style={{
                                  padding: "14px 18px",
                                  textAlign: "left",
                                  color: "#6b7280",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                  width: "35%",
                                }}
                              >
                                Tên nguyên liệu
                              </th>
                              <th
                                style={{
                                  padding: "14px 18px",
                                  textAlign: "",
                                  color: "#6b7280",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                  width: "15%",
                                }}
                              >
                                Tồn sổ
                              </th>
                              <th
                                style={{
                                  padding: "14px 18px",
                                  textAlign: "left",
                                  color: "#6b7280",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                  width: "20%",
                                }}
                              >
                                Thực tế
                              </th>
                              <th
                                style={{
                                  padding: "14px 18px",
                                  textAlign: "left",
                                  color: "#6b7280",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                Ghi chú hiện trường
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              // ---- THÊM ĐOẠN LỌC NÀY ----
                              const filteredStocktake = inventory.filter(
                                (item) => {
                                  if (!stocktakeAppliedSearch) return true;
                                  const name = (
                                    item.ingredientName ||
                                    item.name ||
                                    ""
                                  ).toLowerCase();
                                  const id = (
                                    item.ingredientId ||
                                    item.id ||
                                    item.sku ||
                                    ""
                                  ).toLowerCase();
                                  const keyword =
                                    stocktakeAppliedSearch.toLowerCase();
                                  return (
                                    name.includes(keyword) ||
                                    id.includes(keyword)
                                  );
                                },
                              );
                              // ---- KẾT THÚC ĐOẠN LỌC ----

                              const currentStocktakeRows =
                                filteredStocktake.slice(
                                  (stocktakePage - 1) * ITEMS_PER_PAGE,
                                  stocktakePage * ITEMS_PER_PAGE,
                                );

                              return (
                                <>
                                  {currentStocktakeRows.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={4}
                                        style={{
                                          padding: "40px 0",
                                          textAlign: "center",
                                          color: "#6b7280",
                                          fontSize: "14px",
                                        }}
                                      >
                                        Không tìm thấy nguyên liệu nào phù hợp.
                                      </td>
                                    </tr>
                                  ) : (
                                    currentStocktakeRows.map((item, idx) => {
                                      const ingId =
                                        item.ingredientId ||
                                        item.id ||
                                        item.sku;
                                      const sysStock = Number(item.stock || 0);
                                      const actualInput =
                                        stocktakeForm[ingId]?.actualQty;
                                      let isOverLimit = false;
                                      let diff = 0;
                                      if (
                                        actualInput !== undefined &&
                                        actualInput !== ""
                                      ) {
                                        const actual = Number(actualInput);
                                        diff = actual - sysStock;
                                        const diffPercent =
                                          sysStock > 0
                                            ? (Math.abs(diff) / sysStock) * 100
                                            : actual > 0
                                              ? 100
                                              : 0;
                                        isOverLimit =
                                          diffPercent > 50 &&
                                          Math.abs(diff) > 0.5;
                                      }

                                      return (
                                        <tr
                                          key={idx}
                                          style={{
                                            borderBottom: isLight
                                              ? "1px solid #e2e8f0"
                                              : "1px solid #1f2937",
                                            background: isOverLimit
                                              ? "rgba(239,68,68,0.06)"
                                              : "transparent",
                                            transition: "background 0.2s",
                                          }}
                                          onMouseEnter={(e) => {
                                            if (!isOverLimit)
                                              e.currentTarget.style.background =
                                                isLight
                                                  ? "rgba(15,23,42,0.04)"
                                                  : "rgba(255,255,255,0.02)";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.background =
                                              isOverLimit
                                                ? "rgba(239,68,68,0.06)"
                                                : "transparent";
                                          }}
                                        >
                                          {/* TÊN NGUYÊN LIỆU */}
                                          <td style={{ padding: "12px 18px" }}>
                                            <div
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "10px",
                                              }}
                                            >
                                              {isOverLimit && (
                                                <span
                                                  style={{
                                                    fontSize: "14px",
                                                    flexShrink: 0,
                                                  }}
                                                >
                                                  🔴
                                                </span>
                                              )}
                                              <span
                                                style={{
                                                  fontWeight: "600",
                                                  color: isOverLimit
                                                    ? "#fca5a5"
                                                    : isLight
                                                      ? "#0f172a"
                                                      : "#e5e7eb",
                                                  fontSize: "14px",
                                                }}
                                              >
                                                {item.ingredientName ||
                                                  item.name}
                                              </span>
                                            </div>
                                          </td>

                                          {/* TỒN SỔ */}
                                          <td style={{ padding: "12px 18px" }}>
                                            <div
                                              style={{
                                                display: "flex",
                                                alignItems: "baseline",
                                                justifyContent: "flex-start",
                                                gap: "8px",
                                              }}
                                            >
                                              <span
                                                style={{
                                                  fontFamily: "monospace",
                                                  fontWeight: "700",
                                                  color: isLight
                                                    ? "#0f172a"
                                                    : "#e5e7eb",
                                                  fontSize: "15px",
                                                }}
                                              >
                                                {sysStock}
                                              </span>
                                              <span
                                                style={{
                                                  fontSize: "11px",
                                                  color: isLight
                                                    ? "#64748b"
                                                    : "#9ca3af",
                                                  fontWeight: "400",
                                                  minWidth: "52px",
                                                  textAlign: "left",
                                                }}
                                              >
                                                {getUnitLabel(item.unit)}
                                              </span>
                                            </div>
                                          </td>

                                          {/* ĐẾM THỰC TẾ */}
                                          <td style={{ padding: "10px 18px" }}>
                                            <div
                                              style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "4px",
                                              }}
                                            >
                                              <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="Nhập SL..."
                                                value={
                                                  stocktakeForm[ingId]
                                                    ?.actualQty ?? ""
                                                }
                                                onChange={(e) =>
                                                  handleStocktakeChange(
                                                    ingId,
                                                    "actualQty",
                                                    e.target.value,
                                                  )
                                                }
                                                style={{
                                                  width: "130px",
                                                  background: isLight
                                                    ? "#ffffff"
                                                    : "rgba(15, 23, 42, 0.6)",
                                                  color: isOverLimit
                                                    ? "#f87171"
                                                    : isLight
                                                      ? "#0f172a"
                                                      : "#e2e8f0",
                                                  border: `1px solid ${
                                                    isOverLimit
                                                      ? "rgba(239,68,68,0.5)"
                                                      : isLight
                                                        ? "#cbd5e1"
                                                        : "rgba(55,65,81,0.8)"
                                                  }`,
                                                  borderRadius: "10px",
                                                  padding: "8px 12px",
                                                  fontSize: "13px",
                                                  fontWeight: "600",
                                                  outline: "none",
                                                  transition: "all 0.2s ease",
                                                  boxShadow: isLight
                                                    ? "inset 0 1px 2px rgba(15,23,42,0.06)"
                                                    : "inset 0 1px 3px rgba(0,0,0,0.3)",
                                                }}
                                                onFocus={(e) => {
                                                  e.currentTarget.style.border = `1px solid ${isOverLimit ? "rgba(239,68,68,0.8)" : "rgba(45,212,191,0.5)"}`;
                                                  e.currentTarget.style.boxShadow = `0 0 0 3px ${isOverLimit ? "rgba(239,68,68,0.1)" : "rgba(45,212,191,0.1)"}`;
                                                }}
                                                onBlur={(e) => {
                                                  e.currentTarget.style.border = `1px solid ${
                                                    isOverLimit
                                                      ? "rgba(239,68,68,0.5)"
                                                      : isLight
                                                        ? "#cbd5e1"
                                                        : "rgba(55,65,81,0.8)"
                                                  }`;
                                                  e.currentTarget.style.boxShadow =
                                                    isLight
                                                      ? "inset 0 1px 2px rgba(15,23,42,0.06)"
                                                      : "inset 0 1px 3px rgba(0,0,0,0.3)";
                                                }}
                                              />
                                              {actualInput !== undefined &&
                                                actualInput !== "" && (
                                                  <div
                                                    style={{
                                                      fontSize: "11px",
                                                      fontWeight: "600",
                                                    }}
                                                    className="ck-animate-fade-in"
                                                  >
                                                    {diff === 0 ? (
                                                      <span
                                                        style={{
                                                          color: "#4ade80",
                                                        }}
                                                      >
                                                        ✅ Khớp
                                                      </span>
                                                    ) : diff > 0 ? (
                                                      <span
                                                        style={{
                                                          color: "#60a5fa",
                                                        }}
                                                      >
                                                        ↗ Dư {diff}
                                                      </span>
                                                    ) : (
                                                      <span
                                                        style={{
                                                          color: "#f87171",
                                                        }}
                                                      >
                                                        ↘ Hao {Math.abs(diff)}
                                                      </span>
                                                    )}
                                                  </div>
                                                )}
                                            </div>
                                          </td>

                                          {/* GHI CHÚ */}
                                          <td style={{ padding: "10px 18px" }}>
                                            <input
                                              type="text"
                                              placeholder="VD: Đổ vỡ, rò rỉ..."
                                              value={
                                                stocktakeForm[ingId]?.note ?? ""
                                              }
                                              onChange={(e) =>
                                                handleStocktakeChange(
                                                  ingId,
                                                  "note",
                                                  e.target.value,
                                                )
                                              }
                                              style={{
                                                width: "100%",
                                                background: isLight
                                                  ? "#ffffff"
                                                  : "rgba(15, 23, 42, 0.6)",
                                                color: isLight
                                                  ? "#0f172a"
                                                  : "#d1d5db",
                                                border: isLight
                                                  ? "1px solid #cbd5e1"
                                                  : "1px solid rgba(55,65,81,0.8)",
                                                borderRadius: "10px",
                                                padding: "8px 12px",
                                                fontSize: "13px",
                                                outline: "none",
                                                transition: "all 0.2s ease",
                                                boxShadow: isLight
                                                  ? "inset 0 1px 2px rgba(15,23,42,0.06)"
                                                  : "inset 0 1px 3px rgba(0,0,0,0.3)",
                                              }}
                                              onFocus={(e) => {
                                                e.currentTarget.style.border =
                                                  "1px solid rgba(45,212,191,0.5)";
                                                e.currentTarget.style.boxShadow =
                                                  "0 0 0 3px rgba(45,212,191,0.1)";
                                              }}
                                              onBlur={(e) => {
                                                e.currentTarget.style.border =
                                                  isLight
                                                    ? "1px solid #cbd5e1"
                                                    : "1px solid rgba(55,65,81,0.8)";
                                                e.currentTarget.style.boxShadow =
                                                  isLight
                                                    ? "inset 0 1px 2px rgba(15,23,42,0.06)"
                                                    : "inset 0 1px 3px rgba(0,0,0,0.3)";
                                              }}
                                            />
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}

                                  {/* PHÂN TRANG — dùng filteredStocktake.length thay vì inventory.length */}
                                  <tr>
                                    <td
                                      colSpan={4}
                                      style={{
                                        padding: "16px 18px",
                                        border: "none",
                                        borderTop: isLight
                                          ? "1px solid #e2e8f0"
                                          : "1px solid #1f2937",
                                        background: isLight
                                          ? "#f8fafc"
                                          : "#0d1117",
                                      }}
                                    >
                                      {renderPagination(
                                        stocktakePage,
                                        filteredStocktake.length,
                                        setStocktakePage,
                                      )}
                                    </td>
                                  </tr>
                                </>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* POPUP CẢNH BÁO ĐỎ — GIỮ NGUYÊN LOGIC */}
                    {showForceConfirmModal && (
                      <div
                        className="ck-modal-overlay ingredient-form-modal ck-animate-fade-in manager-ui"
                        style={{
                          zIndex: 9999,
                          backgroundColor: "rgba(0,0,0,0.85)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          className="ck-modal-box ingredient-form-box"
                          style={{
                            width: "480px",
                            maxWidth: "95vw",
                            background: "#1a1d23",
                            border: "1px solid #333",
                            borderRadius: "20px",
                            display: "flex",
                            flexDirection: "column",
                            padding: 0,
                            overflow: "hidden",
                            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
                          }}
                        >
                          <div
                            className="form-header"
                            style={{
                              borderBottom: "1px solid #333",
                              padding: "20px 24px",
                              flexShrink: 0,
                            }}
                          >
                            <div>
                              <h3
                                style={{
                                  color: "#ff4d4f",
                                  margin: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <span style={{ fontSize: "22px" }}>⚠️</span>
                                Xác nhận hao hụt bất thường
                              </h3>
                              <p
                                style={{
                                  fontSize: "12px",
                                  color: "#999",
                                  marginTop: "6px",
                                }}
                              >
                                Phát hiện chênh lệch lớn so với tồn kho hệ thống
                              </p>
                            </div>
                            <button
                              type="button"
                              className="btn-close"
                              style={{
                                background: "#333",
                                color: "#fff",
                                borderRadius: "50%",
                                width: "30px",
                                height: "30px",
                              }}
                              onClick={() => setShowForceConfirmModal(false)}
                            >
                              ✕
                            </button>
                          </div>

                          <div
                            className="form-body"
                            style={{ padding: "24px", flex: 1 }}
                          >
                            <div
                              style={{
                                background: "#242933",
                                border: "1px solid #451a1a",
                                borderRadius: "16px",
                                padding: "20px",
                                marginBottom: "20px",
                              }}
                            >
                              <label
                                style={{
                                  color: "#ff4d4f",
                                  fontSize: "11px",
                                  fontWeight: "bold",
                                  display: "block",
                                  marginBottom: "8px",
                                  textTransform: "uppercase",
                                }}
                              >
                                Thông báo từ hệ thống
                              </label>
                              <p
                                style={{
                                  color: "#eee",
                                  fontSize: "14px",
                                  lineHeight: "1.6",
                                  margin: 0,
                                }}
                              >
                                {backendWarningMsg ||
                                  "Dữ liệu kiểm kê có sự chênh lệch nghiêm trọng vượt mức cho phép."}
                              </p>
                            </div>
                            <div
                              className="ck-flex ck-items-start ck-gap-3 ck-p-4"
                              style={{
                                background: "#1a1d23",
                                borderRadius: "12px",
                                border: "1px dashed #444",
                              }}
                            >
                              <input
                                type="checkbox"
                                id="force-confirm-check"
                                checked={forceConfirmChecked}
                                onChange={(e) =>
                                  setForceConfirmChecked(e.target.checked)
                                }
                                className="ck-mt-1 ck-w-5 ck-h-5 ck-cursor-pointer"
                                style={{ accentColor: "#ff4d4f" }}
                              />
                              <label
                                htmlFor="force-confirm-check"
                                style={{
                                  fontSize: "13px",
                                  cursor: "pointer",
                                  userSelect: "none",
                                  lineHeight: "1.5",
                                  color: forceConfirmChecked
                                    ? "#ff4d4f"
                                    : "#888",
                                  transition: "all 0.3s",
                                }}
                              >
                                Tôi xác nhận sự hao hụt nghiêm trọng này là thực
                                tế tại hiện trường và chịu trách nhiệm với số
                                liệu kiểm đếm.
                              </label>
                            </div>
                          </div>

                          <div
                            className="form-actions"
                            style={{
                              padding: "20px 24px",
                              borderTop: "1px solid #333",
                              display: "flex",
                              gap: "12px",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setShowForceConfirmModal(false)}
                              className="btn-cancel ck-flex-1"
                              style={{
                                height: "45px",
                                background: "transparent",
                                color: "#999",
                                border: "1px solid #444",
                                borderRadius: "16px",
                                fontWeight: "bold",
                                cursor: "pointer",
                              }}
                            >
                              Hủy bỏ & Kiểm lại
                            </button>
                            <button
                              type="button"
                              disabled={
                                !forceConfirmChecked || isSubmittingStocktake
                              }
                              onClick={() => handleSubmitStocktake(true)}
                              style={{
                                flex: 1.5,
                                height: "45px",
                                justifyContent: "center",
                                background: forceConfirmChecked
                                  ? "#1a1d23"
                                  : "#14161a",
                                color: forceConfirmChecked ? "#ff4d4f" : "#444",
                                border: forceConfirmChecked
                                  ? "2px solid #ff4d4f"
                                  : "2px solid #333",
                                borderRadius: "16px",
                                fontWeight: "bold",
                                display: "flex",
                                alignItems: "center",
                                cursor: forceConfirmChecked
                                  ? "pointer"
                                  : "not-allowed",
                                transition: "all 0.3s ease",
                                opacity: forceConfirmChecked ? 1 : 0.5,
                              }}
                            >
                              {isSubmittingStocktake
                                ? "Đang xử lý..."
                                : "Xác nhận & Lưu hệ thống"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

            {/* ================== 6. TAB QUẢN LÝ CÔNG THỨC ================== */}
            {activeManagementTab === "Quản lý công thức" && (
              <div className="ck-flex ck-flex-col ck-gap-6 ck-h-full ck-animate-fade-in">
                {/* HEADER GIỐNG ADMIN */}
                <div className="header">
                  <div>
                    <div className="header-eyebrow">Định mức BOM</div>
                    <div className="header-title">Công thức theo sản phẩm</div>
                  </div>
                </div>

                {/* TOOLBAR GIỐNG ADMIN */}
                <div className="toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "stretch" }}>
  {/* TRÁI: Search + Nút tìm */}
  <div style={{ display: "flex", alignItems: "stretch" }}>
    <div className="search-wrap" style={{ margin: 0, marginRight: "12px" }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14" height="14" viewBox="0 0 24 24"
        fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ opacity: 0.5 }}
      >
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        type="text"
        placeholder="Tìm theo mã sản phẩm hoặc tên món…"
        value={recipeSearchText}
        onChange={(e) => setRecipeSearchText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setRecipeAppliedSearch(recipeSearchText);
        }}
        style={{ minWidth: "280px" }}
      />
    </div>
    <button
      type="button"
      className="btn btn-teal"
      onClick={() => setRecipeAppliedSearch(recipeSearchText)}
    >
      Tìm kiếm
    </button>
  </div>

  {/* PHẢI: Dropdown lọc danh mục */}
  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
    <span style={{ fontSize: "12px", color: "#6b7280", whiteSpace: "nowrap" }}>
      Danh mục:
    </span>
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
  <div ref={filterRecipeCatRef} style={{ position: "relative" }}>
    {/* Nút trigger */}
    <div
      onClick={() => {
        setIsFilterRecipeCatOpen(!isFilterRecipeCatOpen);
        setFilterRecipeCatSearch("");
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
        background: isLight ? "#f1f5f9" : "#1f2937",
        color: isLight ? "#0f172a" : "#e5e7eb",
        border: isLight ? "1px solid #cbd5e1" : "1px solid #374151",
        borderRadius: "10px",
        padding: "8px 14px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        userSelect: "none",
        minWidth: "180px",
      }}
    >
      <span>
        {filterRecipeCategory === "Tất cả"
          ? "🗂 Tất cả danh mục"
          : categoriesList.find((c) => String(c.id) === filterRecipeCategory)?.name || "🗂 Tất cả danh mục"}
      </span>
      <span style={{ fontSize: "10px", color: "#6b7280" }}>
        {isFilterRecipeCatOpen ? "▲" : "▼"}
      </span>
    </div>

    {/* Dropdown panel */}
    {isFilterRecipeCatOpen && (
      <div
        style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: "6px",
          minWidth: "220px",
          background: isLight ? "#fff" : "#1f2937",
          border: isLight ? "1px solid #e2e8f0" : "1px solid #374151",
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          zIndex: 999,
          overflow: "hidden",
        }}
      >
        {/* Ô tìm kiếm */}
        <div style={{
          padding: "8px",
          borderBottom: isLight ? "1px solid #e2e8f0" : "1px solid #374151",
        }}>
          <input
            type="text"
            autoFocus
            placeholder="Tìm danh mục..."
            value={filterRecipeCatSearch}
            onChange={(e) => setFilterRecipeCatSearch(e.target.value)}
            style={{
              width: "100%",
              background: isLight ? "#f8fafc" : "#111827",
              color: isLight ? "#0f172a" : "#fff",
              border: isLight ? "1px solid #cbd5e1" : "1px solid #4b5563",
              borderRadius: "8px",
              padding: "6px 10px",
              fontSize: "12px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Danh sách */}
        <div
          className="hide-scrollbar"
          style={{ maxHeight: "220px", overflowY: "auto", padding: "4px 0" }}
        >
          {categoriesList
            .filter((cat) =>
              cat.name.toLowerCase().includes(filterRecipeCatSearch.toLowerCase())
            )
            .map((cat) => {
              const isSelected = filterRecipeCategory === String(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    setFilterRecipeCategory(String(cat.id));
                    setRecipePage(1);
                    setIsFilterRecipeCatOpen(false);
                    setFilterRecipeCatSearch("");
                  }}
                  style={{
                    padding: "8px 14px",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontWeight: isSelected ? "700" : "400",
                    background: isSelected ? "rgba(20,184,166,0.12)" : "transparent",
                    color: isSelected ? "#2dd4bf" : isLight ? "#0f172a" : "#e5e7eb",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "#14b8a6";
                      e.currentTarget.style.color = "#fff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = isLight ? "#0f172a" : "#e5e7eb";
                    }
                  }}
                >
                  {cat.name}
                </div>
              );
            })}

          {categoriesList.filter((cat) =>
            cat.name.toLowerCase().includes(filterRecipeCatSearch.toLowerCase())
          ).length === 0 && (
            <div style={{
              padding: "14px",
              textAlign: "center",
              fontSize: "12px",
              color: "#6b7280",
            }}>
              Không tìm thấy "{filterRecipeCatSearch}"
            </div>
          )}
        </div>
      </div>
    )}
  </div>

  {/* Nút bỏ lọc — chỉ hiện khi đang lọc */}
  {filterRecipeCategory !== "Tất cả" && (
    <button
      type="button"
      onClick={() => {
        setFilterRecipeCategory("Tất cả");
        setRecipePage(1);
      }}
      style={{
        background: "rgba(239,68,68,0.1)",
        color: "#f87171",
        border: "1px solid rgba(239,68,68,0.2)",
        borderRadius: "8px",
        padding: "6px 10px",
        fontSize: "12px",
        fontWeight: "700",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      ✕ Bỏ lọc
    </button>
  )}
</div>
      {/* Icon mũi tên */}
    </div>
  </div>
</div>

                <div className="product-grid" style={{ paddingBottom: "40px" }}>
                  {(() => {
                    const filteredRecipes = masterProducts.filter((prod) => {
  let matchText = true;
  if (recipeAppliedSearch) {
    matchText =
      (prod.product_id || prod.productId || "")
        .toLowerCase()
        .includes(recipeAppliedSearch.toLowerCase()) ||
      (prod.product_name || prod.name || "")
        .toLowerCase()
        .includes(recipeAppliedSearch.toLowerCase());
  }
  // Lọc theo danh mục
  let matchCat = true;
  if (filterRecipeCategory !== "Tất cả") {
    matchCat =
      String(prod.categoryId || prod.category_id || "") === filterRecipeCategory;
  }

  return matchText && matchCat;
});

                    const currentRecipeRows = filteredRecipes.slice(
                      (recipePage - 1) * ITEMS_PER_PAGE,
                      recipePage * ITEMS_PER_PAGE,
                    );

                    if (filteredRecipes.length === 0) {
                      return (
                        <div
                          className="empty-state"
                          style={{ gridColumn: "1 / -1" }}
                        >
                          Không có dữ liệu sản phẩm.
                        </div>
                      );
                    }

                    return (
                      <>
                        {currentRecipeRows.map((prod, idx) => {
                          const pId =
                            prod.product_id || prod.productId || prod.id;
                          const pName = prod.product_name || prod.name;
                          const catName =
                            prod.categoryName || prod.category || "Sản phẩm";
                          const isSelected =
                            selectedRecipe?.productId === pId ||
                            selectedRecipe?.product_id === pId;

                          return (
                            /* ... TOÀN BỘ DIV CARD SẢN PHẨM GIỮ NGUYÊN ... */
                            <div
                              key={idx}
                              className="product-card"
                              style={{
                                border: isSelected
                                  ? "1px solid #fb923c"
                                  : undefined,
                                cursor: "pointer",
                              }}
                              role="button"
                              onClick={async () => {
                                setSelectedRecipe(prod);
                                try {
                                  const res = await api.getRecipeOfProduct(pId);
                                  if (res && res.ingredients) {
                                    setEditingRecipeIngredients(
                                      res.ingredients.map((ing) => ({
                                        ingredientId:
                                          ing.ingredientId || ing.id,
                                        name: ing.name || ing.ingredientName,
                                        amountNeeded: Number(
                                          ing.qty || ing.amountNeeded || 0,
                                        ),
                                        unit: ing.unit || "N/A",
                                      })),
                                    );
                                  }
                                } catch (e) {
                                  setEditingRecipeIngredients([]);
                                }
                              }}
                            >
                              <div className="pc-cat pc-cat-other">
                                {catName}
                              </div>
                              <div className="pc-name">{pName}</div>
                              <div className="pc-id">{pId}</div>
                              <div className="pc-footer">
                                <div
                                  className="pc-price"
                                  style={{ color: "#fb923c" }}
                                >
                                  Định mức
                                </div>
                                <span className="mgr-pill mgr-pill--warn">
                                  Mở BOM →
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        <div style={{ gridColumn: "1 / -1" }}>
                          {renderPagination(
                            recipePage,
                            filteredRecipes.length,
                            setRecipePage,
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* ========================================================= */}
                {/* MODAL ĐỊNH MỨC NGUYÊN LIỆU (ĐÃ CHUẨN HOÁ THANH CUỘN) */}
                {/* ========================================================= */}
                {selectedRecipe && (
                  <div
                    className="ck-modal-overlay ingredient-form-modal ck-animate-fade-in manager-ui"
                    onClick={() => setSelectedRecipe(null)}
                    role="presentation"
                    style={{ zIndex: 9999 }}
                  >
                    <div
                      className="ck-modal-box ingredient-form-box ck-max-w-lg ck-w-full" /* Thu nhỏ từ 2xl xuống lg */
                      onClick={(e) => e.stopPropagation()}
                      role="presentation"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        maxHeight: "85vh",
                        width:
                          "500px" /* Ép cứng độ rộng để modal trông cân đối và nhỏ gọn */,
                      }}
                    >
                      {/* HEADER */}
                      <div
                        className="form-header"
                        style={{ flexShrink: 0, padding: "16px 20px" }}
                      >
                        <div>
                          <h3 style={{ fontSize: "1.1rem" }}>
                            Định mức nguyên liệu
                          </h3>
                          <p
                            className="ck-text-xs"
                            style={{
                              marginTop: 4,
                              color: "#4ADE80",
                              fontWeight: "bold",
                            }}
                          >
                            {selectedRecipe.product_name || selectedRecipe.name}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn-close"
                          onClick={() => setSelectedRecipe(null)}
                          aria-label="Đóng"
                        >
                          ✕
                        </button>
                      </div>

                      {/* FORM BODY */}
                      <div
                        className="form-body ck-scrollbar"
                        style={{
                          flex: 1,
                          overflowY: "auto",
                          padding: "16px 20px" /* Giảm padding cho gọn */,
                        }}
                      >
                        <div
                          className="section-label ck-mb-3"
                          style={{ fontSize: "11px" }}
                        >
                          CÔNG THỨC NGUYÊN LIỆU
                        </div>

                        {editingRecipeIngredients.length === 0 ? (
                          <div
                            className={`ck-flex ck-flex-col ck-items-center ck-justify-center ck-py-8 ${isLight ? "ck-text-slate-500" : "ck-text-gray-500"}`}
                          >
                            <span className="ck-text-sm">
                              Chưa có nguyên liệu nào trong công thức
                            </span>
                          </div>
                        ) : (
                          <div className="ck-flex ck-flex-col ck-gap-3">
                            {" "}
                            {/* Giảm gap giữa các dòng */}
                            {editingRecipeIngredients.map((ing, i) => (
                              <div
                                key={i}
                                className={
                                  isLight
                                    ? "ck-flex ck-flex-row ck-items-center ck-justify-between ck-p-3 ck-border ck-border-slate-200 ck-rounded-xl ck-bg-slate-50"
                                    : "ck-flex ck-flex-row ck-items-center ck-justify-between ck-p-3 ck-border ck-border-gray-700 ck-rounded-xl ck-bg-gray-900/30"
                                }
                              >
                                {/* Trái: Icon xanh Teal + Tên nguyên liệu */}
                                <div className="ck-flex ck-items-center ck-gap-3">
                                  <div
                                    className="product-detail-formula-icon"
                                    style={{
                                      background: isLight
                                        ? "#e2e8f0"
                                        : "#2d333f",
                                    }}
                                  >
                                    <Package
                                      size={16}
                                      color={isLight ? "#0d9488" : "#00f2ff"}
                                    />
                                  </div>
                                  <span
                                    className={
                                      isLight
                                        ? "ck-text-sm ck-text-slate-900 ck-font-medium"
                                        : "ck-text-sm ck-text-white ck-font-medium"
                                    }
                                  >
                                    {ing.name}
                                  </span>
                                </div>

                                {/* Phải: Số lượng + Đơn vị + Nút xóa */}
                                <div className="ck-flex ck-flex-row ck-items-center ck-gap-2">
                                  <input
                                    type="number"
                                    value={ing.amountNeeded}
                                    onChange={(e) => {
                                      const arr = [...editingRecipeIngredients];
                                      arr[i].amountNeeded = Number(
                                        e.target.value,
                                      );
                                      setEditingRecipeIngredients(arr);
                                    }}
                                    className={
                                      isLight
                                        ? "ck-bg-white ck-text-slate-900 ck-px-2 ck-py-1.5 ck-rounded-lg ck-border ck-border-slate-300 focus:ck-border-teal-500 ck-outline-none ck-text-right ck-text-sm"
                                        : "ck-bg-gray-900 ck-text-white ck-px-2 ck-py-1.5 ck-rounded-lg ck-border ck-border-gray-700 focus:ck-border-teal-500 ck-outline-none ck-text-right ck-text-sm"
                                    }
                                    style={{ width: "80px", flexShrink: 0 }}
                                  />
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      color: isLight ? "#64748b" : "#9ca3af",
                                      fontWeight: "600",
                                      width: "64px",
                                      flexShrink: 0,
                                      textAlign: "left",
                                    }}
                                  >
                                    {getUnitLabel(ing.unit)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingRecipeIngredients(
                                        editingRecipeIngredients.filter(
                                          (_, idx) => idx !== i,
                                        ),
                                      )
                                    }
                                    className="ck-flex ck-items-center ck-justify-center ck-w-7 ck-h-7 ck-rounded-lg ck-text-gray-500 hover:ck-bg-red-500/10 hover:ck-text-red-400 ck-transition-all"
                                    title="Xóa nguyên liệu"
                                  >
                                    ➖
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div
                          className="sep"
                          style={{
                            margin: "20px 0",
                            borderTop: isLight
                              ? "1px solid #e2e8f0"
                              : "1px solid #333",
                          }}
                        />

                        <div className="field ck-mb-2">
  <label className="ck-text-[11px] ck-text-gray-500 ck-mb-1.5 ck-block">
    THÊM NGUYÊN LIỆU MỚI
  </label>

  <div ref={recipeIngDropdownRef} className="ck-relative">
    {/* Nút hiển thị */}
    <div
      onClick={() => {
        setIsRecipeIngDropdownOpen(!isRecipeIngDropdownOpen);
        setRecipeIngSearchText("");
      }}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: isLight ? "#fff" : "#111827",
        color: "#6b7280",
        border: isLight ? "1px solid #cbd5e1" : "1px solid #374151",
        borderRadius: "12px",
        padding: "10px 14px",
        fontSize: "14px",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <span>+ Chọn thêm nguyên liệu...</span>
      <span style={{ fontSize: "10px", color: "#6b7280" }}>▼</span>
    </div>

    {/* Dropdown panel */}
    {isRecipeIngDropdownOpen && (
      <div
        className="ck-absolute ck-z-50 ck-w-full ck-rounded-xl ck-shadow-2xl"
        style={{
          top: "100%",
          marginTop: "6px",
          background: isLight ? "#fff" : "#1f2937",
          border: isLight ? "1px solid #e2e8f0" : "1px solid #374151",
        }}
      >
        {/* Ô tìm kiếm */}
        <div
          style={{
            padding: "8px",
            borderBottom: isLight ? "1px solid #e2e8f0" : "1px solid #374151",
          }}
        >
          <input
            type="text"
            autoFocus
            placeholder="Tìm nguyên liệu..."
            value={recipeIngSearchText}
            onChange={(e) => setRecipeIngSearchText(e.target.value)}
            style={{
              width: "100%",
              background: isLight ? "#f8fafc" : "#111827",
              color: isLight ? "#0f172a" : "#fff",
              border: isLight ? "1px solid #cbd5e1" : "1px solid #4b5563",
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "13px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Danh sách nguyên liệu */}
        <div
          className="hide-scrollbar"
          style={{ maxHeight: "200px", overflowY: "auto", padding: "4px 0" }}
        >
          {inventory
            .filter((ing) => {
              // Lọc ra những nguyên liệu chưa có trong công thức
              const alreadyAdded = editingRecipeIngredients.some(
                (r) =>
                  String(r.ingredientId) ===
                  String(ing.ingredientId ?? ing.id)
              );
              const name = ing.ingredientName ?? ing.name ?? "";
              const matchSearch = name
                .toLowerCase()
                .includes(recipeIngSearchText.toLowerCase());
              return !alreadyAdded && matchSearch;
            })
            .map((ing) => {
              const ingId = ing.ingredientId ?? ing.id;
              return (
                <div
                  key={ingId}
                  onClick={() => {
                    setEditingRecipeIngredients([
                      ...editingRecipeIngredients,
                      {
                        ingredientId: ingId,
                        name: ing.ingredientName ?? ing.name,
                        amountNeeded: 1,
                        unit: ing.unit,
                      },
                    ]);
                    setIsRecipeIngDropdownOpen(false);
                    setRecipeIngSearchText("");
                  }}
                  style={{
                    padding: "8px 14px",
                    fontSize: "13px",
                    cursor: "pointer",
                    color: isLight ? "#0f172a" : "#e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#14b8a6";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = isLight ? "#0f172a" : "#e5e7eb";
                  }}
                >
                  <span>{ing.ingredientName ?? ing.name}</span>
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                    {ing.unit ?? "KG"}
                  </span>
                </div>
              );
            })}

          {/* Không tìm thấy */}
          {inventory.filter((ing) => {
            const name = ing.ingredientName ?? ing.name ?? "";
            return name.toLowerCase().includes(recipeIngSearchText.toLowerCase());
          }).length === 0 && (
            <div
              style={{
                padding: "16px",
                textAlign: "center",
                fontSize: "13px",
                color: "#6b7280",
              }}
            >
              Không tìm thấy "{recipeIngSearchText}"
            </div>
          )}

          {/* Đã thêm hết rồi */}
          {inventory.filter((ing) => {
            const alreadyAdded = editingRecipeIngredients.some(
              (r) =>
                String(r.ingredientId) ===
                String(ing.ingredientId ?? ing.id)
            );
            const name = ing.ingredientName ?? ing.name ?? "";
            return (
              !alreadyAdded &&
              name.toLowerCase().includes(recipeIngSearchText.toLowerCase())
            );
          }).length === 0 &&
            inventory.some((ing) => {
              const name = ing.ingredientName ?? ing.name ?? "";
              return name
                .toLowerCase()
                .includes(recipeIngSearchText.toLowerCase());
            }) && (
              <div
                style={{
                  padding: "16px",
                  textAlign: "center",
                  fontSize: "13px",
                  color: "#14b8a6",
                }}
              >
                ✅ Tất cả nguyên liệu đã được thêm vào công thức
              </div>
            )}
        </div>
      </div>
    )}
  </div>
</div>
                      </div>

                      {/* FOOTER: ÉP MÀU XANH TEAL + XÁM ĐẬM */}
                      {/* FOOTER: Nút bấm bự, bo góc và hiệu ứng nhảy nhẹ */}
                      <div
                        className="form-actions"
                        style={{
                          padding: "20px",
                          borderTop: "1px solid #374151",
                          display: "flex",
                          gap: "12px",
                          flexShrink: 0,
                        }}
                      >
                        <button
                          type="button"
                          className="btn-submit ck-flex-1 ck-py-3 ck-rounded-xl ck-font-bold ck-text-base"
                          onClick={async () => {
                            try {
                              await api.saveRecipe({
                                productId:
                                  selectedRecipe.product_id ||
                                  selectedRecipe.id,
                                ingredients: editingRecipeIngredients,
                              });
                              alert("Lưu thành công!");
                            } catch (e) {
                              alert("Lỗi: " + e.message);
                            }
                          }}
                          style={{
                            background: "#14b8a6",
                            color: "#fff",
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.transform =
                              "translateY(-3px)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.transform = "translateY(0)")
                          }
                        >
                          Lưu công thức
                        </button>

                        <button
                          type="button"
                          className="btn-cancel ck-flex-1 ck-py-3 ck-rounded-xl ck-font-bold ck-text-base"
                          onClick={() => setSelectedRecipe(null)}
                          style={{
                            background: isLight ? "#e2e8f0" : "#4b5563",
                            color: isLight ? "#0f172a" : "#fff",
                            border: isLight ? "1px solid #cbd5e1" : "none",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.transform =
                              "translateY(-3px)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.transform = "translateY(0)")
                          }
                        >
                          Đóng
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================== 8. TAB CỬA HÀNG FRANCHISE ================== */}
            {activeManagementTab === "Cửa hàng Franchise" && (
              <div className="ck-flex ck-flex-col ck-gap-6 ck-animate-fade-in mgr-section">
                {!selectedStore ? (
                  <>
                    <div className="mgr-section-head ck-flex ck-justify-between ck-items-start">
                      <div>
                        <div className="mgr-section-head__eyebrow">
                          Mạng lưới
                        </div>
                        <h2 className="mgr-section-head__title">
                          Cửa hàng franchise
                        </h2>
                        <p className="mgr-section-head__sub">
                          Chọn chi nhánh để xem lịch sử giao dịch. Trạng thái
                          hiển thị theo dữ liệu cửa hàng trên hệ thống.
                        </p>
                      </div>
                      <div className="ck-flex ck-gap-3">
                        <button
                          type="button"
                          className={`mgr-btn ${reportedShipments.length > 0 ? "mgr-btn--primary" : "mgr-btn--ghost"}`}
                          onClick={() => setShowIncidentsModal(true)}
                          style={
                            reportedShipments.length > 0
                              ? {
                                  backgroundColor: "#ef4444",
                                  borderColor: "#ef4444",
                                }
                              : {}
                          }
                        >
                          <AlertTriangle size={16} />
                          Quản lý sự cố
                          {reportedShipments.length > 0 && (
                            <span className="ck-bg-white ck-text-red-500 ck-px-2 ck-py-0.5 ck-rounded-full ck-text-xs ck-ml-1 ck-font-black shadow-sm">
                              {reportedShipments.length}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* THANH TÌM KIẾM */}
                    <div className="mgr-search-row">
                      <div className="mgr-search-bar mgr-search-bar--rose">
                        <input
                          type="text"
                          placeholder="Tìm theo tên hoặc địa chỉ cửa hàng…"
                          value={franchiseStoreSearchText}
                          onChange={(e) =>
                            setFranchiseStoreSearchText(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              setFranchiseStoreAppliedSearch(
                                franchiseStoreSearchText,
                              );
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setFranchiseStoreAppliedSearch(
                              franchiseStoreSearchText,
                            )
                          }
                        >
                          Tìm
                        </button>
                      </div>
                    </div>

                    {/* ---- TÍNH filteredStores MỘT LẦN, DÙNG Ở NHIỀU CHỖ DƯỚI ---- */}
                    {(() => {
                      const filteredStores = stores.filter((store) => {
                        if (!franchiseStoreAppliedSearch) return true;
                        const name = (store.name || "").toLowerCase();
                        const address = (store.address || "").toLowerCase();
                        const id = String(
                          store.id || store.storeId || "",
                        ).toLowerCase();
                        const keyword =
                          franchiseStoreAppliedSearch.toLowerCase();
                        return (
                          name.includes(keyword) ||
                          address.includes(keyword) ||
                          id.includes(keyword)
                        );
                      });

                      return (
                        <>
                          <div className="mgr-store-grid">
                            {/* EMPTY STATE: không có cửa hàng nào (kể cả sau khi lọc) */}
                            {filteredStores.length === 0 ? (
                              <div
                                className="mgr-empty"
                                style={{ gridColumn: "1 / -1" }}
                              >
                                <div className="mgr-empty__icon">🏪</div>
                                <p className="mgr-empty__title">
                                  {stores.length === 0
                                    ? "Chưa có cửa hàng"
                                    : "Không tìm thấy cửa hàng phù hợp"}
                                </p>
                                <p className="mgr-empty__sub">
                                  {stores.length === 0
                                    ? "Dữ liệu chi nhánh sẽ hiện khi Admin tạo cửa hàng và đồng bộ quyền xem."
                                    : "Thử tìm với từ khóa khác."}
                                </p>
                              </div>
                            ) : (
                              // DÙNG filteredStores.slice(...) thay vì stores.slice(...)
                              filteredStores
                                .slice(
                                  (franchiseStorePage - 1) * ITEMS_PER_PAGE,
                                  franchiseStorePage * ITEMS_PER_PAGE,
                                )
                                .map((store) => {
                                  const isStoreActive =
                                    store.isActive === true ||
                                    store.active === true ||
                                    store.is_active === true ||
                                    store.status === "ACTIVE";
                                  return (
                                    <div
                                      key={store.id || store.storeId}
                                      onClick={async () => {
                                        setSelectedStore(store);
                                        setFranchiseOrderPage(1);
                                        try {
                                          const res =
                                            await api.getStoreHistoryForManager(
                                              store.id || store.storeId,
                                            );
                                          setAllOrders(
                                            Array.isArray(res)
                                              ? res
                                              : res?.data || res?.items || [],
                                          );
                                        } catch (e) {
                                          setAllOrders([]);
                                        }
                                      }}
                                      className="mgr-store-card"
                                    >
                                      <div className="ck-flex ck-justify-between ck-mb-2 ck-items-start">
                                        <div className="mgr-store-card__icon">
                                          <Store
                                            className="ck-text-red-400"
                                            size={28}
                                          />
                                        </div>
                                        <span
                                          className={`mgr-pill ${isStoreActive ? "mgr-pill--ok" : "mgr-pill--danger"}`}
                                        >
                                          {isStoreActive
                                            ? "Đang chạy"
                                            : "Tạm dừng"}
                                        </span>
                                      </div>
                                      <h3 className="mgr-store-card__name">
                                        {store.name}
                                      </h3>
                                      <p className="mgr-store-card__addr">
                                        {store.address || "—"}
                                      </p>
                                      <div className="mgr-store-card__foot">
                                        <span
                                          className="mgr-mono-muted"
                                          style={{ fontSize: 10 }}
                                        >
                                          {store.id || store.storeId}
                                        </span>
                                        <span className="mgr-store-card__cta">
                                          Chi tiết →
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                            )}
                          </div>

                          {/* PHÂN TRANG — dùng filteredStores.length thay vì stores.length */}
                          {filteredStores.length > 0 &&
                            renderPagination(
                              franchiseStorePage,
                              filteredStores.length,
                              setFranchiseStorePage,
                            )}
                        </>
                      );
                    })()}
                  </>
                ) : (
                  // PHẦN CHI TIẾT CỬA HÀNG — GIỮ NGUYÊN KHÔNG ĐỔI
                  <div className="ck-flex ck-flex-col ck-gap-6 relative">
                    <div className="mgr-hero" style={{ marginBottom: 0 }}>
                      <div className="ck-flex ck-items-center ck-gap-4 ck-flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSelectedStore(null)}
                          className="mgr-icon-btn"
                          style={{ width: 42, height: 42, borderRadius: "50%" }}
                          aria-label="Quay lại danh sách"
                        >
                          ←
                        </button>
                        <div>
                          <h2
                            className="mgr-hero__title"
                            style={{ marginBottom: 4 }}
                          >
                            {selectedStore.name}
                          </h2>
                          <p className="mgr-panel__hint" style={{ margin: 0 }}>
                            Mã: {selectedStore.id || selectedStore.storeId}
                            {selectedStore.address
                              ? ` · ${selectedStore.address}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      className="ck-rounded-3xl ck-overflow-hidden"
                      style={{
                        border: isLight
                          ? "1px solid #cbd5e1"
                          : "1px solid #374151",
                        backgroundColor: isLight ? "#ffffff" : "#111827",
                        boxShadow: isLight
                          ? "0 4px 24px rgba(15, 23, 42, 0.08)"
                          : "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                      }}
                    >
                      <div
                        className="ck-p-6 ck-flex ck-justify-between items-center ck-border-b"
                        style={{
                          borderBottomColor: isLight ? "#e2e8f0" : "#374151",
                          background: isLight
                            ? "#f8fafc"
                            : "rgba(31, 41, 55, 0.5)",
                        }}
                      >
                        <h3
                          className="ck-font-black ck-uppercase tracking-widest text-sm"
                          style={{ color: isLight ? "#475569" : "#d1d5db" }}
                        >
                          Lịch sử giao dịch chi nhánh
                        </h3>
                      </div>
                      <table className="ck-w-full ck-text-left ck-border-collapse">
                        <thead
                          className={`ck-text-[10px] uppercase tracking-tighter ${isLight ? "" : "ck-bg-gray-800 ck-text-gray-400"}`}
                          style={{
                            background: isLight ? "#f1f5f9" : undefined,
                            color: isLight ? "#64748b" : undefined,
                          }}
                        >
                          <tr>
                            <th className="ck-p-5">Mã đơn hàng</th>
                            <th className="ck-p-5">Thời gian đặt</th>
                            <th className="ck-p-5 ck-text-right">
                              Tổng giá trị
                            </th>
                            <th className="ck-p-5 ck-text-center">
                              Trạng thái
                            </th>
                            <th className="ck-p-5 ck-text-center">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="ck-text-sm">
                          {(() => {
                            const safeAllOrders = Array.isArray(allOrders)
                              ? allOrders
                              : [];
                            const currentFranchiseRows = safeAllOrders.slice(
                              (franchiseOrderPage - 1) * ITEMS_PER_PAGE,
                              franchiseOrderPage * ITEMS_PER_PAGE,
                            );

                            if (safeAllOrders.length === 0) {
                              return (
                                <tr>
                                  <td
                                    colSpan="5"
                                    className={`ck-p-10 ck-text-center italic ${isLight ? "ck-text-slate-500" : "ck-text-gray-500"}`}
                                  >
                                    Cửa hàng này chưa có dữ liệu giao dịch.
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <>
                                {currentFranchiseRows.map((order, idx) => {
                                  const canCancel = ![
                                    "Hoàn thành",
                                    "completed",
                                    "DELIVERED",
                                    "Đã hủy",
                                    "cancelled",
                                    "CANCELLED",
                                  ].includes(order.status);
                                  const safeOrderId =
                                    order.orderId || order.id || order._id;
                                  const safeTotal =
                                    order.totalAmount ||
                                    order.totalPrice ||
                                    order.total ||
                                    0;
                                  return (
                                    <tr
                                      key={safeOrderId || idx}
                                      className={
                                        isLight
                                          ? "ck-border-t ck-border-slate-200 hover:ck-bg-slate-50 ck-transition-colors"
                                          : "ck-border-t ck-border-gray-800 hover:ck-bg-gray-800/50 ck-transition-colors"
                                      }
                                    >
                                      <td
                                        className={`ck-p-5 ck-mono ck-font-bold ${isLight ? "ck-text-blue-700" : "ck-text-blue-400"}`}
                                      >
                                        {safeOrderId || (
                                          <span
                                            className={
                                              isLight
                                                ? "ck-text-slate-500"
                                                : "ck-text-gray-600"
                                            }
                                          >
                                            Đang cập nhật
                                          </span>
                                        )}
                                        {order.orderType === "URGENT" && (
                                          <span className="text-red-500 text-xs ml-1">
                                            🔥
                                          </span>
                                        )}
                                      </td>
                                      <td
                                        className={
                                          isLight
                                            ? "ck-p-5 ck-text-slate-600"
                                            : "ck-p-5 ck-text-gray-400"
                                        }
                                      >
                                        {order.createdAt
                                          ? new Date(
                                              order.createdAt,
                                            ).toLocaleString("vi-VN", {
                                              day: "2-digit",
                                              month: "2-digit",
                                              year: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })
                                          : order.date || "Chưa rõ"}
                                      </td>
                                      <td
                                        className={`ck-p-5 ck-text-right ck-font-black ${isLight ? "ck-text-orange-600" : "ck-text-orange-400"}`}
                                      >
                                        {Number(safeTotal).toLocaleString()}đ
                                      </td>
                                      <td className="ck-p-5 ck-text-center">
                                        <span
                                          className={`ck-badge ${["Hoàn thành", "completed", "DELIVERED"].includes(order.status) ? "ck-badge-green" : ["Đã hủy", "cancelled", "CANCELLED"].includes(order.status) ? "ck-badge-red" : "ck-badge-blue"}`}
                                        >
                                          {order.status}
                                        </span>
                                      </td>
                                      <td className="ck-p-5 ck-flex ck-justify-center ck-gap-2">
                                        <button
                                          onClick={async () => {
                                            try {
                                              const detail =
                                                await api.getOrderDetails(
                                                  safeOrderId,
                                                );
                                              setSelectedOrderDetails(detail);
                                              setShowOrderDetailsModal(true);
                                            } catch (e) {
                                              alert(
                                                "Lỗi lấy chi tiết: " +
                                                  e.message,
                                              );
                                            }
                                          }}
                                          className={
                                            isLight
                                              ? "ck-flex ck-items-center ck-justify-center ck-w-8 ck-h-8 ck-rounded-lg ck-border ck-border-slate-200 ck-bg-white hover:ck-bg-slate-100 ck-text-blue-600 ck-transition-all"
                                              : "ck-flex ck-items-center ck-justify-center ck-w-8 ck-h-8 ck-rounded-lg ck-border ck-border-gray-700 ck-bg-gray-800 hover:ck-bg-blue-500/20 ck-text-blue-400 ck-transition-all"
                                          }
                                          title="Xem chi tiết"
                                        >
                                          👁️
                                        </button>
                                        {canCancel && (
                                          <button
                                            onClick={async () => {
                                              if (
                                                window.confirm(
                                                  "⚠️ Bạn có chắc chắn muốn HỦY đơn hàng này?",
                                                )
                                              ) {
                                                try {
                                                  await api.cancelManagerOrder(
                                                    safeOrderId,
                                                  );
                                                  alert(
                                                    "✅ Đã hủy đơn hàng thành công!",
                                                  );
                                                  const res =
                                                    await api.getStoreHistoryForManager(
                                                      selectedStore.id ||
                                                        selectedStore.storeId,
                                                    );
                                                  setAllOrders(
                                                    Array.isArray(res)
                                                      ? res
                                                      : res?.data || [],
                                                  );
                                                } catch (e) {
                                                  alert(
                                                    "Lỗi hủy đơn: " + e.message,
                                                  );
                                                }
                                              }
                                            }}
                                            className={
                                              isLight
                                                ? "ck-flex ck-items-center ck-justify-center ck-w-8 ck-h-8 ck-rounded-lg ck-border ck-border-slate-200 ck-bg-white hover:ck-bg-red-50 ck-text-red-600 ck-transition-all"
                                                : "ck-flex ck-items-center ck-justify-center ck-w-8 ck-h-8 ck-rounded-lg ck-border ck-border-gray-700 ck-bg-gray-800 hover:ck-bg-red-500/20 ck-text-red-400 ck-transition-all"
                                            }
                                            title="Hủy đơn"
                                          >
                                            🛑
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                                <tr>
                                  <td
                                    colSpan="5"
                                    style={{ padding: 0, border: "none" }}
                                  >
                                    {renderPagination(
                                      franchiseOrderPage,
                                      safeAllOrders.length,
                                      setFranchiseOrderPage,
                                    )}
                                  </td>
                                </tr>
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================== 9. TAB CÀI ĐẶT HỆ THỐNG ================== */}
            {activeManagementTab === "Cài đặt hệ thống" && (
              <div className="ck-flex ck-flex-col ck-gap-6 ck-animate-fade-in mgr-section">
                {/* LUÔN HIỂN THỊ DANH SÁCH CẤU HÌNH BÊN DƯỚI */}
                <div className="mgr-section-head">
                  <div>
                    <div className="mgr-section-head__eyebrow">Hệ thống</div>
                    <h2 className="mgr-section-head__title">
                      Cấu hình vận hành trung tâm
                    </h2>
                    <p className="mgr-section-head__sub">
                      Tham số toàn hệ thống (bếp, cửa hàng, quy tắc nghiệp vụ).
                      Chọn một tham số để chỉnh sửa.
                    </p>
                  </div>
                </div>

                <div className="mgr-store-grid">
  {Object.keys(systemConfigs).length > 0 ? (
    Object.entries(systemConfigs).map(([key, val]) => {
      const meta = getConfigLabel(key);
      return (
        <div
          key={key}
          className="mgr-store-card ck-cursor-pointer hover:ck-border-orange-500/50 ck-transition-all"
          onClick={() => setSelectedConfig({ key, val })}
        >
          <div className="ck-flex ck-justify-between ck-mb-2 ck-items-start">
            <div className="mgr-store-card__icon ck-flex ck-items-center ck-justify-center ck-bg-gray-800 ck-rounded-full ck-w-10 ck-h-10">
              <span style={{ fontSize: 20 }}>{meta.icon}</span>
            </div>
            <span className="mgr-pill mgr-pill--ok">Tham số</span>
          </div>

          {/* Tên tiếng Việt to, rõ */}
          <h3 className="mgr-store-card__name">
            {meta.label}
          </h3>

          {/* Mô tả tiếng Việt */}
          {meta.description && (
            <p className="ck-text-xs ck-mt-1" style={{ color: "#6b7280", lineHeight: 1.5 }}>
              {meta.description}
            </p>
          )}

          <p className="mgr-store-card__addr ck-truncate ck-mt-2">
            Giá trị:{" "}
            <span className="ck-text-orange-400 ck-font-bold">{val}</span>
          </p>

          <div className="mgr-store-card__foot ck-mt-4">
            {/* Key gốc nhỏ xíu bên dưới để dev còn biết */}
            <span
              className="mgr-mono-muted ck-truncate ck-max-w-[70%]"
              style={{ fontSize: 10 }}
              title={key}
            >
              {key}
            </span>
            <span className="mgr-store-card__cta">Chỉnh sửa →</span>
          </div>
        </div>
      );
    })
  ) : (
    <div className="mgr-empty" style={{ gridColumn: "1 / -1" }}>
      <div className="mgr-empty__icon">⚙️</div>
      <p className="mgr-empty__title">Chưa có cấu hình</p>
    </div>
  )}
</div>

                {/* MODAL CHỈNH SỬA (Hiển thị nổi lên khi chọn 1 config) */}
                {selectedConfig && (() => {
  const meta = getConfigLabel(selectedConfig.key);
  return (
    <div
      className="ck-modal-overlay ingredient-form-modal ck-animate-fade-in"
      onClick={() => setSelectedConfig(null)}
      role="presentation"
      style={{ zIndex: 9999 }}
    >
      <div
        className="ck-modal-box ingredient-form-box ck-max-w-lg ck-w-full"
        onClick={(e) => e.stopPropagation()}
        role="presentation"
      >
        <div className="form-header">
          <div>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>{meta.icon}</span>
              {meta.label}
            </h3>
            {meta.description && (
              <p className="ck-text-xs ck-mt-1" style={{ color: "#9ca3af" }}>
                {meta.description}
              </p>
            )}
            <p className="ck-text-xs ck-mt-1" style={{ color: "#fb923c", fontFamily: "monospace" }}>
              {selectedConfig.key}
            </p>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={() => setSelectedConfig(null)}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="form-body">
          <div className="field">
            <label>Giá trị hiện tại</label>
            <input
              type="text"
              defaultValue={selectedConfig.val}
              id={`input-cfg-${selectedConfig.key}`}
              className="ck-w-full ck-bg-gray-800 ck-text-white ck-px-4 ck-py-2.5 ck-rounded-xl ck-border ck-border-gray-700 focus:ck-border-orange-500 ck-outline-none ck-font-mono"
              placeholder="Nhập giá trị mới..."
            />
            <p className="ck-text-xs ck-text-gray-500 ck-mt-2 ck-italic">
              * Lưu ý: Thay đổi tham số hệ thống có thể ảnh hưởng đến quy
              trình vận hành chung của toàn bộ chuỗi.
            </p>
          </div>

          <div className="form-actions ck-mt-6">
            <button
              type="button"
              className="btn-submit"
              onClick={async () => {
                const inputDom = document.getElementById(
                  `input-cfg-${selectedConfig.key}`
                );
                if (!inputDom.value.trim())
                  return alert("Vui lòng không để trống!");
                try {
                  await api.updateSystemConfig(selectedConfig.key.trim(), {
                    configValue: String(inputDom.value.trim()),
                    description: "Cập nhật từ Manager",
                  });
                  alert("✅ Đã cập nhật thành công!");
                  setSelectedConfig(null);
                } catch (e) {
                  alert("❌ Lỗi: " + e.message);
                }
              }}
            >
              Lưu thay đổi
            </button>
            <button
              type="button"
              className="btn-cancel"
              onClick={() => setSelectedConfig(null)}
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
})()}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* CHI TIẾT ĐƠN HÀNG MODAL */}
      {showOrderDetailsModal && selectedOrderDetails && (
        <div
          className="ck-modal-overlay ingredient-form-modal ck-animate-fade-in"
          onClick={() => setShowOrderDetailsModal(false)}
          role="presentation"
          style={{ zIndex: 9999 }}
        >
          <div
            className="ck-modal-box ingredient-form-box product-detail-box ck-max-w-2xl ck-w-full"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
            /* 1. Ép chiều cao tối đa cho cả cái khung Modal */
            style={{
              display: "flex",
              flexDirection: "column",
              maxHeight: "90vh",
            }}
          >
            <div className="form-header" style={{ flexShrink: 0 }}>
              <div>
                <h3>Chi tiết đơn hàng</h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowOrderDetailsModal(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            {/* 2. Ép phần body tự động chiếm phần còn lại và bắt buộc hiện thanh cuộn nếu dài */}
            <div
              className="form-body ck-scrollbar ck-pr-2"
              style={{ flex: 1, overflowY: "auto" }}
            >
              {/* Trạng thái đơn hàng */}
              <div className="form-row">
                <div className="field ck-w-full">
                  <label>Trạng thái</label>
                  <div className="product-detail-value ck-mt-1">
                    <span
                      className={`ck-badge ${
                        selectedOrderDetails.status === "Hoàn thành" ||
                        selectedOrderDetails.status === "completed" ||
                        selectedOrderDetails.status === "DELIVERED"
                          ? "ck-badge-green"
                          : selectedOrderDetails.status === "Đã hủy" ||
                              selectedOrderDetails.status === "cancelled" ||
                              selectedOrderDetails.status === "CANCELLED"
                            ? "ck-badge-red"
                            : "ck-badge-blue"
                      }`}
                    >
                      {selectedOrderDetails.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ghi chú */}
              {(selectedOrderDetails.note || selectedOrderDetails.notes) && (
                <div className="ck-bg-orange-500/10 ck-border ck-border-orange-500/30 ck-p-4 ck-rounded-xl ck-mb-4 ck-mt-2">
                  <span className="ck-text-orange-400 ck-text-xs ck-font-bold ck-uppercase ck-block ck-mb-1">
                    Ghi chú:
                  </span>
                  <p className="ck-text-gray-300 ck-text-sm">
                    {selectedOrderDetails.note || selectedOrderDetails.notes}
                  </p>
                </div>
              )}

              <div className="sep" style={{ margin: "20px 0" }} />

              <div className="section-label ck-mb-4">
                Danh sách món (
                {
                  (
                    selectedOrderDetails.items ||
                    selectedOrderDetails.details ||
                    []
                  ).length
                }
                )
              </div>

              {(!selectedOrderDetails.items && !selectedOrderDetails.details) ||
              (selectedOrderDetails.items || selectedOrderDetails.details)
                .length === 0 ? (
                <div className="product-detail-empty">
                  <span className="ck-text-2xl ck-mb-2">📦</span>
                  <span>Không có sản phẩm nào trong đơn hàng này</span>
                </div>
              ) : (
                <div className="product-detail-formula-list ck-flex ck-flex-col ck-gap-3">
                  {(
                    selectedOrderDetails.items ||
                    selectedOrderDetails.details ||
                    []
                  ).map((item, idx) => (
                    <div
                      key={idx}
                      className="ck-flex ck-flex-row ck-items-center ck-justify-between ck-p-4 ck-border ck-border-gray-700 ck-rounded-xl ck-bg-gray-800/50"
                    >
                      {/* Trái: Icon + Tên sản phẩm + SL */}
                      <div className="ck-flex ck-items-center ck-gap-3">
                        <div className="ck-flex ck-items-center ck-justify-center ck-w-10 ck-h-10 ck-rounded-full ck-border ck-border-blue-500/40 ck-bg-blue-500/10 ck-text-blue-400">
                          🍱
                        </div>
                        <div>
                          <p className="ck-text-white ck-font-bold ck-text-sm">
                            {item.productName || item.name || item.productId}
                          </p>
                          <p className="ck-text-xs ck-text-gray-400 ck-mt-1">
                            Số lượng:{" "}
                            <span className="ck-text-gray-200 ck-font-bold">
                              {item.quantity}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Phải: Tổng tiền món */}
                      <div className="ck-text-orange-400 ck-font-black ck-text-lg">
                        {(
                          Number(item.price || 0) * Number(item.quantity || 1)
                        ).toLocaleString("vi-VN")}
                        đ
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Nút Đóng */}
              <div className="form-actions ck-mt-6 ck-flex ck-justify-end">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowOrderDetailsModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateReport && (
        <div
          className="ck-modal-overlay ingredient-form-modal ck-animate-fade-in"
          onClick={() => setShowCreateReport(false)}
          role="presentation"
          style={{ zIndex: 9999 }}
        >
          <div
            className="ck-modal-box ingredient-form-box ck-max-w-lg ck-w-full"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            {/* HEADER GIỐNG BOM */}
            <div className="form-header">
              <div>
                <h3>Tạo Báo Cáo</h3>
                <p
                  className="ck-text-sm"
                  style={{ marginTop: 4, color: "#fb923c" }}
                >
                  Xuất dữ liệu theo khoảng thời gian
                </p>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowCreateReport(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            {/* BODY GIỐNG BOM */}
            <div className="form-body">
              {/* Trường nhập Tên báo cáo */}
              <div className="field">
                <label>Tên báo cáo</label>
                <input
                  type="text"
                  value={newReport.name}
                  onChange={(e) =>
                    setNewReport({ ...newReport, name: e.target.value })
                  }
                  className="ck-w-full ck-bg-gray-800 ck-text-white ck-px-4 ck-py-2.5 ck-rounded-xl ck-border ck-border-gray-700 focus:ck-border-orange-500 ck-outline-none"
                  placeholder="Nhập tên báo cáo..."
                />
              </div>

              {/* Cụm chọn Ngày (chia 2 cột) */}
              <div className="ck-grid ck-grid-cols-2 ck-gap-4 ck-mt-4">
                <div className="field">
                  <label>Từ ngày</label>
                  <input
                    type="date"
                    value={newReport.fromDate}
                    onChange={(e) =>
                      setNewReport({ ...newReport, fromDate: e.target.value })
                    }
                    className="ck-w-full ck-bg-gray-800 ck-text-white ck-px-4 ck-py-2.5 ck-rounded-xl ck-border ck-border-gray-700 focus:ck-border-orange-500 ck-outline-none"
                  />
                </div>
                <div className="field">
                  <label>Đến ngày</label>
                  <input
                    type="date"
                    value={newReport.toDate}
                    onChange={(e) =>
                      setNewReport({ ...newReport, toDate: e.target.value })
                    }
                    className="ck-w-full ck-bg-gray-800 ck-text-white ck-px-4 ck-py-2.5 ck-rounded-xl ck-border ck-border-gray-700 focus:ck-border-orange-500 ck-outline-none"
                  />
                </div>
              </div>

              {/* FOOTER NÚT BẤM GIỐNG BOM */}
              <div className="form-actions ck-mt-6">
                <button
                  type="button"
                  className="btn-submit"
                  onClick={handleCreateReport}
                >
                  Tạo & Xuất file
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCreateReport(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QUẢN LÝ SỰ CỐ & KHIẾU NẠI */}
      {showIncidentsModal && (
        <div
          className="ck-modal-overlay ingredient-form-modal manager-ui"
          onClick={() => setShowIncidentsModal(false)}
          role="presentation"
          style={{ zIndex: 9999 }}
        >
          <div
            className="ck-modal-box ingredient-form-box product-detail-box ck-max-w-2xl ck-w-full"
            style={{
              background: "#1a1d23",
              border: "1px solid #333",
              /* BÍ QUYẾT LÀ ĐÂY: Ép khung modal thành 1 cột và cao tối đa 90% màn hình */
              display: "flex",
              flexDirection: "column",
              maxHeight: "90vh",
            }}
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            {/* HEADER (Thêm flexShrink: 0 để Header không bị bóp méo khi cuộn) */}
            <div
              className="form-header"
              style={{ borderBottom: "1px solid #333", flexShrink: 0 }}
            >
              <div>
                <h3 style={{ color: "#fff" }}>Xử lý sự cố & khiếu nại</h3>
                <p
                  style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}
                >
                  Duyệt hàng hỏng/thiếu từ cửa hàng để tạo lệnh nấu bù (COMP)
                </p>
              </div>
              <button
                type="button"
                className="btn-close"
                style={{ background: "#333", color: "#fff" }}
                onClick={() => setShowIncidentsModal(false)}
              >
                ✕
              </button>
            </div>

            {/* FORM BODY: ÉP CUỘN BÊN TRONG */}
            <div
              className="form-body ck-scrollbar"
              style={{
                flex: 1 /* Chiếm toàn bộ không gian còn lại của Modal */,
                overflowY:
                  "auto" /* Bắt buộc phải cuộn bên trong nếu nội dung dài */,
                paddingRight: "6px",
              }}
            >
              {reportedShipments.length === 0 ? (
                <div className="product-detail-empty" style={{ color: "#666" }}>
                  <span style={{ fontSize: "28px" }}>🎉</span>
                  <span>Hệ thống đang hoàn hảo! Không có sự cố nào.</span>
                </div>
              ) : (
                <div className="product-detail-formula-list">
                  {reportedShipments.map((issue, idx) => (
                    <div
                      key={issue.shipmentId || idx}
                      className="incident-card-item"
                      style={{
                        border: "1px solid #333",
                        borderRadius: "16px",
                        padding: "20px",
                        marginBottom: "16px",
                        background: "#242933",
                      }}
                    >
                      {/* Thông tin cửa hàng */}
                      <div
                        className="form-row"
                        style={{ marginBottom: "16px" }}
                      >
                        <div className="field">
                          <label style={{ color: "#888" }}>Cửa hàng</label>
                          <div
                            className="product-detail-value"
                            style={{ color: "#eee", fontWeight: "bold" }}
                          >
                            {issue.storeName}
                          </div>
                        </div>
                        <div className="field" style={{ textAlign: "right" }}>
                          <label style={{ color: "#888" }}>Mã chuyến</label>
                          <div
                            className="product-detail-value"
                            style={{
                              color: "#ff4d4f",
                              fontFamily: "monospace",
                            }}
                          >
                            #{issue.shipmentId}
                          </div>
                        </div>
                      </div>

                      <div
                        className="section-label"
                        style={{
                          color: "#666",
                          fontSize: "11px",
                          borderBottom: "1px solid #333",
                          paddingBottom: "8px",
                        }}
                      >
                        DANH SÁCH MÓN BÁO LỖI
                      </div>

                      <div style={{ marginTop: "12px" }}>
                        {(issue.missingItems || []).map((item, i) => (
                          <div
                            key={i}
                            className="product-detail-formula-item"
                            style={{
                              background: "#1a1d23",
                              border: "1px solid #333",
                              marginBottom: "8px",
                              borderRadius: "12px",
                            }}
                          >
                            <div
                              className="product-detail-formula-icon"
                              style={{ background: "#2d333f" }}
                            >
                              <Package size={16} color="#00f2ff" />
                            </div>
                            <div className="product-detail-formula-info">
                              <span
                                className="product-detail-formula-name"
                                style={{ color: "#fff" }}
                              >
                                {item.productName}
                              </span>
                              {item.issueNote && (
                                <small
                                  style={{
                                    display: "block",
                                    color: "#ff9c6e",
                                    fontStyle: "italic",
                                  }}
                                >
                                  "{item.issueNote}"
                                </small>
                              )}
                            </div>
                            <div className="product-detail-formula-qty">
                              <span
                                className="product-detail-formula-amount"
                                style={{
                                  color: "#ff4d4f",
                                  fontSize: "18px",
                                  fontWeight: "900",
                                }}
                              >
                                -{item.missingQuantity}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: "20px" }}>
                        <button
                          type="button"
                          className="btn-submit"
                          style={{
                            width: "100%",
                            justifyContent: "center",
                            height: "45px",
                            background: "#1a1d23",
                            color: "#ff4d4f",
                            border: "2px solid #5e5f5f",
                            borderRadius: "16px",
                            fontWeight: "bold",
                            display: "flex",
                            alignItems: "center",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                          }}
                          onClick={() =>
                            handleResolveReplacement(issue.shipmentId)
                          }
                        >
                          Duyệt đền bù & Lên mẻ nấu
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FOOTER (Thêm flexShrink: 0) */}
            <div
              className="form-actions"
              style={{ borderTop: "1px solid #333", flexShrink: 0 }}
            ></div>
          </div>
        </div>
      )}

      {/* POPUP: LỊCH SỬ KIỂM KÊ (HIỂN THỊ ĐỘC LẬP) */}
      {showHistoryModal && (
        <div
          className="ck-modal-overlay ck-animate-fade-in"
          style={{
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="ck-modal-box ck-w-full ck-max-w-4xl"
            style={{
              background: "#1a1d23",
              border: "1px solid #333",
              borderRadius: "20px",
              display: "flex",
              flexDirection: "column",
              padding: 0,
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            {/* HEADER */}
            <div
              className="form-header"
              style={{
                borderBottom: "1px solid #333",
                padding: "20px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {/* BÊN TRÁI — căn trái hoàn toàn */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                <h3
                  style={{
                    color: "#fff",
                    margin: 0,
                    fontSize: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {selectedSessionCode && (
                    <button
                      onClick={() => setSelectedSessionCode("")}
                      style={{
                        background: "transparent",
                        color: "#9ca3af",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        fontSize: "16px",
                      }}
                    >
                      ← Quay lại
                    </button>
                  )}
                  {selectedSessionCode ? "Chi tiết kiểm kê" : "Lịch sử kiểm kê"}
                </h3>
                {selectedSessionCode && (
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#4fd1c5",
                      marginTop: "6px",
                      fontFamily: "monospace",
                      textAlign: "left",
                    }}
                  >
                    Mã phiên: {selectedSessionCode}
                  </p>
                )}
              </div>

              {/* NÚT ĐÓNG — bên phải */}
              <button
                type="button"
                style={{
                  background: "#333",
                  color: "#fff",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  flexShrink: 0,
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => setShowHistoryModal(false)}
              >
                ✕
              </button>
            </div>

            {/* BODY */}
            <div className="form-body ck-p-6 ck-max-h-[60vh] ck-overflow-y-auto ck-scrollbar">
              {/* TRẠNG THÁI 1: DANH SÁCH LỊCH SỬ */}
              {!selectedSessionCode ? (
                isLoadingHistory ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px 0",
                      color: "#9ca3af",
                    }}
                  >
                    <div style={{ fontSize: "32px", marginBottom: "12px" }}>
                      ⏳
                    </div>
                    Đang tải dữ liệu...
                  </div>
                ) : stocktakeHistory.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px 0",
                      color: "#9ca3af",
                    }}
                  >
                    <div style={{ fontSize: "32px", marginBottom: "12px" }}>
                      📭
                    </div>
                    Chưa có lịch sử kiểm kê nào.
                  </div>
                ) : (
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      textAlign: "center",
                      fontSize: "14px",
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#242933", color: "#9ca3af" }}>
                        <th
                          style={{
                            padding: "12px 16px",
                            borderRadius: "10px 0 0 10px",
                            textAlign: "center",
                          }}
                        >
                          Mã Phiên
                        </th>
                        <th
                          style={{ padding: "12px 16px", textAlign: "center" }}
                        >
                          Thời gian
                        </th>
                        <th
                          style={{ padding: "12px 16px", textAlign: "center" }}
                        >
                          Số món biến động
                        </th>
                        <th
                          style={{ padding: "12px 16px", textAlign: "center" }}
                        >
                          Tổng lệch
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            borderRadius: "0 10px 10px 0",
                            textAlign: "center",
                          }}
                        >
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stocktakeHistory.map((history, idx) => {
                        // Nhân -1 để đảo ngược dấu theo ý bạn (+ thành -, - thành +)
                        const displayVariance = -(
                          history.totalQuantityVariance || 0
                        );

                        return (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: "1px solid #2d3748",
                              transition: "all 0.2s ease",
                              transform: "translateY(0)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "rgba(255,255,255,0.04)";
                              e.currentTarget.style.transform =
                                "translateY(-2px)";
                              e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(0,0,0,0.3)";
                              const btn =
                                e.currentTarget.querySelector(".btn-xem");
                              if (btn) btn.style.opacity = "1";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow = "none";
                              const btn =
                                e.currentTarget.querySelector(".btn-xem");
                              if (btn) btn.style.opacity = "0";
                            }}
                          >
                            <td
                              style={{
                                padding: "14px 16px",
                                fontFamily: "monospace",
                                fontWeight: "bold",
                                color: "#4fd1c5",
                                textAlign: "center",
                              }}
                            >
                              {history.sessionCode}
                            </td>
                            <td
                              style={{
                                padding: "14px 16px",
                                color: "#d1d5db",
                                textAlign: "center",
                              }}
                            >
                              {new Date(history.stocktakeDate).toLocaleString(
                                "vi-VN",
                              )}
                            </td>
                            <td
                              style={{
                                padding: "14px 16px",
                                fontWeight: "bold",
                                color: "#fff",
                                textAlign: "center",
                              }}
                            >
                              {history.totalIngredientsChanged} món
                            </td>
                            <td
                              style={{
                                padding: "14px 16px",
                                fontFamily: "monospace",
                                textAlign: "center",
                              }}
                            >
                              {/* Dùng displayVariance đã đảo dấu để render màu và text */}
                              <span
                                style={{
                                  color:
                                    displayVariance < 0
                                      ? "#f87171"
                                      : displayVariance > 0
                                        ? "#60a5fa"
                                        : "#4ade80",
                                  fontWeight: "bold",
                                }}
                              >
                                {displayVariance > 0 ? "+" : ""}
                                {displayVariance}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: "14px 16px",
                                textAlign: "center",
                              }}
                            >
                              <button
                                className="btn-xem"
                                onClick={() =>
                                  handleViewHistoryDetail(history.sessionCode)
                                }
                                style={{
                                  opacity: 0,
                                  transition: "all 0.2s ease",
                                  fontSize: "12px",
                                  background: "#374151",
                                  color: "#fff",
                                  border: "none",
                                  padding: "6px 16px",
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                }}
                              >
                                Xem
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              ) : /* TRẠNG THÁI 2: CHI TIẾT 1 PHIÊN */
              historyDetails.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#9ca3af",
                  }}
                >
                  <div style={{ fontSize: "32px", marginBottom: "12px" }}>
                    ⏳
                  </div>
                  Đang tải chi tiết...
                </div>
              ) : (
                console.log("historyDetails:", historyDetails) || (
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      textAlign: "center",
                      fontSize: "14px",
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#242933", color: "#9ca3af" }}>
                        <th
                          style={{
                            padding: "12px 16px",
                            borderRadius: "10px 0 0 10px",
                            textAlign: "center",
                          }}
                        >
                          Mã Món
                        </th>
                        <th
                          style={{ padding: "12px 16px", textAlign: "center" }}
                        >
                          Nguyên liệu
                        </th>
                        <th
                          style={{ padding: "12px 16px", textAlign: "center" }}
                        >
                          Hao hụt / Dư
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            borderRadius: "0 10px 10px 0",
                            textAlign: "center",
                          }}
                        >
                          Ghi chú
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyDetails.map((detail, idx) => {
                        // 1. Lấy đúng trường quantityChange từ API (fallback về 0 nếu undefined để chống NaN)
                        const rawDiff = detail.quantityChange ?? 0;

                        // 2. Xác định trạng thái Hao hụt (âm) hay Dư (dương) dựa trên số lượng
                        const isLoss = rawDiff < 0;

                        return (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: "1px solid #2d3748",
                              transition: "background 0.2s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "rgba(255,255,255,0.03)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <td
                              style={{
                                padding: "14px 16px",
                                fontFamily: "monospace",
                                color: "#9ca3af",
                                textAlign: "center",
                              }}
                            >
                              {detail.ingredient?.id}
                            </td>
                            <td
                              style={{
                                padding: "14px 16px",
                                fontWeight: "bold",
                                color: "#e5e7eb",
                                textAlign: "center",
                              }}
                            >
                              {detail.ingredient?.name}
                            </td>
                            <td
                              style={{
                                padding: "14px 16px",
                                fontFamily: "monospace",
                                textAlign: "center",
                              }}
                            >
                              {/* 3. Hiển thị mũi tên và màu sắc dựa trên sự chênh lệch */}
                              <span
                                style={{
                                  color: isLoss ? "#f87171" : "#60a5fa",
                                  fontWeight: "bold",
                                }}
                              >
                                {isLoss ? "↘" : "↗"} {Math.abs(rawDiff)}
                              </span>
                            </td>

                            {/* CỘT GHI CHÚ */}
                            <td
                              style={{
                                padding: "14px 16px",
                                textAlign: "center",
                              }}
                            >
                              {detail.note || detail.createdBy ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewingNoteDetail({
                                      note: detail.note || "Không có ghi chú",
                                      // 4. Lấy đúng trường createdBy theo dữ liệu JSON
                                      performedBy:
                                        detail.createdBy || "Hệ thống",
                                    })
                                  }
                                  style={{
                                    background: "transparent",
                                    border: "1px solid #374151",
                                    borderRadius: "8px",
                                    padding: "5px 10px",
                                    cursor: "pointer",
                                    color: "#9ca3af",
                                    fontSize: "15px",
                                    transition: "all 0.2s",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background =
                                      "rgba(79,209,197,0.1)";
                                    e.currentTarget.style.borderColor =
                                      "#4fd1c5";
                                    e.currentTarget.style.color = "#4fd1c5";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background =
                                      "transparent";
                                    e.currentTarget.style.borderColor =
                                      "#374151";
                                    e.currentTarget.style.color = "#9ca3af";
                                  }}
                                  title="Xem ghi chú"
                                >
                                  👁️
                                </button>
                              ) : (
                                <span
                                  style={{ color: "#4b5563", fontSize: "13px" }}
                                >
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================== MODAL THÊM NGUYÊN LIỆU ================== */}
{/* ================== MODAL THÊM NGUYÊN LIỆU ================== */}
{showAddIngredient && (
  <div
    className="ck-modal-overlay ingredient-form-modal"
    onClick={() => {
      setShowAddIngredient(false);
      setEditingIngredient(null);
    }}
    role="presentation"
  >
    <div
      className="ck-modal-box ingredient-form-box ck-max-w-lg ck-w-full"
      onClick={(e) => e.stopPropagation()}
      role="presentation"
    >
      <div className="form-header">
        <div>
          <h3>
            {editingIngredient
              ? "Chỉnh sửa nguyên liệu"
              : "Thêm nguyên liệu"}
          </h3>
        </div>
        <button
          type="button"
          className="btn-close"
          onClick={() => {
            setShowAddIngredient(false);
            setEditingIngredient(null);
          }}
        >
          <span style={{ fontSize: "16px", fontWeight: "bold" }}>✕</span>
        </button>
      </div>

      <form
        className="form-body"
        onSubmit={
          editingIngredient
            ? handleUpdateIngredient
            : handleCreateIngredient
        }
      >
        {editingIngredient && (
          <div className="editing-bar">
            <span>
              Đang sửa:{" "}
              <strong>
                {editingIngredient.name ??
                  editingIngredient.ingredientName}
              </strong>
            </span>
            {editingIngredient.version != null && (
              <span className="version">
                v{editingIngredient.version}
              </span>
            )}
          </div>
        )}

        <div className="field">
          <label>Tên nguyên liệu *</label>
          <input
            type="text"
            value={ingredientForm.name}
            onChange={(e) =>
              setIngredientForm({
                ...ingredientForm,
                name: e.target.value,
              })
            }
            placeholder="VD: Thịt bò Úc"
            autoFocus
          />
        </div>

        <div className="form-row">
          {/* ================= ĐƠN VỊ ================= */}
          <div className="field" ref={unitDropdownRef} style={{ position: "relative" }}>
            <label>Đơn vị</label>

            {/* Ô trigger */}
            <div
              id="unit-trigger"
              onClick={() => {
                setIsUnitDropdownOpen((prev) => !prev);
                setUnitSearchText("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #374151",
                background: "#1f2937",
                color: ingredientForm.unit ? "#e5e7eb" : "#6b7280",
                cursor: "pointer",
                minHeight: "38px",
                userSelect: "none",
              }}
            >
              <span>
                {ingredientForm.unit
                  ? unitMasterData.find((u) => u.value === ingredientForm.unit)?.label ?? ingredientForm.unit
                  : "-- Chọn đơn vị --"}
              </span>
              <span style={{ fontSize: "11px", color: "#6b7280" }}>
                {isUnitDropdownOpen ? "▲" : "▼"}
              </span>
            </div>

            {/* Dropdown panel */}
            {isUnitDropdownOpen && (() => {
              const triggerEl = document.getElementById("unit-trigger");
              const rect = triggerEl?.getBoundingClientRect();
              return (
                <div
                  style={{
                    position: "fixed",
                    top: rect ? rect.bottom + 4 : 0,
                    left: rect ? rect.left : 0,
                    width: rect ? rect.width : 240,
                    background: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    zIndex: 99999,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    overflow: "hidden",
                  }}
                >
                  {/* Ô search */}
                  <div style={{ padding: "8px" }}>
                    <input
                      autoFocus
                      type="text"
                      placeholder="Tìm đơn vị..."
                      value={unitSearchText}
                      onChange={(e) => setUnitSearchText(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #374151",
                        background: "#111827",
                        color: "#e5e7eb",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Danh sách có group */}
                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: "0 0 6px 0",
                      maxHeight: "180px",
                      overflowY: "auto",
                    }}
                  >
                    {(() => {
                      const filtered = unitMasterData.filter((u) =>
                        u.isSales === false &&
                        u.group !== "Đóng gói" &&
                        (u.label.toLowerCase().includes(unitSearchText.toLowerCase()) ||
                        u.value.toLowerCase().includes(unitSearchText.toLowerCase()))
                      );

                      const grouped = filtered.reduce((acc, u) => {
                        const g = u.group || "Khác";
                        if (!acc[g]) acc[g] = [];
                        acc[g].push(u);
                        return acc;
                      }, {});

                      if (filtered.length === 0) {
                        return (
                          <li style={{ padding: "10px 16px", color: "#6b7280", fontSize: "13px" }}>
                            Không tìm thấy đơn vị nào
                          </li>
                        );
                      }

                      return Object.entries(grouped).map(([groupName, units]) => (
                        <React.Fragment key={groupName}>
                          {/* Tiêu đề nhóm */}
                          <li style={{
                            padding: "6px 16px 4px",
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#6b7280",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            userSelect: "none",
                            pointerEvents: "none",
                          }}>
                            {groupName}
                          </li>

                          {/* Các đơn vị trong nhóm */}
                          {units.map((u) => (
                            <li
                              key={u.value}
                              onClick={() => {
                                setIngredientForm({ ...ingredientForm, unit: u.value });
                                setIsUnitDropdownOpen(false);
                                setUnitSearchText("");
                              }}
                              style={{
                                padding: "8px 16px",
                                paddingLeft: "24px",
                                cursor: "pointer",
                                fontSize: "13px",
                                color: ingredientForm.unit === u.value ? "#2dd4bf" : "#e5e7eb",
                                background: ingredientForm.unit === u.value ? "rgba(20,184,166,0.12)" : "transparent",
                                fontWeight: ingredientForm.unit === u.value ? "600" : "400",
                              }}
                              onMouseEnter={(e) => {
                                if (ingredientForm.unit !== u.value)
                                  e.currentTarget.style.background = "#374151";
                              }}
                              onMouseLeave={(e) => {
                                if (ingredientForm.unit !== u.value)
                                  e.currentTarget.style.background = "transparent";
                              }}
                            >
                              {u.label}
                            </li>
                          ))}
                        </React.Fragment>
                      ));
                    })()}
                  </ul>
                </div>
              );
            })()}
          </div>
          {/* ================= END ĐƠN VỊ ================= */}

          <div className="field">
            <label>Đơn giá (đ)</label>
            <input
              type="number"
              step="any"
              min="0"
              value={ingredientForm.unitCost}
              onChange={(e) =>
                setIngredientForm({
                  ...ingredientForm,
                  unitCost: e.target.value,
                })
              }
              placeholder="0"
            />
          </div>
        </div>

        {editingIngredient && (
          <div className="form-row">
            <div className="field">
              <label>Tồn kho</label>
              <input
                type="number"
                step="any"
                min="0"
                value={ingredientForm.kitchenStock}
                onChange={(e) =>
                  setIngredientForm({
                    ...ingredientForm,
                    kitchenStock: e.target.value,
                  })
                }
                placeholder="0"
              />
            </div>
            <div className="field">
              <label>Mức tối thiểu</label>
              <input
                type="number"
                step="any"
                min="0"
                value={ingredientForm.minThreshold}
                onChange={(e) =>
                  setIngredientForm({
                    ...ingredientForm,
                    minThreshold: e.target.value,
                  })
                }
                placeholder="0"
              />
              <p className="helper">Cảnh báo khi tồn kho ≤ mức này</p>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => {
              setShowAddIngredient(false);
              setEditingIngredient(null);
            }}
          >
            Hủy
          </button>
          <button type="submit" className="btn-submit">
            {editingIngredient ? "Lưu thay đổi" : "Thêm nguyên liệu"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {showImportHistoryModal && (
        <div
          className="ck-modal-overlay ingredient-form-modal ck-animate-fade-in manager-ui"
          onClick={() => setShowImportHistoryModal(false)}
          role="presentation"
          style={{ zIndex: 9999 }}
        >
          <div
            className="ck-modal-box ingredient-form-box ck-max-w-lg ck-w-full"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
            style={{
              display: "flex",
              flexDirection: "column",
              maxHeight: "85vh",
              width: "700px",
            }}
          >
            {/* HEADER */}
            <div
              className="form-header"
              style={{ flexShrink: 0, padding: "16px 20px" }}
            >
              <div>
                <h3 style={{ fontSize: "1.1rem" }}>Lịch sử nhập kho</h3>
                <p
                  className="ck-text-xs"
                  style={{ marginTop: 4, color: "#4ADE80", fontWeight: "bold" }}
                >
                  Kho trung tâm · {importHistory.length} phiếu
                </p>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowImportHistoryModal(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            {/* BODY — CÓ THANH CUỘN */}
            <div
              className="form-body ck-scrollbar"
              style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}
            >
              <div
                className="section-label ck-mb-3"
                style={{ fontSize: "11px" }}
              >
                DANH SÁCH PHIẾU NHẬP
              </div>

              {importHistoryLoading ? (
                <div className="ck-flex ck-flex-col ck-items-center ck-justify-center ck-py-8 ck-text-gray-500">
                  <span className="ck-text-sm">⏳ Đang tải dữ liệu...</span>
                </div>
              ) : importHistory.length === 0 ? (
                <div className="ck-flex ck-flex-col ck-items-center ck-justify-center ck-py-8 ck-text-gray-500">
                  <span className="ck-text-sm">Chưa có phiếu nhập nào</span>
                </div>
              ) : (
                <div className="ck-flex ck-flex-col ck-gap-3">
                  {importHistory.map((ticket) => (
                    <div
                      key={ticket.ticketId}
                      role="button"
                      onClick={() => setSelectedTicket(ticket)}
                      className="ck-flex ck-flex-row ck-items-center ck-justify-between ck-p-3 ck-border ck-border-gray-700 ck-rounded-xl ck-bg-gray-900/30 ck-cursor-pointer ck-transition-all"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(20,184,166,0.5)";
                        e.currentTarget.style.background =
                          "rgba(20,184,166,0.06)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "";
                        e.currentTarget.style.background = "";
                      }}
                    >
                      {/* TRÁI: icon + thông tin phiếu */}
                      <div className="ck-flex ck-items-center ck-gap-3">
                        <div
                          className="product-detail-formula-icon"
                          style={{ background: "#2d333f", flexShrink: 0 }}
                        >
                          📋
                        </div>
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontFamily: "monospace",
                              fontWeight: 700,
                              fontSize: 13,
                              color: "#38bdf8",
                            }}
                          >
                            {ticket.ticketId}
                          </p>
                          <p
                            style={{
                              margin: "2px 0 0",
                              fontSize: 11,
                              color: "#9ca3af",
                            }}
                          >
                            {new Date(ticket.importDate).toLocaleString(
                              "vi-VN",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}{" "}
                            · {ticket.createdByName || "—"}
                          </p>
                          {ticket.note && (
                            <p
                              style={{
                                margin: "2px 0 0",
                                fontSize: 11,
                                color: "#6b7280",
                                fontStyle: "italic",
                              }}
                            >
                              📝 {ticket.note}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* PHẢI: tổng tiền + badge số dòng + mũi tên */}
                      <div
                        className="ck-flex ck-items-center ck-gap-3"
                        style={{ flexShrink: 0 }}
                      >
                        <div style={{ textAlign: "right", minWidth: 110 }}>
                          <p
                            style={{
                              margin: 0,
                              fontFamily: "monospace",
                              fontWeight: 700,
                              fontSize: 14,
                              color: "#4ade80",
                              textAlign: "right",
                            }}
                          >
                            {Number(ticket.totalAmount || 0).toLocaleString(
                              "vi-VN",
                            )}
                            đ
                          </p>
                          <p
                            style={{
                              margin: "2px 0 0",
                              fontSize: 10,
                              color: "#6b7280",
                              textAlign: "right",
                            }}
                          >
                            {ticket.items?.length || 0} nguyên liệu
                          </p>
                        </div>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>
                          ›
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div
              className="form-actions"
              style={{
                padding: "20px",
                borderTop: "1px solid #374151",
                display: "flex",
                gap: "12px",
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                className="btn-cancel ck-flex-1 ck-py-3 ck-rounded-xl ck-font-bold ck-text-base"
                onClick={() => setShowImportHistoryModal(false)}
                style={{
                  background: "#4b5563",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-3px)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTicket && (
        <div
          className="ck-modal-overlay ingredient-form-modal ck-animate-fade-in manager-ui"
          onClick={() => setSelectedTicket(null)}
          role="presentation"
          style={{ zIndex: 10000 }}
        >
          <div
            className="ck-modal-box ingredient-form-box ck-max-w-lg ck-w-full"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
            style={{
              display: "flex",
              flexDirection: "column",
              maxHeight: "85vh",
              width: "560px",
            }}
          >
            {/* HEADER */}
            <div
              className="form-header"
              style={{ flexShrink: 0, padding: "16px 20px" }}
            >
              <div>
                <h3 style={{ fontSize: "1.1rem" }}>Chi tiết phiếu nhập</h3>
                <p
                  className="ck-text-xs"
                  style={{
                    marginTop: 4,
                    color: "#4ADE80",
                    fontWeight: "bold",
                    fontFamily: "monospace",
                  }}
                >
                  {selectedTicket.ticketId}
                </p>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setSelectedTicket(null)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            {/* BODY — CÓ THANH CUỘN */}
            <div
              className="form-body ck-scrollbar"
              style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}
            >
              {/* THÔNG TIN PHIẾU */}
              <div
                className="section-label ck-mb-3"
                style={{ fontSize: "11px" }}
              >
                THÔNG TIN PHIẾU
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 20,
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: "rgba(20,184,166,0.06)",
                  border: "1px solid rgba(20,184,166,0.2)",
                }}
              >
                {[
                  {
                    label: "Ngày nhập",
                    value: new Date(selectedTicket.importDate).toLocaleString(
                      "vi-VN",
                      {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    ),
                  },
                  {
                    label: "Người tạo",
                    value: selectedTicket.createdByName || "—",
                  },
                  { label: "Ghi chú", value: selectedTicket.note || "—" },
                  {
                    label: "Trạng thái",
                    value: (
                      <span
                        className="mgr-pill mgr-pill--ok"
                        style={{ fontSize: 11 }}
                      >
                        {selectedTicket.status || "—"}
                      </span>
                    ),
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p
                      style={{
                        fontSize: 10,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        margin: "0 0 4px",
                      }}
                    >
                      {label}
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#e5e7eb",
                        margin: 0,
                        fontWeight: 500,
                      }}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* DANH SÁCH NGUYÊN LIỆU */}
              <div
                className="section-label ck-mb-3"
                style={{ fontSize: "11px" }}
              >
                NGUYÊN LIỆU NHẬP ({selectedTicket.items?.length || 0} DÒNG)
              </div>

              <div className="ck-flex ck-flex-col ck-gap-3">
                {(selectedTicket.items || []).map((item, i) => (
                  <div
                    key={i}
                    className="ck-flex ck-flex-row ck-items-center ck-justify-between ck-p-3 ck-border ck-border-gray-700 ck-rounded-xl ck-bg-gray-900/30"
                  >
                    {/* TRÁI: icon + tên */}
                    <div className="ck-flex ck-items-center ck-gap-3">
                      <span className="ck-text-sm ck-text-white ck-font-medium">
                        {item.ingredientName}
                      </span>
                    </div>

                    {/* PHẢI: số liệu */}
                    <div
                      className="ck-flex ck-items-center ck-gap-3"
                      style={{ flexShrink: 0 }}
                    >
                      {/* Số lượng + đơn vị */}
                      <div style={{ textAlign: "right", minWidth: 120 }}>
                        <p
                          style={{
                            margin: 0,
                            fontFamily: "monospace",
                            fontWeight: 700,
                            fontSize: 14,
                            color: "#fff",
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "baseline",
                            gap: 4,
                          }}
                        >
                          {Number(item.quantity).toLocaleString("vi-VN")}
                          <span
                            style={{
                              fontSize: 11,
                              color: "#9ca3af",
                              fontWeight: 400,
                              minWidth: 52,
                              textAlign: "left",
                            }}
                          >
                            {getUnitLabel(item.unit)}
                          </span>
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: 11,
                            color: "#6b7280",
                            textAlign: "",
                            minWidth: 120,
                            paddingRight: 20,
                          }}
                        >
                          {Number(item.importPrice).toLocaleString("vi-VN")}đ /{" "}
                          {getUnitLabel(item.unit)}
                        </p>
                      </div>

                      {/* Thành tiền */}
                      <div
                        style={{
                          padding: "4px 10px",
                          borderRadius: 8,
                          background: "rgba(74,222,128,0.1)",
                          border: "1px solid rgba(74,222,128,0.2)",
                          textAlign: "right",
                          minWidth: 90,
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontFamily: "monospace",
                            fontWeight: 700,
                            fontSize: 13,
                            color: "#4ade80",
                          }}
                        >
                          {Number(item.totalPrice).toLocaleString("vi-VN")}đ
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FOOTER — TỔNG TIỀN + NÚT */}
            <div
              className="form-actions"
              style={{
                padding: "20px",
                borderTop: "1px solid #374151",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexShrink: 0,
              }}
            >
              {/* Tổng tiền */}
              <div>
                <p
                  style={{
                    fontSize: 10,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    margin: "0 0 2px",
                  }}
                >
                  Tổng giá trị phiếu
                </p>
                <p
                  style={{
                    fontSize: 20,
                    fontFamily: "monospace",
                    fontWeight: 900,
                    color: "#4ade80",
                    margin: 0,
                  }}
                >
                  {Number(selectedTicket.totalAmount || 0).toLocaleString(
                    "vi-VN",
                  )}
                  đ
                </p>
              </div>

              {/* Nút đóng */}
              <button
                type="button"
                className="btn-cancel ck-py-3 ck-rounded-xl ck-font-bold ck-text-base"
                onClick={() => setSelectedTicket(null)}
                style={{
                  background: "#4b5563",
                  color: "#fff",
                  border: "none",
                  padding: "10px 28px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  borderRadius: 12,
                  fontWeight: 700,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-3px)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MINI: GHI CHÚ CHI TIẾT */}
      {viewingNoteDetail && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
          onClick={() => setViewingNoteDetail(null)}
        >
          <div
            className="manager-note-popup"
            style={{
              background: "#1a1d23",
              border: "1px solid #374151",
              borderRadius: "16px",
              padding: "24px",
              width: "360px",
              maxWidth: "90vw",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h4 style={{ margin: 0, color: "#fff", fontSize: "16px" }}>
                📋 Chi tiết ghi chú
              </h4>
              <button
                type="button"
                onClick={() => setViewingNoteDetail(null)}
                style={{
                  background: "#333",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Người thực hiện */}
            <div
              style={{
                marginBottom: "16px",
                padding: "12px 14px",
                background: "rgba(79,209,197,0.08)",
                border: "1px solid rgba(79,209,197,0.2)",
                borderRadius: "10px",
              }}
            >
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "11px",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  fontWeight: "700",
                }}
              >
                Người thực hiện
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#4fd1c5",
                }}
              >
                {viewingNoteDetail.performedBy}
              </p>
            </div>

            {/* Ghi chú */}
            <div
              className="manager-note-popup__note-box"
              style={{
                padding: "12px 14px",
                background: "#242933",
                border: "1px solid #333",
                borderRadius: "10px",
              }}
            >
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "11px",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  fontWeight: "700",
                }}
              >
                Ghi chú hiện trường
              </p>
              <p
                className="manager-note-popup__note-text"
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "#e5e7eb",
                  lineHeight: "1.6",
                  wordBreak: "break-word",
                }}
              >
                {viewingNoteDetail.note}
              </p>
            </div>

            {/* Nút đóng */}
            <button
              type="button"
              onClick={() => setViewingNoteDetail(null)}
              style={{
                marginTop: "20px",
                width: "100%",
                padding: "10px",
                background: "#374151",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontWeight: "700",
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#4b5563")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#374151")
              }
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerPage;
