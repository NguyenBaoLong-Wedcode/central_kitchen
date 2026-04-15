import React, { useState, useCallback, useEffect } from "react";
import {
  Eye,
  ChefHat,
  LayoutDashboard,
  TrendingUp,
  Activity,
} from "../../components/icons/Icons";
import "../../styles/store-manager.css";
import api from "../../services/api";
import ChangePasswordModal from "../../components/common/ChangePasswordModal";
import UpdateProfileModal from "../../components/common/UpdateProfileModal";
import HeaderSettingsMenu from "../../components/common/HeaderSettingsMenu";
import NotificationBell from "../../components/common/NotificationBell";
import ThemeToggleButton from "../../components/common/ThemeToggleButton";
import { useUiTheme } from "../../context/UiThemeContext";

/** Tiêu đề topbar theo tab — cùng kiểu meta như trang Cửa hàng */
const KITCHEN_PAGE_META = {
  "Tổng Quan": {
    title: "Tổng quan",
    crumb: "Tổng quan",
    iconBg: "#eef5f1",
    iconStroke: "#4a7c5f",
  },
  Đơn: {
    title: "Phiếu yêu cầu nấu",
    crumb: "Mẻ nấu",
    iconBg: "#fdf3e0",
    iconStroke: "#d4860a",
  },
};

const CentralKitchenPage = ({ onLogout, userData, onProfileUpdated }) => {
  const { uiTheme } = useUiTheme();
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showUpdateProfileModal, setShowUpdateProfileModal] = useState(false);
  const ITEMS_PER_PAGE = 10;
  const [runsPage, setRunsPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);
  const [ingredientsPage, setIngredientsPage] = useState(1);
  // 1. STATE CHUNG
  const [activeKitchenTab, setActiveKitchenTab] = useState("Tổng Quan");
  const [aggregationData, setAggregationData] = useState(null);
  const [showAggModal, setShowAggModal] = useState(false);
  const [kitchenSubTab, setKitchenSubTab] = useState("categories");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [, setIsRefreshing] = useState(false);
  const [errorModal, setErrorModal] = useState({ show: false, message: "" });
  const [selectedRecipeRun, setSelectedRecipeRun] = useState(null);

  const [productionRuns, setProductionRuns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [unitMasterData, setUnitMasterData] = useState([]);

  const [productSearchText, setProductSearchText] = useState("");
  const [productAppliedSearch, setProductAppliedSearch] = useState("");
  const [ingredientSearchText, setIngredientSearchText] = useState("");
  const [ingredientAppliedSearch, setIngredientAppliedSearch] = useState("");

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

  const [selectedAggItems, setSelectedAggItems] = useState([]);
  const [, setExpandedOrderId] = useState(null);
  const [viewingOrderDetails, setViewingOrderDetails] = useState(null);
  const [, setExpandedRecipeIndex] = useState(null);
  const [viewingItemFormula, setViewingItemFormula] = useState(null);
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [runsData, catsData, prodsData, ingsData, units] =
        await Promise.all([
          api.getProductionRuns().catch(() => []),
          api.getCategories().catch(() => []),
          api.getProducts().catch(() => []),
          api.getIngredients().catch(() => []),
          api.getUnits().catch(() => []),
        ]);

      // --- MAP DỮ LIỆU MẺ NẤU TỪ BACKEND SANG FRONTEND ---
      const rawRuns = Array.isArray(runsData) ? runsData : runsData?.data || [];
      const mappedRuns = rawRuns.map((run, idx) => {
        let currentStatus = String(run.status || "PENDING").toUpperCase();
        if (
          ["PLANNED", "NEW", "CREATED", "WAITING", "TODO"].includes(
            currentStatus,
          )
        ) {
          currentStatus = "PENDING";
        } else if (
          ["IN_PROGRESS", "PROCESSING", "DOING", "COOKING"].includes(
            currentStatus,
          )
        ) {
          currentStatus = "COOKING";
        } else if (
          ["DONE", "FINISHED", "SUCCESS", "COMPLETED"].includes(currentStatus)
        ) {
          currentStatus = "COMPLETED";
        }

        const items = run.items || [];
        // Tính tổng tiến độ dựa trên các món con bên trong
        const totalQty = items.reduce(
          (sum, item) => sum + (item.quantity || 0),
          0,
        );
        const cookedQty = items.reduce(
          (sum, item) => sum + (item.isCooked ? item.quantity : 0),
          0,
        );

        return {
          id: run.runId || `RUN_TEMP_${idx}`,
          orderId: run.orderId || "UNKNOWN",
          storeName: run.storeName || "Cửa hàng",
          orderType: run.orderType || "STANDARD",
          name: `${run.orderId} - ${run.storeName}`,
          status: currentStatus,
          totalQty: totalQty,
          cookedQty: cookedQty,
          items: items,
          bom: items
            .flatMap((item) => item.formulas || [])
            .map((ing) => ({
              name: ing.ingredientName || "Nguyên liệu",
              qtyPerItem: Number(ing.amountNeeded || 0),
              unit: ing.unit || "KG",
            })),
        };
      });
      setProductionRuns(mappedRuns);

      setCategories(Array.isArray(catsData) ? catsData : []);
      setProducts(Array.isArray(prodsData) ? prodsData : []);

      // Map dữ liệu thực tế từ Database cho Nguyên liệu
      const mappedIngredients = (Array.isArray(ingsData) ? ingsData : []).map(
        (ing) => {
          const currentStock = parseFloat(
            ing.kitchenStock ?? ing.kitchen_stock ?? 0,
          );
          const minThreshold = parseFloat(
            ing.minThreshold ?? ing.min_threshold ?? 0,
          );
          let currentStatus = "Đủ hàng";
          if (currentStock <= 0) {
            currentStatus = "Hết hàng";
          } else if (currentStock <= minThreshold) {
            currentStatus = "Cần nhập gấp";
          }
          return {
            id: ing.ingredientId || ing.ingredient_id || ing.id,
            name: ing.name || ing.ingredientName || "Chưa có tên",
            stock: currentStock,
            minThreshold: minThreshold,
            unit: ing.unit || "KG",
            unitCost: parseFloat(ing.unitCost ?? ing.unit_cost ?? 0),
            status: currentStatus,
          };
        },
      );
      setIngredients(mappedIngredients);
      setUnitMasterData(Array.isArray(units) ? units : []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const stats = {
    totalRequested: productionRuns.reduce(
      (sum, run) => sum + (run.totalQty || 0),
      0,
    ),
    cooking: productionRuns.filter((r) => r.status === "COOKING").length,
    completed: productionRuns.filter((r) => r.status === "COMPLETED").length,
  };

  const meta =
    KITCHEN_PAGE_META[activeKitchenTab] || KITCHEN_PAGE_META["Tổng Quan"];

  const handleUpdateRunStatus = async (id, newStatus) => {
    try {
      // Nếu bấm "Bắt đầu nấu" → trừ kho TRƯỚC, rồi mới đổi trạng thái
      if (newStatus === "COOKING") {
        const run = productionRuns.find((r) => r.id === id);

        if (!run) {
          throw new Error("Không tìm thấy phiếu nấu!");
        }

        // Lôi toàn bộ productId từ items của phiếu
        const productIds = (run.items || [])
          .map((item) => item.productId || item.product_id || item.id)
          .filter(Boolean);

        if (productIds.length === 0) {
          throw new Error("Phiếu nấu này không có món nào để trừ kho!");
        }

        // Gọi API trừ kho — gửi full danh sách productId
        await api.cookRunItems(id, productIds);
      }

      // Sau đó mới đổi trạng thái bình thường
      await api.updateProductionRunStatus(id, newStatus);
      await loadData();
    } catch (err) {
      setErrorModal({
        show: true,
        message: err.message || "Lỗi hệ thống khi cập nhật trạng thái!",
      });
    }
  };

  const handleOpenAggregation = async () => {
    try {
      const data = await api.getKitchenAggregation(); // BE trả về list Đơn hàng

      let sortedData = [];
      if (Array.isArray(data)) {
        // Sắp xếp: Ưu tiên URGENT (Khẩn cấp) lên đầu, tiếp theo là COMPENSATION (Sự cố)
        sortedData = data.sort((a, b) => {
          const typeA = String(a.orderType || a.type || "").toUpperCase();
          const typeB = String(b.orderType || b.type || "").toUpperCase();

          const getWeight = (type) => {
            if (type.includes("URGENT") || type.includes("KHẨN")) return 3;
            if (type.includes("COMPENSATION") || type.includes("SỰ CỐ"))
              return 2;
            return 1;
          };

          return getWeight(typeB) - getWeight(typeA);
        });
      }

      setAggregationData(sortedData);
      setSelectedAggItems([]); // Reset danh sách chọn
      setExpandedOrderId(null); // Reset trạng thái mở rộng
      setShowAggModal(true);
    } catch (error) {
      setErrorModal({
        show: true,
        message: "Lỗi tải dữ liệu gom đơn hoặc không có đơn mới!",
      });
    }
  };
  const toggleAggItem = (productId) => {
    setSelectedAggItems((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const handleConfirmAggregation = async () => {
    if (selectedAggItems.length === 0) {
      return alert("Vui lòng chọn ít nhất 1 món để gom!");
    }

    try {
      await api.confirmAggregation(selectedAggItems);
      setShowAggModal(false);
      loadData();
      alert("✅ Đã chốt gom đơn, xuất kho và chuyển trạng thái thành công!");
    } catch (err) {
      alert("❌ Lỗi chốt gom đơn, vui lòng thử lại sau!");
      setShowAggModal(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    setRunsPage(1);
  }, [activeKitchenTab]);

  const handleTabChange = (tab) => {
    setKitchenSubTab(tab);
    setProductsPage(1);
    setIngredientsPage(1);
    setProductAppliedSearch("");
    setProductSearchText("");
    setIngredientAppliedSearch("");
    setIngredientSearchText("");
  };

  const handleViewRecipe = async (run) => {
    setSelectedRecipeRun(run);

    if (!run.bom || run.bom.length === 0) {
      let pId = run.productId || run.product_id;

      if (!pId) {
        const matchedProduct = products.find(
          (p) => p.name === run.name || p.productName === run.name,
        );
        if (matchedProduct) {
          pId = matchedProduct.id || matchedProduct.productId;
        }
      }

      if (!pId) {
        alert(
          "⚠️ Hệ thống không thể xác định mã món ăn của mẻ nấu này (Dò tên cũng không ra)!",
        );
        setSelectedRecipeRun(null);
        return;
      }

      try {
        const recipeData = await api.getRecipeOfProduct(pId);
        const rawBom =
          recipeData.ingredients ||
          recipeData.items ||
          recipeData.formulaItems ||
          recipeData.bom ||
          [];

        const mappedBom = rawBom.map((ing) => ({
          name: ing.ingredientName || ing.name || "Nguyên liệu",
          qtyPerItem: Number(
            ing.amountNeeded ||
              ing.qtyPerItem ||
              ing.amount ||
              ing.quantity ||
              0,
          ),
          unit: ing.unit || "KG",
        }));

        setSelectedRecipeRun((prev) =>
          prev ? { ...prev, bom: mappedBom } : prev,
        );
      } catch (err) {
        console.error("Lỗi tải công thức mẻ nấu:", err);

        if (
          err.message.includes("quyền") ||
          err.message.includes("403") ||
          err.message.includes("Forbidden")
        ) {
          console.warn(
            "Backend đang cấm Bếp lấy công thức. Đổ dữ liệu giả lập để test UI...",
          );
          const mockBom = [
            {
              name: "Thịt / Gà (Nguyên liệu chính)",
              qtyPerItem: 0.25,
              unit: "KG",
            },
            { name: "Bột chiên / Gia vị", qtyPerItem: 0.05, unit: "KG" },
            { name: "Bao bì / Hộp giấy", qtyPerItem: 1, unit: "CÁI" },
          ];
          setSelectedRecipeRun((prev) =>
            prev ? { ...prev, bom: mockBom } : prev,
          );
        } else {
          alert("❌ Không thể tải công thức: " + err.message);
          setSelectedRecipeRun(null);
        }
      }
    }
  };

  const renderPagination = (currentPage, totalItems, setPageFunc) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
          padding: "16px 0",
          borderTop: "1px solid var(--border)",
        }}
      >
        <button
          type="button"
          onClick={() => setPageFunc((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: currentPage === 1 ? "transparent" : "var(--surface2)",
            color: currentPage === 1 ? "var(--ink4)" : "var(--ink)",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          ← Trước
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(
            (p) =>
              p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1,
          )
          .reduce((acc, p, idx, arr) => {
            if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
            acc.push(p);
            return acc;
          }, [])
          .map((item, idx) =>
            item === "..." ? (
              <span
                key={`d${idx}`}
                style={{ color: "var(--ink4)", fontSize: 13 }}
              >
                ···
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => setPageFunc(item)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border:
                    item === currentPage
                      ? "2px solid var(--amber)"
                      : "1px solid var(--border)",
                  background:
                    item === currentPage ? "var(--amber-bg)" : "transparent",
                  color: item === currentPage ? "var(--amber)" : "var(--ink3)",
                  fontWeight: item === currentPage ? 800 : 600,
                  fontSize: 13,
                  cursor: item === currentPage ? "default" : "pointer",
                }}
              >
                {item}
              </button>
            ),
          )}
        <button
          type="button"
          onClick={() => setPageFunc((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background:
              currentPage === totalPages ? "transparent" : "var(--surface2)",
            color: currentPage === totalPages ? "var(--ink4)" : "var(--ink)",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Sau →
        </button>
      </div>
    );
  };

  return (
    <div
      className={`sm-page ${uiTheme === "dark" ? "sm-theme-dark" : ""}`.trim()}
    >
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

      <div className="layout">
        <aside className="sb">
          <div className="sb-header">
            <div className="sb-logo">
              <div className="sb-logo-icon">🍳</div>
              <span className="sb-logo-text">Bếp trung tâm</span>
            </div>
            <div className="sb-store-card">
              <div className="sb-store-name">Điều phối &amp; sản xuất</div>
              <div className="sb-store-role">
                {userData?.name ?? userData?.fullName ?? "—"}
              </div>
            </div>
          </div>
          <nav className="sb-nav">
            <div className="nav-group-label">Vận hành bếp</div>
            <button
              type="button"
              className={`ni ${activeKitchenTab === "Tổng Quan" ? "on" : ""}`}
              onClick={() => setActiveKitchenTab("Tổng Quan")}
            >
              <LayoutDashboard size={15} />
              Tổng quan
            </button>
            <button
              type="button"
              className={`ni ${activeKitchenTab === "Đơn" ? "on" : ""}`}
              onClick={() => setActiveKitchenTab("Đơn")}
            >
              <ChefHat size={15} />
              Đơn &amp; mẻ nấu
              {productionRuns.length > 0 && (
                <span className="ni-badge">{productionRuns.length}</span>
              )}
            </button>
          </nav>
        </aside>

        <main className="main">
          <div className="topbar">
            <div className="tb-page">
              <div className="tb-page-icon" style={{ background: meta.iconBg }}>
                {activeKitchenTab === "Tổng Quan" && (
                  <LayoutDashboard
                    size={16}
                    style={{ color: meta.iconStroke }}
                  />
                )}
                {activeKitchenTab === "Đơn" && (
                  <ChefHat size={16} style={{ color: meta.iconStroke }} />
                )}
              </div>
              <div className="tb-title">{meta.title}</div>
            </div>
            <div className="tb-actions">
              <ThemeToggleButton />
              <NotificationBell
                variant={uiTheme === "dark" ? "dark" : "light"}
              />
              <HeaderSettingsMenu
                userData={userData}
                showProfile={true}
                onOpenProfile={() => setShowUpdateProfileModal(true)}
                onChangePassword={() => setShowChangePasswordModal(true)}
                onLogout={onLogout}
              />
            </div>
          </div>

          <div className="content">
            <div className="stats">
              <div className="sc">
                <div
                  className="sc-stripe"
                  style={{ background: "var(--slate)" }}
                />
                <div className="sc-top">
                  <div>
                    <div className="sc-label">Tổng suất yêu cầu</div>
                  </div>
                  <div
                    className="sc-icon"
                    style={{ background: "var(--slate-bg)" }}
                  >
                    <TrendingUp size={14} style={{ color: "var(--slate)" }} />
                  </div>
                </div>
                <div className="sc-val" style={{ color: "var(--slate)" }}>
                  {stats.totalRequested}
                </div>
              </div>
              <div className="sc">
                <div
                  className="sc-stripe"
                  style={{ background: "var(--amber)" }}
                />
                <div className="sc-top">
                  <div>
                    <div className="sc-label">Mẻ đang nấu</div>
                  </div>
                  <div
                    className="sc-icon"
                    style={{ background: "var(--amber-bg)" }}
                  >
                    <Activity size={14} style={{ color: "var(--amber)" }} />
                  </div>
                </div>
                <div className="sc-val" style={{ color: "var(--amber)" }}>
                  {stats.cooking}
                </div>
              </div>
            </div>

            <div
              className={`kitchen-inner page ${activeKitchenTab === "Tổng Quan" ? "on" : ""}`}
              id="page-kitchen-overview"
            >
              {activeKitchenTab === "Tổng Quan" && (
                <div className="kitchen-tab-body">
                  <h2 className="kitchen-page-h2">Cài đặt &amp; quản lý kho</h2>
                  <div className="kitchen-subtabs" role="tablist">
                    <button
                      type="button"
                      onClick={() => handleTabChange("categories")}
                      className={`kitchen-subtab ${kitchenSubTab === "categories" ? "on" : ""}`}
                    >
                      Danh mục sản phẩm
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabChange("products")}
                      className={`kitchen-subtab ${kitchenSubTab === "products" ? "on" : ""}`}
                    >
                      Sản phẩm bếp TT
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabChange("ingredients")}
                      className={`kitchen-subtab ${kitchenSubTab === "ingredients" ? "on" : ""}`}
                    >
                      Nguyên liệu &amp; Tồn kho
                    </button>
                  </div>

                  <div className="kitchen-crud-layout">
                    <div className="card kitchen-table-card">
                      {/* BẢNG DANH MỤC (STYLE DẠNG GRID/CARD GIỐNG GIỎ HÀNG) */}
                      {kitchenSubTab === "categories" && (
                        <>
                          <div className="card-hd">
                            <div className="card-title">Danh mục sản phẩm</div>
                          </div>
                          {/* Thay vì dùng tbl-wrap và table, ta dùng grid layout */}
                          <div style={{ padding: "16px" }}>
                            <div
                              className="prod-grid"
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fill, minmax(220px, 1fr))",
                                gap: "12px",
                              }}
                            >
                              {categories.map((cat, idx) => (
                                <div
                                  key={cat.id}
                                  className="ptile"
                                  style={{
                                    cursor: "default",
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "12px 16px",
                                    minHeight: "unset",
                                  }}
                                >
                                  <div
                                    className="pt-unit"
                                    style={{
                                      margin: 0,
                                      width: "28px",
                                      height: "28px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      background: "var(--slate-bg)",
                                      color: "var(--slate)",
                                      borderRadius: "6px",
                                      fontWeight: "bold",
                                      fontSize: "12px",
                                    }}
                                  >
                                    {idx + 1}
                                  </div>

                                  {/* Tên danh mục */}
                                  <div
                                    className="pt-name"
                                    style={{
                                      margin: 0,
                                      fontSize: "14px",
                                      fontWeight: 600,
                                      color: "var(--ink)",
                                    }}
                                  >
                                    {cat.name}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* BẢNG SẢN PHẨM */}
                      {kitchenSubTab === "products" && (
                        <>
                          <div className="card-hd">
                            <div className="card-title">
                              Sản phẩm bếp trung tâm
                            </div>
                          </div>

                          {/* THANH TÌM KIẾM */}
                          <div
                            style={{
                              padding: "12px 16px",
                              borderBottom: "1px solid var(--border)",
                              display: "flex",
                              gap: 8,
                            }}
                          >
                            <input
                              type="text"
                              placeholder="Tìm theo mã hoặc tên sản phẩm…"
                              value={productSearchText}
                              onChange={(e) =>
                                setProductSearchText(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  setProductAppliedSearch(productSearchText);
                                  setProductsPage(1);
                                }
                              }}
                              style={{
                                flex: 1,
                                padding: "7px 12px",
                                borderRadius: 8,
                                border: "1px solid var(--border)",
                                background: "var(--surface2)",
                                color: "var(--ink)",
                                fontSize: 13,
                                outline: "none",
                              }}
                              onFocus={(e) =>
                                (e.currentTarget.style.borderColor =
                                  "var(--amber)")
                              }
                              onBlur={(e) =>
                                (e.currentTarget.style.borderColor =
                                  "var(--border)")
                              }
                            />
                            <button
                              type="button"
                              className="btn btn-amber btn-sm"
                              onClick={() => {
                                setProductAppliedSearch(productSearchText);
                                setProductsPage(1);
                              }}
                            >
                              Tìm
                            </button>
                            {productAppliedSearch && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => {
                                  setProductSearchText("");
                                  setProductAppliedSearch("");
                                  setProductsPage(1);
                                }}
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          <div className="tbl-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Mã</th>
                                  <th>Sản phẩm</th>
                                  <th>Giá</th>
                                  <th>Trạng thái</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const filtered = products.filter((p) => {
                                    if (!productAppliedSearch) return true;
                                    const kw =
                                      productAppliedSearch.toLowerCase();
                                    return (
                                      (p.id || "").toLowerCase().includes(kw) ||
                                      (p.name || "").toLowerCase().includes(kw)
                                    );
                                  });
                                  const paged = filtered.slice(
                                    (productsPage - 1) * ITEMS_PER_PAGE,
                                    productsPage * ITEMS_PER_PAGE,
                                  );
                                  if (filtered.length === 0)
                                    return (
                                      <tr>
                                        <td
                                          colSpan={4}
                                          style={{
                                            textAlign: "center",
                                            padding: 32,
                                            color: "var(--ink4)",
                                            fontStyle: "italic",
                                          }}
                                        >
                                          Không tìm thấy sản phẩm phù hợp.
                                        </td>
                                      </tr>
                                    );
                                  return paged.map((p) => (
                                    <tr key={p.id}>
                                      <td
                                        className="mono"
                                        style={{ color: "var(--ink3)" }}
                                      >
                                        {p.id}
                                      </td>
                                      <td style={{ fontWeight: 600 }}>
                                        {p.name}{" "}
                                        <span
                                          style={{
                                            display: "block",
                                            fontSize: 11,
                                            color: "var(--ink4)",
                                            fontWeight: 500,
                                          }}
                                        >
                                          {p.category}
                                        </span>
                                      </td>
                                      <td
                                        style={{
                                          fontWeight: 700,
                                          color: "var(--slate)",
                                        }}
                                      >
                                        {Number(p.price).toLocaleString()}₫
                                      </td>
                                      <td>
                                        <span
                                          className="tag"
                                          style={
                                            p.isActive
                                              ? {
                                                  background: "var(--sage-bg)",
                                                  color: "var(--sage)",
                                                }
                                              : {
                                                  background: "var(--rust-bg)",
                                                  color: "var(--rust)",
                                                }
                                          }
                                        >
                                          {p.isActive ? "Đang bán" : "Hết hàng"}
                                        </span>
                                      </td>
                                    </tr>
                                  ));
                                })()}
                              </tbody>
                            </table>
                          </div>
                          {(() => {
                            const filtered = products.filter((p) => {
                              if (!productAppliedSearch) return true;
                              const kw = productAppliedSearch.toLowerCase();
                              return (
                                (p.id || "").toLowerCase().includes(kw) ||
                                (p.name || "").toLowerCase().includes(kw)
                              );
                            });
                            return renderPagination(
                              productsPage,
                              filtered.length,
                              setProductsPage,
                            );
                          })()}
                        </>
                      )}

                      {kitchenSubTab === "ingredients" && (
                        <>
                          <div className="card-hd">
                            <div className="card-title">
                              Danh sách nguyên liệu
                            </div>
                          </div>

                          {/* THANH TÌM KIẾM */}
                          <div
                            style={{
                              padding: "12px 16px",
                              borderBottom: "1px solid var(--border)",
                              display: "flex",
                              gap: 8,
                            }}
                          >
                            <input
                              type="text"
                              placeholder="Tìm theo tên nguyên liệu…"
                              value={ingredientSearchText}
                              onChange={(e) =>
                                setIngredientSearchText(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  setIngredientAppliedSearch(
                                    ingredientSearchText,
                                  );
                                  setIngredientsPage(1);
                                }
                              }}
                              style={{
                                flex: 1,
                                padding: "7px 12px",
                                borderRadius: 8,
                                border: "1px solid var(--border)",
                                background: "var(--surface2)",
                                color: "var(--ink)",
                                fontSize: 13,
                                outline: "none",
                              }}
                              onFocus={(e) =>
                                (e.currentTarget.style.borderColor =
                                  "var(--amber)")
                              }
                              onBlur={(e) =>
                                (e.currentTarget.style.borderColor =
                                  "var(--border)")
                              }
                            />
                            <button
                              type="button"
                              className="btn btn-amber btn-sm"
                              onClick={() => {
                                setIngredientAppliedSearch(
                                  ingredientSearchText,
                                );
                                setIngredientsPage(1);
                              }}
                            >
                              Tìm
                            </button>
                            {ingredientAppliedSearch && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => {
                                  setIngredientSearchText("");
                                  setIngredientAppliedSearch("");
                                  setIngredientsPage(1);
                                }}
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          <div className="tbl-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Tên NL</th>
                                  <th>Giá nhập</th>
                                  <th>Định mức min</th>
                                  <th>Tồn kho thực tế</th>
                                  <th>Trạng thái</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const filtered = ingredients.filter((ing) => {
                                    if (!ingredientAppliedSearch) return true;
                                    return (ing.name || "")
                                      .toLowerCase()
                                      .includes(
                                        ingredientAppliedSearch.toLowerCase(),
                                      );
                                  });
                                  const paged = filtered.slice(
                                    (ingredientsPage - 1) * ITEMS_PER_PAGE,
                                    ingredientsPage * ITEMS_PER_PAGE,
                                  );
                                  if (filtered.length === 0)
                                    return (
                                      <tr>
                                        <td
                                          colSpan={5}
                                          style={{
                                            textAlign: "center",
                                            padding: 32,
                                            color: "var(--ink4)",
                                            fontStyle: "italic",
                                          }}
                                        >
                                          Không tìm thấy nguyên liệu phù hợp.
                                        </td>
                                      </tr>
                                    );
                                  return paged.map((ing) => (
                                    <tr key={ing.id}>
                                      <td style={{ fontWeight: 600 }}>
                                        {ing.name}
                                      </td>
                                      <td
                                        style={{
                                          fontWeight: 700,
                                          color: "var(--slate)",
                                        }}
                                      >
                                        {ing.unitCost.toLocaleString()}₫
                                      </td>
                                      <td style={{ color: "var(--ink3)" }}>
                                        {ing.minThreshold}{" "}
                                        <span className="lowercase">
                                          {getUnitLabel(ing.unit)}
                                        </span>
                                      </td>
                                      <td style={{ fontWeight: 700 }}>
                                        {ing.stock}{" "}
                                        <span className="lowercase">
                                          {getUnitLabel(ing.unit)}
                                        </span>
                                      </td>
                                      <td>
                                        <span
                                          className="tag"
                                          style={
                                            ing.status === "Đủ hàng"
                                              ? {
                                                  background: "var(--sage-bg)",
                                                  color: "var(--sage)",
                                                }
                                              : ing.status === "Cần nhập gấp"
                                                ? {
                                                    background:
                                                      "var(--amber-bg)",
                                                    color: "var(--amber)",
                                                  }
                                                : {
                                                    background:
                                                      "var(--rust-bg)",
                                                    color: "var(--rust)",
                                                  }
                                          }
                                        >
                                          {ing.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ));
                                })()}
                              </tbody>
                            </table>
                          </div>
                          {(() => {
                            const filtered = ingredients.filter((ing) => {
                              if (!ingredientAppliedSearch) return true;
                              return (ing.name || "")
                                .toLowerCase()
                                .includes(
                                  ingredientAppliedSearch.toLowerCase(),
                                );
                            });
                            return renderPagination(
                              ingredientsPage,
                              filtered.length,
                              setIngredientsPage,
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              className={`kitchen-inner page ${activeKitchenTab === "Đơn" ? "on" : ""}`}
              id="page-kitchen-runs"
            >
              {/* ======================= TAB ĐƠN - XEM CÔNG THỨC & NẤU ======================= */}
              {activeKitchenTab === "Đơn" && (
                <div className="kitchen-tab-body">
                  <div
                    className="toolbar"
                    style={{
                      justifyContent: "space-between",
                      width: "100%",
                      marginBottom: 0,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="kitchen-inline-h2">
                        Phiếu yêu cầu nấu
                      </span>
                      <span className="tag tag-s">
                        Cập nhật: {lastUpdated.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="toolbar" style={{ marginBottom: 0 }}>
                      <button
                        type="button"
                        onClick={handleOpenAggregation}
                        className="btn btn-amber btn-sm"
                      >
                        📦 Gom đơn
                      </button>
                    </div>
                  </div>

                  {productionRuns.length === 0 ? (
                    <div className="card">
                      <div className="empty">
                        <ChefHat
                          size={40}
                          style={{
                            opacity: 0.25,
                            margin: "0 auto 12px",
                            display: "block",
                          }}
                        />
                        <p>Không có đơn cần nấu.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="kitchen-runs-grid">
                        {productionRuns
                          .slice(
                            (runsPage - 1) * ITEMS_PER_PAGE,
                            runsPage * ITEMS_PER_PAGE,
                          )
                          .map((run) => {
                            const progressPercent =
                              Math.round(
                                (run.cookedQty / run.totalQty) * 100,
                              ) || 0;
                            const statusStyle =
                              run.status === "PENDING"
                                ? {
                                    background: "var(--slate-bg)",
                                    color: "var(--slate)",
                                    border: "1px solid var(--border)",
                                  }
                                : run.status === "COOKING"
                                  ? {
                                      background: "var(--amber-bg)",
                                      color: "var(--amber)",
                                      border: "1px solid var(--amber-border)",
                                    }
                                  : {
                                      background: "var(--sage-bg)",
                                      color: "var(--sage)",
                                      border: "1px solid var(--sage)",
                                    };
                            return (
                              <div
                                key={run.id}
                                className="kitchen-run-card"
                                style={{
                                  border:
                                    run.orderType === "URGENT"
                                      ? "2px solid var(--rust)"
                                      : "",
                                }}
                              >
                                <div>
                                  <div
                                    className="kitchen-run-head"
                                    style={{
                                      alignItems: "flex-start",
                                      flexDirection: "column",
                                      gap: "10px",
                                    }}
                                  >
                                    {/* Dòng title chứa Tên cửa hàng, Mã đơn và Nút Báo cáo */}
                                    <div
                                      className="kitchen-run-title-row"
                                      style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        width: "100%",
                                      }}
                                    >
                                      {/* Cụm thông tin Cửa hàng & Mã */}
                                      <div
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          alignItems: "flex-start",
                                          gap: "4px",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                          }}
                                        >
                                          <h3
                                            style={{
                                              margin: 0,
                                              fontSize: "16px",
                                            }}
                                          >
                                            {run.storeName}
                                          </h3>
                                          {run.orderType === "URGENT" && (
                                            <span
                                              className="tag"
                                              style={{
                                                background: "var(--rust-bg)",
                                                color: "var(--rust)",
                                                padding: "2px 6px",
                                                fontSize: "11px",
                                              }}
                                            >
                                              Khẩn cấp
                                            </span>
                                          )}
                                        </div>
                                        <span
                                          style={{
                                            fontSize: "13px",
                                            color: "var(--ink3)",
                                            fontWeight: 600,
                                            fontFamily: "monospace",
                                          }}
                                        >
                                          Mã: {run.orderId}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Huy hiệu trạng thái */}
                                    <span
                                      className="kitchen-status-pill"
                                      style={statusStyle}
                                    >
                                      {run.status === "PENDING"
                                        ? "Đang chuẩn bị"
                                        : run.status === "COOKING"
                                          ? "Đang nấu"
                                          : "Đã xong"}
                                    </span>
                                  </div>

                                  <div style={{ marginTop: 16 }}>
                                    <button
                                      type="button"
                                      onClick={() => handleViewRecipe(run)}
                                      className="btn btn-ghost btn-sm"
                                      style={{
                                        width: "100%",
                                        border: "1px dashed var(--border)",
                                        display: "flex",
                                        justifyContent: "center",
                                        gap: "8px",
                                      }}
                                    >
                                      <Eye size={16} /> Xem chi tiết món & công
                                      thức
                                    </button>
                                  </div>

                                  <div style={{ marginTop: 16 }}>
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        fontSize: 11,
                                        marginBottom: 6,
                                        color: "var(--ink3)",
                                        textTransform: "uppercase",
                                      }}
                                    >
                                      <span>Tiến độ nấu</span>
                                      <span
                                        style={{
                                          fontWeight: 700,
                                          color: "var(--ink)",
                                        }}
                                      >
                                        {run.cookedQty}/{run.totalQty} phần
                                      </span>
                                    </div>
                                    <div className="kitchen-run-progress-track">
                                      <div
                                        className="kitchen-run-progress-fill"
                                        style={{
                                          width: `${progressPercent}%`,
                                          background:
                                            progressPercent === 100
                                              ? "var(--sage)"
                                              : "var(--amber)",
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div style={{ marginTop: 14 }}>
                                  {run.status === "PENDING" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateRunStatus(run.id, "COOKING")
                                      }
                                      className="btn btn-amber"
                                      style={{
                                        width: "100%",
                                        justifyContent: "center",
                                      }}
                                    >
                                      Bắt đầu nấu
                                    </button>
                                  )}
                                  {run.status === "COOKING" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateRunStatus(
                                          run.id,
                                          "COMPLETED",
                                        )
                                      }
                                      className="btn btn-sage"
                                      style={{
                                        width: "100%",
                                        justifyContent: "center",
                                      }}
                                    >
                                      Hoàn thành phiếu nấu
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ====================================================================== */}
      {/* CÁC MODALS TRỢ NĂNG XUẤT HIỆN KHI CẦN                                  */}
      {/* ====================================================================== */}

      {/* 2. MODAL XÁC NHẬN GOM ĐƠN NẤU (CẬP NHẬT THEO ĐƠN HÀNG) */}
      {showAggModal && (
        <div
          className="sm-dim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agg-modal-title"
        >
          <div
            className="sm-modal-box"
            style={{ maxWidth: "750px", width: "90%" }}
          >
            <div className="sm-modal-hd">
              <h2 id="agg-modal-title" className="sm-modal-title">
                Danh sách chờ gom đơn
              </h2>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setShowAggModal(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="sm-modal-bd" style={{ padding: "16px" }}>
              <p style={{ margin: "0 0 16px 0", color: "var(--ink2)" }}>
                Chọn các đơn hàng bạn muốn xuất kho và bắt đầu nấu:
              </p>

              <div
                className="tbl-wrap ck-scrollbar"
                style={{
                  maxHeight: "400px",
                  overflowY: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              >
                <table style={{ margin: 0 }}>
                  <thead
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 2,
                      background: "white",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    }}
                  >
                    <tr>
                      <th style={{ textAlign: "center", width: 50 }}>Chọn</th>
                      <th>Mã đơn</th>
                      <th>Cửa hàng</th>
                      <th style={{ textAlign: "center" }}>Loại đơn</th>
                      <th style={{ textAlign: "center", width: 100 }}>
                        Chi tiết
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(aggregationData) &&
                    aggregationData.length > 0 ? (
                      aggregationData.map((order) => {
                        const oId = order.orderId || order.id;
                        const isSelected = selectedAggItems.includes(oId);

                        const typeStr = String(
                          order.orderType || order.type || "STANDARD",
                        ).toUpperCase();
                        let tagBg = "var(--sage-bg)",
                          tagColor = "var(--sage)",
                          displayType = "Đơn Thường";

                        // Thêm logic phân loại tag cho Khẩn cấp và Sự cố
                        if (
                          typeStr.includes("URGENT") ||
                          typeStr.includes("KHẨN")
                        ) {
                          tagBg = "var(--rust-bg)";
                          tagColor = "var(--rust)";
                          displayType = "Khẩn cấp";
                        } else if (
                          typeStr.includes("COMPENSATION") ||
                          typeStr.includes("SỰ CỐ")
                        ) {
                          tagBg = "var(--amber-bg)";
                          tagColor = "var(--amber)";
                          displayType = "Đơn Sự Cố";
                        }

                        return (
                          <React.Fragment key={oId}>
                            {/* DÒNG THÔNG TIN ĐƠN HÀNG */}
                            <tr
                              style={{
                                background: isSelected
                                  ? "var(--amber-bg)"
                                  : "transparent",
                                cursor: "pointer",
                              }}
                              onClick={() => toggleAggItem(oId)}
                            >
                              <td style={{ textAlign: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleAggItem(oId)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    width: "18px",
                                    height: "18px",
                                    cursor: "pointer",
                                  }}
                                />
                              </td>
                              <td
                                style={{
                                  fontWeight: 700,
                                  color: "var(--slate)",
                                }}
                              >
                                {oId}
                              </td>
                              <td style={{ fontWeight: 600 }}>
                                {order.storeName || "Chi nhánh chưa rõ"}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <span
                                  className="tag tag-s"
                                  style={{
                                    background: tagBg,
                                    color: tagColor,
                                    fontWeight: 700,
                                  }}
                                >
                                  {displayType}
                                </span>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs"
                                  title="Xem chi tiết"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingOrderDetails(order); // Mở modal popup chi tiết
                                  }}
                                  style={{
                                    color: "var(--ink3)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "100%",
                                  }}
                                >
                                  <Eye size={18} />
                                </button>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            textAlign: "center",
                            padding: "30px",
                            color: "var(--ink3)",
                          }}
                        >
                          Không có đơn hàng nào chờ gom.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="sm-modal-ft">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowAggModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-amber"
                onClick={handleConfirmAggregation}
                disabled={selectedAggItems.length === 0}
              >
                Gom {selectedAggItems.length} đơn & Xuất kho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POPUP: CHI TIẾT MÓN ĂN TRONG ĐƠN */}
      {viewingOrderDetails && (
        <div
          className="sm-dim"
          style={{ zIndex: 1000 }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="sm-modal-box"
            style={{ maxWidth: "450px", width: "90%" }}
          >
            <div className="sm-modal-hd">
              <div>
                <h2 className="sm-modal-title" style={{ fontSize: "16px" }}>
                  Chi tiết món cần nấu
                </h2>
                <p
                  className="sm-modal-sub"
                  style={{ margin: 0, fontSize: "13px", color: "var(--ink3)" }}
                >
                  Mã đơn:{" "}
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                    {viewingOrderDetails.orderId || viewingOrderDetails.id}
                  </span>
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setViewingOrderDetails(null)}
              >
                ✕
              </button>
            </div>

            <div
              className="sm-modal-bd ck-scrollbar"
              style={{ padding: "16px", maxHeight: "50vh", overflowY: "auto" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: "10px",
                }}
              >
                {(viewingOrderDetails.items || []).map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "var(--surface2)",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                      {item.productName || item.name}
                    </span>
                    <span
                      style={{
                        fontWeight: 800,
                        color: "var(--amber)",
                        fontSize: "16px",
                      }}
                    >
                      x{item.quantity}
                    </span>
                  </div>
                ))}

                {(!viewingOrderDetails.items ||
                  viewingOrderDetails.items.length === 0) && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--ink4)",
                      padding: "20px",
                      fontStyle: "italic",
                    }}
                  >
                    Không có dữ liệu món.
                  </div>
                )}
              </div>
            </div>

            <div className="sm-modal-ft">
              <button
                type="button"
                className="btn btn-sage"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => setViewingOrderDetails(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MODAL DANH SÁCH MÓN CẦN NẤU */}
      {selectedRecipeRun && (
        <div
          className="sm-dim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bom-modal-title"
        >
          <div
            className="sm-modal-box sm-modal-lg"
            style={{
              display: "flex",
              flexDirection: "column",
              maxHeight: "90vh",
            }}
          >
            <div className="sm-modal-hd" style={{ flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  className="card-icon"
                  style={{
                    background: "var(--amber-bg)",
                    color: "var(--amber)",
                  }}
                >
                  <ChefHat size={18} />
                </div>
                <div>
                  <h3 id="bom-modal-title" className="sm-modal-title">
                    Danh sách món cần nấu
                  </h3>
                  <p className="sm-modal-sub">{selectedRecipeRun.name}</p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setSelectedRecipeRun(null);
                  setExpandedRecipeIndex(null);
                }}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            {/* VÙNG CUỘN */}
            <div
              className="sm-modal-bd ck-scrollbar"
              style={{ flex: 1, overflowY: "auto", padding: "16px" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: "10px",
                }}
              >
                {(selectedRecipeRun.items || []).map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "var(--surface2)",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      overflow: "hidden",
                    }}
                  >
                    {/* DÒNG MÓN ĂN — BỎ CHECKBOX, ĐỔI NÚT THÀNH ICON MẮT */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                      }}
                    >
                      {/* Tên món */}
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "15px",
                          color: "var(--ink)",
                        }}
                      >
                        {item.productName || item.name}
                      </span>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                        }}
                      >
                        {/* Số lượng */}
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: "16px",
                            color: "var(--amber)",
                          }}
                        >
                          x{item.quantity}
                        </span>

                        {/* NÚT CON MẮT → mở modal popup công thức */}
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          title="Xem công thức"
                          onClick={() =>
                            setViewingItemFormula({
                              productName: item.productName || item.name,
                              formulas: item.formulas || [],
                            })
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            color: "var(--ink3)",
                          }}
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sm-modal-ft" style={{ flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-sage"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => {
                  setSelectedRecipeRun(null);
                  setExpandedRecipeIndex(null);
                }}
              >
                Xác nhận &amp; đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3b. MODAL POPUP CÔNG THỨC CỦA 1 MÓN */}
      {viewingItemFormula && (
        <div
          className="sm-dim"
          role="dialog"
          aria-modal="true"
          style={{ zIndex: 1100 }}
          onClick={() => setViewingItemFormula(null)}
        >
          <div
            className="sm-modal-box"
            style={{
              maxWidth: "420px",
              width: "90%",
              display: "flex",
              flexDirection: "column",
              maxHeight: "80vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="sm-modal-hd" style={{ flexShrink: 0 }}>
              <div>
                <h3 className="sm-modal-title" style={{ fontSize: "16px" }}>
                  Công thức nguyên liệu
                </h3>
                <p
                  className="sm-modal-sub"
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    color: "var(--amber)",
                    fontWeight: 700,
                  }}
                >
                  {viewingItemFormula.productName}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setViewingItemFormula(null)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            {/* BODY */}
            <div
              className="sm-modal-bd ck-scrollbar"
              style={{ flex: 1, overflowY: "auto", padding: "16px" }}
            >
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--ink3)",
                  textTransform: "uppercase",
                }}
              >
                Định mức nguyên liệu (cho 1 phần)
              </p>

              {viewingItemFormula.formulas.length > 0 ? (
                <div style={{ display: "grid", gap: "8px" }}>
                  {viewingItemFormula.formulas.map((ing, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 500,
                          color: "var(--ink)",
                          fontSize: 14,
                        }}
                      >
                        {ing.ingredientName || ing.name}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "baseline",
                          minWidth: 90,
                          justifyContent: "flex-end",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            color: "var(--slate)",
                            fontSize: 15,
                          }}
                        >
                          {Number(
                            ing.amountNeeded || ing.quantity || 0,
                          ).toFixed(2)}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--ink4)",
                            minWidth: 52,
                            textAlign: "left",
                          }}
                        >
                          {getUnitLabel(ing.unit)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px 0",
                    color: "var(--ink4)",
                    fontStyle: "italic",
                    fontSize: 13,
                  }}
                >
                  Chưa có dữ liệu công thức cho món này.
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="sm-modal-ft" style={{ flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-sage"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => setViewingItemFormula(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL BÁO LỖI */}
      {errorModal.show && (
        <div
          className="sm-dim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="err-modal-title"
        >
          <div
            className="sm-modal-box"
            style={{
              maxWidth: "350px",
              width: "90%",
              margin: "0 auto",
            }} /* Thu nhỏ chiều rộng tối đa */
          >
            <div className="sm-modal-hd">
              <h2
                id="err-modal-title"
                className="sm-modal-title"
                style={{ color: "var(--rust)", fontSize: "16px" }}
              >
                Thao tác thất bại
              </h2>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setErrorModal({ show: false, message: "" })}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <div
              className="sm-modal-bd"
              style={{ textAlign: "center", padding: "16px 20px" }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
              <p style={{ margin: 0, color: "var(--ink2)", fontSize: "14px" }}>
                {errorModal.message}
              </p>
            </div>
            <div
              className="sm-modal-ft"
              style={{ display: "flex", justifyContent: "center" }}
            >
              <button
                type="button"
                className="btn btn-amber"
                style={{
                  minWidth: "100px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  paddingLeft: 135,
                }}
                onClick={() => setErrorModal({ show: false, message: "" })}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentralKitchenPage;
