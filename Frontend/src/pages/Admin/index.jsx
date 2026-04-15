import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Users,
  CheckCircle,
  Store,
  Shield,
  Plus,
  UserPlus,
  X,
  XCircle,
  Trash2,
  Search,
  Package,
  Clock,
  User,
  Megaphone,
  AlertTriangle,
  Info,
  Siren,
  Target,
  Pencil,
} from "../../components/icons/Icons";
import api from "../../services/api";
import ChangePasswordModal from "../../components/common/ChangePasswordModal";
import HeaderSettingsMenu from "../../components/common/HeaderSettingsMenu";
import NotificationBell from "../../components/common/NotificationBell";
import ThemeToggleButton from "../../components/common/ThemeToggleButton";
import { useUiTheme } from "../../context/UiThemeContext";
import { useUnits } from "../../context/UnitsContext";
import {
  ADMIN_TABS,
  ROLE_LABELS,
  ADMIN_ACCOUNT_ROLE_OPTIONS,
} from "../../constants";
import "../../styles/admin-theme.css";

const ADMIN_ACCOUNT_ROLE_VALUES = new Set(
  ADMIN_ACCOUNT_ROLE_OPTIONS.map((r) => r.value),
);

const BROADCAST_TITLE_MAX = 120;
const BROADCAST_MESSAGE_MAX = 500;

/** Lưới đối tượng nhận (theo thiết kế; mã gửi lên API). */
const BROADCAST_RECIPIENT_ROLES = [
  { value: "STORE_MANAGER", desc: "Quản Lý Cửa Hàng" },
  { value: "KITCHEN_MANAGER", desc: "Bếp" },
  { value: "STAFF", desc: "Quản Lý" },
  { value: "CUSTOMER", desc: "Điều Phối Viên" },
];

const BROADCAST_TYPE_CARDS = [
  { value: "INFO", label: "INFO", Icon: Info, tone: "info" },
  {
    value: "WARNING",
    label: "WARNING",
    Icon: AlertTriangle,
    tone: "warning",
  },
  { value: "URGENT", label: "URGENT", Icon: Siren, tone: "urgent" },
  { value: "SUCCESS", label: "SUCCESS", Icon: CheckCircle, tone: "success" },
];

function isAdminRoleUser(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return String(user.roleRaw ?? "").toUpperCase() === "ADMIN";
}

const AdminPage = ({ onLogout, userData }) => {
  const { uiTheme } = useUiTheme();
  const { labelFor, baseGrouped, salesGrouped, allGrouped } = useUnits();
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [adminTab, setAdminTab] = useState("accounts");
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [emptyStoreIds, setEmptyStoreIds] = useState(new Set());
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  /** Danh sách công thức từ GET /api/formulas — dùng đếm “có công thức” (getProducts thường không gắn ingredients). */
  const [formulaList, setFormulaList] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [accountFilter, setAccountFilter] = useState("all"); // 'all' | 'active' | 'inactive' | 'store'
  const [accountsList, setAccountsList] = useState([]); // list theo filter
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddStore, setShowAddStore] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailProductFormula, setDetailProductFormula] = useState([]);
  const [detailProductFormulaLoading, setDetailProductFormulaLoading] =
    useState(false);
  const [kitchenSubTab, setKitchenSubTab] = useState("products");
  const [productSearch, setProductSearch] = useState("");
  const [productCatFilter, setProductCatFilter] = useState("all");
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    role: "STORE_MANAGER",
    status: "active",
    employeeCode: "",
  });
  const [editingStore, setEditingStore] = useState(null);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [showSwapStoresModal, setShowSwapStoresModal] = useState(false);
  const [swapAccount1, setSwapAccount1] = useState("");
  const [swapAccount2, setSwapAccount2] = useState("");
  const [editAccountUser, setEditAccountUser] = useState(null);
  const [editAccountForm, setEditAccountForm] = useState({
    roleName: "",
    storeId: "",
    email: "",
  });
  const [newStore, setNewStore] = useState({
    name: "",
    address: "",
    phone: "",
  });
  const [assignManagerId, setAssignManagerId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newProduct, setNewProduct] = useState({
    productId: "",
    productName: "",
    categoryId: "",
    sellingPrice: "",
    baseUnit: "",
    isActive: true,
    ingredients: [],
  });
  const [storeListFilter, setStoreListFilter] = useState("all"); // 'all' | 'closed'
  // Nguyên liệu
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [detailIngredient, setDetailIngredient] = useState(null);
  const [ingredientForm, setIngredientForm] = useState({
    name: "",
    kitchenStock: "",
    unit: "",
    unitCost: "",
    minThreshold: "",
  });
  const [ingredientFilter, setIngredientFilter] = useState("all"); // 'all' | 'low' | 'ok'
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [ingredientDetailLoading, setIngredientDetailLoading] = useState(false);
  const [ingredientSubTab, setIngredientSubTab] = useState("stock"); // 'stock' | 'history'
  const [showImportModal, setShowImportModal] = useState(false);
  const [importForm, setImportForm] = useState({
    note: "",
    items: [{ ingredientId: "", unit: "", quantity: "", importPrice: "" }],
  });
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importHistoryList, setImportHistoryList] = useState([]);
  const [importHistoryLoading, setImportHistoryLoading] = useState(false);
  const [importHistoryExpandedId, setImportHistoryExpandedId] = useState(null);
  const [broadcastAllUsers, setBroadcastAllUsers] = useState(false);
  const [broadcastTargetRoles, setBroadcastTargetRoles] = useState([]);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState("WARNING");
  const [broadcastSubmitting, setBroadcastSubmitting] = useState(false);
  const [broadcastError, setBroadcastError] = useState(null);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const broadcastSuccessRef = useRef(null);

  const loadImportHistory = useCallback(async () => {
    setImportHistoryLoading(true);
    try {
      const data = await api.getImportHistory();
      const list = Array.isArray(data) ? data : [];
      list.sort(
        (a, b) => new Date(b.importDate || 0) - new Date(a.importDate || 0),
      );
      setImportHistoryList(list);
    } catch (err) {
      console.error("Lịch sử nhập hàng:", err);
      setImportHistoryList([]);
    } finally {
      setImportHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminTab === "ingredients" && ingredientSubTab === "history") {
      loadImportHistory();
    }
  }, [adminTab, ingredientSubTab, loadImportHistory]);

  const loadAccountsByFilter = async (filter) => {
    try {
      if (filter === "active") return await api.getActiveAccounts();
      if (filter === "inactive") return await api.getInactiveAccounts();
      const list = await api.getUsers();
      if (filter === "store") {
        return list.filter(
          (u) => u.role === "franchise" || u.roleRaw === "STORE_MANAGER",
        );
      }
      return list;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [u, s, c, p, ing, emptyStores, formulas] = await Promise.all([
          api.getUsers(),
          api.getStoresAll(),
          api.getCategories(),
          api.getProducts(),
          api.getIngredients(),
          api.getEmptyStores(),
          api.getManagerRecipes().catch(() => []),
        ]);
        setUsers(Array.isArray(u) ? u : []);
        setStores(Array.isArray(s) ? s : []);
        setCategories(Array.isArray(c) ? c : []);
        setProducts(Array.isArray(p) ? p : []);
        setFormulaList(Array.isArray(formulas) ? formulas : []);
        setIngredients(Array.isArray(ing) ? ing : []);
        const ids = new Set(
          (Array.isArray(emptyStores) ? emptyStores : []).map((es) =>
            String(es.storeId ?? es.id ?? ""),
          ),
        );
        setEmptyStoreIds(ids);
      } catch (err) {
        console.error("Admin load:", err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      const list = await loadAccountsByFilter(accountFilter);
      setAccountsList(Array.isArray(list) ? list : []);
    };
    load();
  }, [accountFilter]);

  const loadAdminData = async () => {
    try {
      const [u, s, c, p, ing, emptyStores, formulas] = await Promise.all([
        api.getUsers(),
        api.getStoresAll(),
        api.getCategories(),
        api.getProducts(),
        api.getIngredients(),
        api.getEmptyStores(),
        api.getManagerRecipes().catch(() => []),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setStores(Array.isArray(s) ? s : []);
      setCategories(Array.isArray(c) ? c : []);
      setProducts(Array.isArray(p) ? p : []);
      setFormulaList(Array.isArray(formulas) ? formulas : []);
      setIngredients(Array.isArray(ing) ? ing : []);
      const ids = new Set(
        (Array.isArray(emptyStores) ? emptyStores : []).map((es) =>
          String(es.storeId ?? es.id ?? ""),
        ),
      );
      setEmptyStoreIds(ids);
      const list = await loadAccountsByFilter(accountFilter);
      setAccountsList(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Admin load:", err);
    }
  };

  // --- Nguyên liệu: computed list & handlers ---
  const getIngredientStatus = (ing) => {
    const stock = Number(ing.kitchenStock) || 0;
    const min = Number(ing.minThreshold) || 0;
    if (stock <= 0) return "empty";
    if (min > 0 && stock <= min) return "low";
    return "ok";
  };
  const filteredIngredients = ingredients.filter((ing) => {
    const status = getIngredientStatus(ing);
    if (ingredientFilter === "low" && status !== "low") return false;
    if (ingredientFilter === "ok" && status !== "ok") return false;
    const q = (ingredientSearch || "").trim().toLowerCase();
    if (q && !(ing.name || "").toLowerCase().includes(q)) return false;
    return true;
  });
  const ingredientStats = {
    total: ingredients.length,
    low: ingredients.filter((i) => getIngredientStatus(i) === "low").length,
    empty: ingredients.filter((i) => getIngredientStatus(i) === "empty").length,
    totalValue: ingredients.reduce(
      (sum, i) =>
        sum + (Number(i.kitchenStock) || 0) * (Number(i.unitCost) || 0),
      0,
    ),
  };

  const handleCreateIngredient = async (e) => {
    e.preventDefault();
    try {
      await api.createIngredient({
        name: ingredientForm.name.trim(),
        kitchenStock: Number(ingredientForm.kitchenStock) || 0,
        unit: (ingredientForm.unit || "").trim().toUpperCase(),
        unitCost: Number(ingredientForm.unitCost) || 0,
        minThreshold: Number(ingredientForm.minThreshold) || 0,
      });
      setShowAddIngredient(false);
      setEditingIngredient(null);
      setIngredientForm({
        name: "",
        kitchenStock: "",
        unit: "",
        unitCost: "",
        minThreshold: "",
      });
      loadAdminData();
    } catch (err) {
      console.error("Create ingredient:", err);
    }
  };

  const handleUpdateIngredient = async (e) => {
    e.preventDefault();
    if (!editingIngredient?.ingredientId) return;
    try {
      await api.updateIngredient(editingIngredient.ingredientId, {
        name: ingredientForm.name.trim(),
        ingredientName: ingredientForm.name.trim(),
        unit: (ingredientForm.unit || "").trim().toUpperCase(),
        unitCost: Number(ingredientForm.unitCost) || 0,
        price: Number(ingredientForm.unitCost) || 0,
        kitchenStock: Number(ingredientForm.kitchenStock) || 0,
        stockQuantity: Number(ingredientForm.kitchenStock) || 0,
        minThreshold: Number(ingredientForm.minThreshold) || 0,
      });
      setShowAddIngredient(false);
      setEditingIngredient(null);
      setIngredientForm({
        name: "",
        kitchenStock: "",
        unit: "",
        unitCost: "",
        minThreshold: "",
      });
      loadAdminData();
    } catch (err) {
      console.error("Update ingredient:", err);
    }
  };

  const loadIngredientDetail = async (id) => {
    if (!id) return;
    setIngredientDetailLoading(true);
    setDetailIngredient(null);
    try {
      const data = await api.getIngredient(id);
      setDetailIngredient(data);
    } catch (err) {
      console.error("Ingredient detail:", err);
    } finally {
      setIngredientDetailLoading(false);
    }
  };

  const handleAddImportRow = () => {
    setImportForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { ingredientId: "", unit: "", quantity: "", importPrice: "" },
      ],
    }));
  };

  const handleRemoveImportRow = (index) => {
    setImportForm((prev) => ({
      ...prev,
      items:
        prev.items.length <= 1
          ? [{ ingredientId: "", unit: "", quantity: "", importPrice: "" }]
          : prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleImportRowChange = (index, field, value) => {
    setImportForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, [field]: value };
        if (field === "ingredientId") {
          const ing = ingredients.find(
            (x) => String(x.ingredientId ?? x.id) === String(value),
          );
          next.unit = ing?.unit != null ? String(ing.unit).trim() : "";
        }
        return next;
      }),
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
          const ing = ingredients.find(
            (x) => (x.ingredientId ?? x.id) === i.ingredientId,
          );
          return {
            ingredientId: i.ingredientId,
            unit: String(i.unit || ing?.unit || "KG")
              .trim()
              .toUpperCase(),
            quantity: Number(i.quantity) || 0,
            importPrice: Number(i.importPrice) || 0,
          };
        }),
      });
      setShowImportModal(false);
      setImportForm({
        note: "",
        items: [{ ingredientId: "", unit: "", quantity: "", importPrice: "" }],
      });
      loadAdminData();
      loadImportHistory();
    } catch (err) {
      console.error("Import inventory:", err);
    } finally {
      setImportSubmitting(false);
    }
  };

  const storeManagers = (users.length > 0 ? users : accountsList).filter(
    (u) => u.roleRaw === "STORE_MANAGER",
  );

  const storeManagersWithoutStore = (editingStoreId) => {
    const sid = String(editingStoreId ?? "");
    return storeManagers.filter((u) => {
      if (u.status !== "active") return false;
      const hasStore =
        (u.managedStores && String(u.managedStores).trim()) ||
        u.storeId ||
        (u.storeIds && u.storeIds.length > 0);
      if (!hasStore) return true;
      const accStoreIds = [u.storeId, ...(u.storeIds || [])]
        .filter(Boolean)
        .map(String);
      return sid && accStoreIds.includes(sid);
    });
  };

  /** Danh sách nhân viên cho ô chọn khi chỉnh sửa cửa hàng: luôn gồm nhân viên đang phụ trách cửa hàng đó (nếu có). */
  const storeManagerOptionsForEdit = (store) => {
    if (!store) return storeManagersWithoutStore("");
    const list = storeManagersWithoutStore(store.storeId ?? store.id);
    const current = getManagerAccountForStore(store);
    if (!current) return list;
    const currentId = String(
      current.accountId ?? current.id ?? current.userId ?? "",
    );
    const alreadyInList = list.some(
      (u) => String(u.accountId ?? u.id ?? u.userId ?? "") === currentId,
    );
    if (alreadyInList) return list;
    return [current, ...list];
  };

  const getManagerForStore = (store) => {
    const sid = String(store.storeId ?? store.id ?? "");
    if (emptyStoreIds.has(sid)) return "Chưa có";
    const accounts = users.length > 0 ? users : accountsList;
    const storeName = (store.name ?? "").trim();
    const manager = accounts.find((acc) => {
      if (acc.roleRaw !== "STORE_MANAGER") return false;
      const accStoreIds = [acc.storeId, ...(acc.storeIds || [])]
        .filter(Boolean)
        .map(String);
      if (accStoreIds.includes(sid)) return true;
      if (!storeName) return false;
      const accNames = [acc.managedStores, acc.storeName]
        .filter(Boolean)
        .flatMap((x) =>
          String(x)
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean),
        );
      return accNames.some((n) => n === storeName);
    });
    return manager ? (manager.name ?? manager.fullName ?? "—") : "Chưa có";
  };

  const getManagerAccountForStore = (store) => {
    const sid = String(store.storeId ?? store.id ?? "");
    if (emptyStoreIds.has(sid)) return null;
    const accounts = users.length > 0 ? users : accountsList;
    const storeName = (store.name ?? "").trim();
    return accounts.find((acc) => {
      if (acc.roleRaw !== "STORE_MANAGER") return false;
      const accStoreIds = [acc.storeId, ...(acc.storeIds || [])]
        .filter(Boolean)
        .map(String);
      if (accStoreIds.includes(sid)) return true;
      if (!storeName) return false;
      const accNames = [acc.managedStores, acc.storeName]
        .filter(Boolean)
        .flatMap((x) =>
          String(x)
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean),
        );
      return accNames.some((n) => n === storeName);
    });
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.name) {
      window.alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }
    if (!newUser.email || !newUser.email.trim()) {
      window.alert("Vui lòng nhập email!");
      return;
    }
    const emailTrim = newUser.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      window.alert("Email không đúng định dạng!");
      return;
    }
    const roleForApi = ADMIN_ACCOUNT_ROLE_VALUES.has(newUser.role)
      ? newUser.role
      : "KITCHEN_MANAGER";
    try {
      const existingUsers = await api.getUsers();
      if (existingUsers.find((u) => u.username === newUser.username)) {
        window.alert("Tên đăng nhập đã tồn tại!");
        return;
      }
      const msg = await api.createUser({
        username: newUser.username.trim(),
        password: newUser.password,
        email: emailTrim,
        fullName: newUser.name.trim(),
        employeeCode: newUser.employeeCode?.trim() || undefined,
        role: roleForApi,
      });
      await loadAdminData();
      setShowAddUser(false);
      setNewUser({
        username: "",
        password: "",
        name: "",
        email: "",
        role: "STORE_MANAGER",
        status: "active",
        employeeCode: "",
      });
      window.alert(
        typeof msg === "string"
          ? msg
          : "✅ Đăng ký thành công! Mã nhân viên đã được tạo.",
      );
    } catch (err) {
      window.alert("Lỗi: " + (err.message || "Không đăng ký được"));
    }
  };

  const handleToggleStatus = async (user) => {
    const accountId = user.accountId ?? user.id ?? user.userId;
    if (!accountId) {
      window.alert("Không xác định được mã tài khoản. Vui lòng tải lại trang.");
      return;
    }
    const newActive = user.status !== "active";
    try {
      await api.updateAccountStatus(accountId, newActive);
      await loadAdminData();
      window.alert(
        newActive ? "✅ Đã mở khóa tài khoản!" : "✅ Đã khóa tài khoản!",
      );
    } catch (err) {
      window.alert(
        "Lỗi khóa/mở khóa: " +
          (err?.message ||
            "Không cập nhật được. Kiểm tra quyền Admin hoặc API."),
      );
    }
  };

  const handleOpenEditAccount = (user) => {
    const roleRaw = user.roleRaw ?? user.role ?? "";
    const roleName = [
      "ADMIN",
      "MANAGER",
      "COORDINATOR",
      "KITCHEN_MANAGER",
      "STORE_MANAGER",
    ].includes(String(roleRaw).toUpperCase())
      ? String(roleRaw).toUpperCase()
      : "MANAGER";
    let resolvedStoreId = user.storeId ?? user.storeIds?.[0] ?? "";
    if (roleName === "STORE_MANAGER" && stores.length > 0) {
      const sid = user.storeId ?? user.storeIds?.[0];
      const matchByStoreId = sid
        ? stores.find((s) => String(s.storeId ?? s.id) === String(sid))
        : null;
      const matchByName =
        !matchByStoreId &&
        user.managedStores &&
        stores.find((s) => {
          const names = String(user.managedStores)
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          return names.some((n) => s.name && String(s.name).trim() === n);
        });
      resolvedStoreId = matchByStoreId
        ? String(matchByStoreId.storeId ?? matchByStoreId.id ?? "")
        : matchByName
          ? String(matchByName.storeId ?? matchByName.id ?? "")
          : sid
            ? String(sid)
            : "";
    }
    setEditAccountUser(user);
    setEditAccountForm({
      roleName,
      storeId: resolvedStoreId,
      email: user.email ?? "",
    });
    setShowEditAccountModal(true);
  };

  const handleEditAccountSubmit = async () => {
    if (!editAccountUser) return;
    const accountId =
      editAccountUser.accountId ?? editAccountUser.id ?? editAccountUser.userId;
    const { roleName, storeId, email } = editAccountForm;
    if (!isAdminRoleUser(editAccountUser) && !roleName?.trim()) {
      window.alert("Vui lòng chọn vai trò.");
      return;
    }
    const emailTrim = email?.trim();
    if (!emailTrim) {
      window.alert("Vui lòng nhập email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      window.alert("Email không đúng định dạng.");
      return;
    }
    try {
      if (!isAdminRoleUser(editAccountUser)) {
        await api.updateAccountRole(accountId, roleName.trim());
        if (roleName === "STORE_MANAGER" && storeId?.trim()) {
          await api.updateAccountStore(accountId, storeId.trim());
        }
      }
      await api.updateAccount(accountId, { email: emailTrim });
      window.alert("✅ Đã cập nhật thông tin!");
      setShowEditAccountModal(false);
      setEditAccountUser(null);
      setEditAccountForm({ roleName: "", storeId: "", email: "" });
      await loadAdminData();
    } catch (err) {
      window.alert(
        "Lỗi cập nhật: " +
          (err?.message ||
            "Không cập nhật được. Kiểm tra quyền Admin hoặc API."),
      );
    }
  };

  const storeManagersWithStore = (
    users.length > 0 ? users : accountsList
  ).filter(
    (u) =>
      u.status === "active" &&
      u.roleRaw === "STORE_MANAGER" &&
      (u.managedStores || u.storeId || u.storeIds?.[0]),
  );

  const handleSwapStores = async () => {
    if (!swapAccount1?.trim() || !swapAccount2?.trim()) {
      window.alert("Vui lòng chọn đủ 2 Quản lý cửa hàng.");
      return;
    }
    if (swapAccount1 === swapAccount2) {
      window.alert("Hai tài khoản phải khác nhau.");
      return;
    }
    try {
      await api.swapStores(swapAccount1.trim(), swapAccount2.trim());
      window.alert("✅ Đã hoán đổi cửa hàng thành công!");
      setShowSwapStoresModal(false);
      setSwapAccount1("");
      setSwapAccount2("");
      await loadAdminData();
    } catch (err) {
      window.alert(
        "Lỗi hoán đổi: " +
          (err?.message ||
            "Không thực hiện được. Kiểm tra quyền Admin hoặc API."),
      );
    }
  };

  const toggleBroadcastRole = (role) => {
    setBroadcastTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    setBroadcastError(null);
    setBroadcastSuccess(false);
    const title = broadcastTitle.trim();
    const message = broadcastMessage.trim();
    if (!title || !message) {
      setBroadcastError("Còn trống — cần cả tiêu đề lẫn nội dung để phát loa.");
      return;
    }
    const targetRoles = broadcastAllUsers ? [] : broadcastTargetRoles;
    if (!broadcastAllUsers && targetRoles.length === 0) {
      setBroadcastError(
        "Chưa có người nhận — bật phát toàn hệ thống hoặc chọn ít nhất một nhóm.",
      );
      return;
    }
    setBroadcastSubmitting(true);
    try {
      await api.broadcastNotification({
        targetRoles,
        title,
        message,
        type: broadcastType,
      });
      setBroadcastSuccess(true);
      // Xóa thông tin đã điền để sẵn sàng gửi lần tiếp theo
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastAllUsers(false);
      setBroadcastTargetRoles([]);
      setBroadcastType("WARNING");
      // Nhảy lên trên để thấy thông báo thành công
      window.setTimeout(() => {
        broadcastSuccessRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 0);
    } catch (err) {
      setBroadcastError(
        err?.message ||
          "Chưa gửi được — thử lại hoặc kiểm tra quyền Admin / API.",
      );
    } finally {
      setBroadcastSubmitting(false);
    }
  };

  const handleSaveStore = async () => {
    const { name, address, phone } = newStore;
    if (!name?.trim() || !address?.trim() || !phone?.trim()) {
      window.alert("Vui lòng điền đầy đủ tên, địa chỉ và điện thoại.");
      return;
    }
    const payload = {
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      type: "FRANCHISE",
    };
    try {
      if (editingStore) {
        const id = editingStore.storeId ?? editingStore.id;
        await api.updateStore(id, payload);
        if (assignManagerId?.trim()) {
          await api.assignStoreManager(id, assignManagerId.trim());
        }
        window.alert("✅ Cập nhật cửa hàng thành công!");
      } else {
        await api.createStore(payload);
        window.alert("✅ Tạo cửa hàng thành công!");
      }
      await loadAdminData();
      setShowAddStore(false);
      setEditingStore(null);
      setAssignManagerId("");
      setNewStore({ name: "", address: "", phone: "" });
    } catch (err) {
      window.alert(
        "Lỗi: " +
          (err.message ||
            (editingStore ? "Không cập nhật được" : "Không tạo được")),
      );
    }
  };

  const handleToggleStoreActive = async (store) => {
    const storeId = store.storeId ?? store.id;
    const newActive = store.isActive === false ? true : false;
    try {
      await api.updateStoreActive(storeId, newActive);
      setStores((prev) =>
        prev.map((s) =>
          String(s.storeId ?? s.id) === String(storeId)
            ? { ...s, isActive: newActive }
            : s,
        ),
      );
      window.alert(newActive ? "✅ Đã mở cửa hàng!" : "✅ Đã đóng cửa hàng!");
      await loadAdminData();
    } catch (err) {
      window.alert(
        "Lỗi: " + (err?.message || "Không cập nhật được trạng thái cửa hàng."),
      );
    }
  };

  const handleSaveCategory = async () => {
    const name = (
      editingCategory ? editingCategory.name : newCategoryName
    ).trim();
    const description =
      (editingCategory
        ? editingCategory.description
        : newCategoryDescription
      )?.trim() || "";
    if (!name) {
      window.alert("Vui lòng nhập tên danh mục.");
      return;
    }
    try {
      if (editingCategory) {
        setEditingCategory(null);
        window.alert("Chức năng sửa danh mục đang cập nhật.");
        setShowAddCategory(false);
        return;
      }
      await api.createCategory({ name, description });
      setNewCategoryName("");
      setNewCategoryDescription("");
      setShowAddCategory(false);
      await loadAdminData();
      window.alert("✅ Thêm danh mục thành công!");
    } catch (err) {
      window.alert("Lỗi: " + (err.message || "Không lưu được"));
    }
  };

  const handleSaveProduct = async () => {
    // Luôn đọc dữ liệu mới nhất từ newProduct (kể cả khi đang sửa),
    // vì toàn bộ input trong form đều đang ghi vào state newProduct.
    const p = newProduct;
    const productId = (p.productId || p.id || "").trim();
    const productName = (p.productName || p.name || "").trim();
    const rawCategoryId =
      p.categoryId ??
      categories.find((c) => c.name === p.category)?.id ??
      p.category;
    const categoryId =
      rawCategoryId !== "" && rawCategoryId != null
        ? Number(rawCategoryId)
        : null;
    const sellingPrice = Number(p.sellingPrice ?? p.price ?? 0);
    const baseUnit = (p.baseUnit || "").toString().trim();
    const ingredients = Array.isArray(p.ingredients)
      ? p.ingredients.filter((i) =>
          (i.ingredientId ?? i.id ?? "").toString().trim(),
        )
      : [];
    const payloadIngredients = ingredients
      .map((i) => ({
        ingredientId: String(i.ingredientId ?? i.id ?? "").trim(),
        amountNeeded: Number(i.amountNeeded ?? i.amount ?? 0),
      }))
      .filter((i) => i.ingredientId && i.amountNeeded > 0);

    if (!productName) {
      window.alert("Vui lòng nhập tên sản phẩm.");
      return;
    }
    if (!editingProduct && !productId) {
      window.alert("Vui lòng nhập mã sản phẩm (ví dụ: PROD_PHO_BO_8).");
      return;
    }
    if (
      categoryId == null ||
      (typeof categoryId === "number" && isNaN(categoryId))
    ) {
      window.alert("Vui lòng chọn danh mục.");
      return;
    }
    if (sellingPrice <= 0 || isNaN(sellingPrice)) {
      window.alert("Vui lòng nhập giá bán hợp lệ (số dương).");
      return;
    }
    const finalBaseUnit = (baseUnit || "").trim();
    if (!finalBaseUnit) {
      window.alert("Vui lòng chọn đơn vị bán.");
      return;
    }
    try {
      if (editingProduct) {
        const editId = editingProduct.id ?? editingProduct.productId;
        await api.updateProduct(editId, {
          productName,
          categoryId,
          sellingPrice,
          baseUnit: finalBaseUnit,
        });
        if (payloadIngredients.length > 0) {
          await api.upsertFormula({
            productId: String(editId),
            ingredients: payloadIngredients,
          });
        } else {
          try {
            await api.deleteFormula(editId);
          } catch (_) {}
        }
        setEditingProduct(null);
        setShowAddProduct(false);
        setNewProduct({
          productId: "",
          productName: "",
          categoryId: "",
          sellingPrice: "",
          baseUnit: "",
          isActive: true,
          ingredients: [
            {
              ingredientId: "",
              amountNeeded: 0.1,
              ingredientName: null,
              unit: null,
            },
          ],
        });
        await loadAdminData();
        window.alert("✅ Đã lưu thay đổi sản phẩm!");
        return;
      }
      await api.createProduct({
        productId,
        productName,
        categoryId,
        sellingPrice,
        baseUnit: finalBaseUnit,
        ingredients: payloadIngredients,
      });
      if (payloadIngredients.length > 0) {
        await api.upsertFormula({ productId, ingredients: payloadIngredients });
      }
      setShowAddProduct(false);
      setNewProduct({
        productId: "",
        productName: "",
        categoryId: "",
        sellingPrice: "",
        baseUnit: "",
        isActive: true,
        ingredients: [
          {
            ingredientId: "",
            amountNeeded: 0.1,
            ingredientName: null,
            unit: null,
          },
        ],
      });
      await loadAdminData();
      window.alert("✅ Thêm sản phẩm thành công!");
    } catch (err) {
      window.alert("Lỗi: " + (err?.message || "Không lưu được"));
    }
  };

  const getProductCategoryName = (p) =>
    p.category ||
    categories.find((c) => String(c.id) === String(p.categoryId))?.name ||
    "";
  const filteredProducts = (() => {
    const q = (productSearch || "").toLowerCase().trim();
    const list = products.filter((p) => {
      const name = (p.name || p.productName || "").toLowerCase();
      const id = (p.id || p.productId || "").toString().toLowerCase();
      const cat = getProductCategoryName(p);
      const matchSearch = !q || name.includes(q) || id.includes(q);
      const matchCat = productCatFilter === "all" || cat === productCatFilter;
      return matchSearch && matchCat;
    });
    return list;
  })();
  const productStats = (() => {
    const total = products.length;
    const categoriesCount = categories.length;

    const productKey = (p) =>
      String(p.productId ?? p.product_id ?? p.id ?? "").trim();

    const formulaProductIds = new Set();
    for (const f of formulaList) {
      const fid = String(
        f.productId ??
          f.product_id ??
          f.product?.productId ??
          f.product?.id ??
          "",
      ).trim();
      if (!fid) continue;
      const lines =
        f.ingredients ?? f.items ?? f.formulaIngredients ?? f.lines ?? [];
      if (Array.isArray(lines) && lines.length > 0) {
        formulaProductIds.add(fid);
      }
    }

    const withFormula = products.filter((p) => {
      const id = productKey(p);
      if (!id) return false;
      const emb = p.ingredients;
      if (Array.isArray(emb) && emb.length > 0) {
        const hasLine = emb.some(
          (row) => row.ingredientId || row.id || row.ingredient_id,
        );
        if (hasLine) return true;
      }
      return formulaProductIds.has(id);
    }).length;

    return { total, categoriesCount, withFormula };
  })();
  const productCategoryOptions = [
    "all",
    ...Array.from(
      new Set(products.map((p) => getProductCategoryName(p)).filter(Boolean)),
    ),
  ];

  const importGrandTotal = importForm.items.reduce(
    (sum, row) =>
      sum + (Number(row.quantity) || 0) * (Number(row.importPrice) || 0),
    0,
  );

  const adminStats = [
    {
      label: "Tổng người dùng",
      value: users.length.toString(),
      change: "",
      icon: Users,
      color: "ck-icon-box-blue",
      filterKey: "all",
    },
    {
      label: "Đang hoạt động",
      value: users.filter((u) => u.status === "active").length.toString(),
      change: "",
      icon: CheckCircle,
      color: "ck-icon-box-green",
      filterKey: "active",
    },
    {
      label: "Nhân viên CH",
      value: users
        .filter((u) => u.role === "franchise" || u.roleRaw === "STORE_MANAGER")
        .length.toString(),
      change: "",
      icon: Store,
      color: "ck-icon-box-purple",
      filterKey: "store",
    },
    {
      label: "Ngưng Hoạt Động",
      value: users.filter((u) => u.status !== "active").length.toString(),
      change: "",
      icon: XCircle,
      color: "ck-icon-box-red",
      filterKey: "inactive",
    },
  ];

  return (
    <div
      className={`ck-root ck-min-h-screen ${uiTheme === "light" ? "ck-theme-light" : "ck-bg-black"}`}
    >
      <div className="ck-grain" />

      <header className="ck-header ck-px-6 ck-py-4 ck-flex ck-items-center ck-justify-between">
        <div className="ck-flex ck-items-center ck-gap-4">
          <div className="ck-w-12-h-12 ck-bg-gradient-btn-admin ck-rounded-xl ck-flex ck-items-center ck-justify-center ck-shadow-lg">
            <Shield className="ck-text-white" size={24} />
          </div>
          <div>
            <h1 className="ck-text-lg ck-font-bold ck-text-white">
              Quản trị hệ thống
            </h1>
            <span className="admin-page-badge">Admin</span>
          </div>
        </div>
        <div className="ck-flex ck-items-center ck-gap-2">
          <ThemeToggleButton />
          <NotificationBell variant={uiTheme === "dark" ? "dark" : "light"} />
          <HeaderSettingsMenu
            userData={userData}
            showProfile={false}
            onChangePassword={() => setShowChangePasswordModal(true)}
            onLogout={onLogout}
          />
        </div>
      </header>

      <ChangePasswordModal
        open={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

      {showEditAccountModal && editAccountUser && (
        <div
          className="ck-modal-overlay ingredient-form-modal"
          onClick={() => setShowEditAccountModal(false)}
          role="presentation"
        >
          <div
            className="ck-modal-box ingredient-form-box ck-max-w-lg ck-w-full"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="form-header">
              <div>
                <h3>Chỉnh sửa tài khoản</h3>
                <span
                  className="helper"
                  style={{ marginTop: 4, display: "block" }}
                >
                  {editAccountUser.name ?? editAccountUser.fullName} (
                  {editAccountUser.roleRaw ?? editAccountUser.role})
                </span>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowEditAccountModal(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="form-body">
              <div className="field">
                <label>Vai trò</label>
                {isAdminRoleUser(editAccountUser) ? (
                  <div
                    className="helper"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border, #4b5563)",
                      background: "rgba(17,24,39,0.5)",
                      color: "var(--text2, #d1d5db)",
                      fontSize: 14,
                    }}
                  >
                    {ROLE_LABELS.ADMIN}
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
                      Vai trò này không đổi từ form chỉnh sửa.
                    </div>
                  </div>
                ) : (
                  <select
                    value={editAccountForm.roleName}
                    onChange={(e) =>
                      setEditAccountForm((f) => ({
                        ...f,
                        roleName: e.target.value,
                        storeId:
                          e.target.value === "STORE_MANAGER" ? f.storeId : "",
                      }))
                    }
                  >
                    {ADMIN_ACCOUNT_ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {!isAdminRoleUser(editAccountUser) &&
                editAccountForm.roleName === "STORE_MANAGER" && (
                  <div className="field">
                    <label>
                      Cửa hàng <span className="helper">(tùy chọn)</span>
                    </label>
                    <select
                      value={String(editAccountForm.storeId ?? "")}
                      onChange={(e) =>
                        setEditAccountForm((f) => ({
                          ...f,
                          storeId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Chưa có</option>
                      {stores
                        .filter((s) => {
                          if (s.isActive === false) return false;
                          const storeIds = [s.storeId, s.id]
                            .filter(Boolean)
                            .map(String);
                          if (storeIds.length === 0) return true;
                          const currentUserId = String(
                            editAccountUser?.accountId ??
                              editAccountUser?.id ??
                              editAccountUser?.userId ??
                              "",
                          );
                          const allAccounts =
                            users.length > 0 ? users : accountsList;
                          const isAssignedToOther = allAccounts.some((acc) => {
                            if (acc.roleRaw !== "STORE_MANAGER") return false;
                            if (
                              String(acc.accountId ?? acc.id ?? acc.userId) ===
                              currentUserId
                            )
                              return false;
                            const accStoreIds = [
                              acc.storeId,
                              ...(acc.storeIds || []),
                            ]
                              .filter(Boolean)
                              .map(String);
                            const matchById = storeIds.some((sid) =>
                              accStoreIds.some((aid) => aid === sid),
                            );
                            if (matchById) return true;
                            const storeName = (s.name ?? "").trim();
                            if (!storeName) return false;
                            const accNames = [acc.managedStores, acc.storeName]
                              .filter(Boolean)
                              .flatMap((x) =>
                                String(x)
                                  .split(",")
                                  .map((n) => n.trim())
                                  .filter(Boolean),
                              );
                            return accNames.some((n) => n === storeName);
                          });
                          return !isAssignedToOther;
                        })
                        .map((s) => (
                          <option
                            key={s.storeId ?? s.id}
                            value={String(s.storeId ?? s.id ?? "")}
                          >
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              <div className="field">
                <label>Email *</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={editAccountForm.email}
                  onChange={(e) =>
                    setEditAccountForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowEditAccountModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn-submit"
                  onClick={handleEditAccountSubmit}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSwapStoresModal && (
        <div
          className="ck-modal-overlay ingredient-form-modal"
          onClick={() => setShowSwapStoresModal(false)}
          role="presentation"
        >
          <div
            className="ck-modal-box ingredient-form-box ck-max-w-lg ck-w-full"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="form-header">
              <div>
                <h3>Hoán đổi cửa hàng giữa 2 Quản lý</h3>
                <span
                  className="helper"
                  style={{ marginTop: 4, display: "block" }}
                >
                  Chọn 2 Quản lý cửa hàng (STORE_MANAGER) đang có cửa hàng để
                  hoán đổi cửa hàng phụ trách.
                </span>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowSwapStoresModal(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="form-body">
              <div className="field">
                <label>Quản lý 1</label>
                <select
                  value={swapAccount1}
                  onChange={(e) => setSwapAccount1(e.target.value)}
                >
                  <option value="">— Chọn —</option>
                  {storeManagersWithStore.map((u) => {
                    const id = u.accountId ?? u.id ?? u.userId;
                    let storeInfo = u.managedStores;
                    if (!storeInfo && (u.storeId || u.storeIds?.[0])) {
                      const sid = u.storeId ?? u.storeIds?.[0];
                      const st = stores.find(
                        (s) => String(s.storeId ?? s.id) === String(sid),
                      );
                      storeInfo = st?.name ?? sid;
                    }
                    return (
                      <option key={id} value={id}>
                        {u.name ?? u.fullName} ({storeInfo ?? "—"})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="field">
                <label>Quản lý 2</label>
                <select
                  value={swapAccount2}
                  onChange={(e) => setSwapAccount2(e.target.value)}
                >
                  <option value="">— Chọn —</option>
                  {storeManagersWithStore.map((u) => {
                    const id = u.accountId ?? u.id ?? u.userId;
                    let storeInfo = u.managedStores;
                    if (!storeInfo && (u.storeId || u.storeIds?.[0])) {
                      const sid = u.storeId ?? u.storeIds?.[0];
                      const st = stores.find(
                        (s) => String(s.storeId ?? s.id) === String(sid),
                      );
                      storeInfo = st?.name ?? sid;
                    }
                    return (
                      <option key={id} value={id}>
                        {u.name ?? u.fullName} ({storeInfo ?? "—"})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowSwapStoresModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn-submit"
                  onClick={handleSwapStores}
                >
                  Hoán đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="ck-p-8">
        <div
          className="ck-max-w-7xl ingredient-polished"
          style={{ marginLeft: "auto", marginRight: "auto" }}
        >
          <div className="ing-app">
            <div className="tabs" style={{ marginBottom: 24 }}>
              {ADMIN_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`tab ${adminTab === tab.id ? "active" : ""}`}
                    onClick={() => setAdminTab(tab.id)}
                  >
                    <Icon size={16} style={{ flexShrink: 0 }} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {adminTab === "accounts" && (
              <>
                <div className="header">
                  <div>
                    <div className="header-eyebrow">Hệ thống</div>
                    <div className="header-title">Tài khoản</div>
                  </div>
                  <div className="header-actions">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setSwapAccount1("");
                        setSwapAccount2("");
                        setShowSwapStoresModal(true);
                      }}
                    >
                      Chuyển đổi
                    </button>
                    <button
                      type="button"
                      className="btn btn-teal"
                      onClick={() => setShowAddUser(true)}
                    >
                      <UserPlus size={13} />
                      Thêm người dùng
                    </button>
                  </div>
                </div>
                <div className="stats">
                  {adminStats.map((stat, i) => (
                    <div
                      key={i}
                      className={`stat stat-s${(i % 4) + 1}`}
                      role={stat.filterKey ? "button" : undefined}
                      tabIndex={stat.filterKey ? 0 : undefined}
                      onClick={
                        stat.filterKey
                          ? () => setAccountFilter(stat.filterKey)
                          : undefined
                      }
                      onKeyDown={(e) => {
                        if (
                          stat.filterKey &&
                          (e.key === "Enter" || e.key === " ")
                        ) {
                          e.preventDefault();
                          setAccountFilter(stat.filterKey);
                        }
                      }}
                    >
                      <div className="stat-label">{stat.label}</div>
                      <div
                        className="stat-val"
                        style={
                          i === 1
                            ? { color: "var(--green)" }
                            : i === 2
                              ? { color: "var(--purple, #a78bfa)" }
                              : i === 3
                                ? { color: "var(--red)" }
                                : undefined
                        }
                      >
                        {stat.value}
                      </div>
                      <div className="stat-sub"></div>
                    </div>
                  ))}
                </div>
                <div className="toolbar">
                  <div className="filt-group">
                    <button
                      type="button"
                      className={`filt ${accountFilter === "all" ? "active" : ""}`}
                      onClick={() => setAccountFilter("all")}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      className={`filt ${accountFilter === "active" ? "active" : ""}`}
                      onClick={() => setAccountFilter("active")}
                    >
                      Đang hoạt động
                    </button>
                    <button
                      type="button"
                      className={`filt ${accountFilter === "store" ? "active" : ""}`}
                      onClick={() => setAccountFilter("store")}
                    >
                      Nhân viên CH
                    </button>
                    <button
                      type="button"
                      className={`filt ${accountFilter === "inactive" ? "active" : ""}`}
                      onClick={() => setAccountFilter("inactive")}
                    >
                      Bị khóa
                    </button>
                  </div>
                </div>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Vai trò</th>
                        <th>Mã NV</th>
                        <th>Họ tên</th>
                        <th>Email</th>
                        <th>Cửa hàng phụ trách</th>
                        <th style={{ textAlign: "center" }}>Trạng thái</th>
                        <th style={{ textAlign: "center" }}>Cập nhật</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...accountsList]
                        .sort((a, b) => {
                          const aActive = a.status === "active";
                          const bActive = b.status === "active";
                          if (aActive && !bActive) return -1;
                          if (!aActive && bActive) return 1;
                          return 0;
                        })
                        .map((user) => (
                          <tr key={user.id ?? user.accountId}>
                            <td style={{ color: "var(--text3)" }}>
                              {user.roleRaw ?? user.role}
                            </td>
                            <td
                              className="ing-id"
                              style={{
                                fontFamily: "var(--fm)",
                                fontSize: "10.5px",
                              }}
                            >
                              {user.userId}
                            </td>
                            <td className="ing-name">
                              {user.name ?? user.fullName}
                            </td>
                            <td style={{ color: "var(--text2)", fontSize: 13 }}>
                              {user.email ?? "-"}
                            </td>
                            {(() => {
                              const storeName =
                                user.roleRaw === "STORE_MANAGER"
                                  ? (() => {
                                      const ms = user.managedStores;
                                      if (ms && String(ms).trim())
                                        return String(ms).trim();
                                      const sid =
                                        user.storeId ?? user.storeIds?.[0];
                                      if (sid) {
                                        const st = stores.find(
                                          (x) =>
                                            String(x.storeId ?? x.id) ===
                                            String(sid),
                                        );
                                        return st?.name ?? "Chưa có";
                                      }
                                      return "Chưa có";
                                    })()
                                  : "_";
                              return (
                                <td
                                  style={{
                                    color: "var(--text2)",
                                    fontSize: 13,
                                  }}
                                >
                                  {storeName === "Chưa có" ? (
                                    <span className="empty-warn">
                                      {storeName}
                                    </span>
                                  ) : (
                                    storeName
                                  )}
                                </td>
                              );
                            })()}
                            <td style={{ textAlign: "center" }}>
                              {user.role !== "admin" ? (
                                <button
                                  type="button"
                                  className={`badge ${user.status === "active" ? "b-ok" : "b-low"}`}
                                  style={{
                                    border: "none",
                                    cursor: "pointer",
                                    padding: "4px 10px",
                                  }}
                                  onClick={() => handleToggleStatus(user)}
                                  title={
                                    user.status === "active"
                                      ? "Bấm để khóa tài khoản"
                                      : "Bấm để mở khóa"
                                  }
                                >
                                  {user.status === "active"
                                    ? "Hoạt động"
                                    : "Đã khóa"}
                                </button>
                              ) : (
                                <span style={{ color: "var(--text3)" }}>—</span>
                              )}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className="act-btn"
                                onClick={() => handleOpenEditAccount(user)}
                                title="Chỉnh sửa"
                              >
                                Chỉnh sửa
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {adminTab === "stores" && (
              <>
                <div className="header">
                  <div>
                    <div className="header-eyebrow">Hệ thống</div>
                    <div className="header-title">Cửa hàng</div>
                  </div>
                  <div className="header-actions">
                    <button
                      type="button"
                      className="btn btn-teal"
                      onClick={() => {
                        setEditingStore(null);
                        setNewStore({ name: "", address: "", phone: "" });
                        setAssignManagerId("");
                        setShowAddStore(true);
                      }}
                    >
                      <Plus size={13} />
                      Tạo cửa hàng
                    </button>
                  </div>
                </div>
                <div className="toolbar">
                  <div className="filt-group">
                    <button
                      type="button"
                      className={`filt ${storeListFilter === "all" ? "active" : ""}`}
                      onClick={() => setStoreListFilter("all")}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      className={`filt ${storeListFilter === "closed" ? "active" : ""}`}
                      onClick={() => setStoreListFilter("closed")}
                    >
                      Đã đóng
                    </button>
                  </div>
                </div>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Tên</th>
                        <th>Địa chỉ</th>
                        <th>Điện thoại</th>
                        <th>Người phụ trách</th>
                        <th style={{ textAlign: "center" }}>Trạng thái</th>
                        <th style={{ textAlign: "center" }}>Cập nhật</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(storeListFilter === "closed"
                        ? stores.filter((s) => s.isActive === false)
                        : [...stores].sort((a, b) => {
                            const aClosed = a.isActive === false ? 1 : 0;
                            const bClosed = b.isActive === false ? 1 : 0;
                            return aClosed - bClosed;
                          })
                      ).length === 0 ? (
                        <tr className="empty-row">
                          <td colSpan={6}>
                            {storeListFilter === "closed"
                              ? "Không có cửa hàng nào đã đóng."
                              : 'Chưa có cửa hàng. Bấm "Tạo cửa hàng" để thêm.'}
                          </td>
                        </tr>
                      ) : (
                        (storeListFilter === "closed"
                          ? stores.filter((s) => s.isActive === false)
                          : [...stores].sort((a, b) => {
                              const aClosed = a.isActive === false ? 1 : 0;
                              const bClosed = b.isActive === false ? 1 : 0;
                              return aClosed - bClosed;
                            })
                        ).map((s) => (
                          <tr key={s.storeId ?? s.id}>
                            <td className="ing-name">{s.name}</td>
                            <td style={{ color: "var(--text2)", fontSize: 13 }}>
                              {s.address ?? "-"}
                            </td>
                            <td style={{ color: "var(--text2)", fontSize: 13 }}>
                              {s.phone ?? "-"}
                            </td>
                            {(() => {
                              const mgr = getManagerForStore(s);
                              return (
                                <td
                                  style={{
                                    color: "var(--text2)",
                                    fontSize: 13,
                                  }}
                                >
                                  {mgr === "Chưa có" ? (
                                    <span className="empty-warn">{mgr}</span>
                                  ) : (
                                    mgr
                                  )}
                                </td>
                              );
                            })()}
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className={`badge ${s.isActive !== false ? "b-ok" : "b-low"}`}
                                style={{
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "4px 10px",
                                }}
                                onClick={() => handleToggleStoreActive(s)}
                                title={
                                  s.isActive !== false
                                    ? "Bấm để đóng cửa hàng"
                                    : "Bấm để mở cửa hàng"
                                }
                              >
                                {s.isActive !== false ? "Đang mở" : "Đã đóng"}
                              </button>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className="act-btn"
                                onClick={() => {
                                  setEditingStore(s);
                                  setNewStore({
                                    name: s.name ?? "",
                                    address: s.address ?? "",
                                    phone: s.phone ?? "",
                                  });
                                  const mgr = getManagerAccountForStore(s);
                                  setAssignManagerId(
                                    String(
                                      mgr?.accountId ??
                                        mgr?.id ??
                                        mgr?.userId ??
                                        "",
                                    ),
                                  );
                                  setShowAddStore(true);
                                }}
                              >
                                Chỉnh sửa
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {adminTab === "kitchen" && (
              <>
                <div className="header">
                  <div>
                    <div className="header-eyebrow">Thực đơn & Công thức</div>
                    <div className="header-title">Quản lý sản phẩm</div>
                  </div>
                  <div className="header-actions">
                    <button
                      type="button"
                      className="btn btn-outline-teal"
                      onClick={() => {
                        setShowAddCategory(true);
                        setEditingCategory(null);
                        setNewCategoryName("");
                        setNewCategoryDescription("");
                      }}
                    >
                      <Plus size={13} />
                      Thêm danh mục
                    </button>
                    <button
                      type="button"
                      className="btn btn-teal"
                      onClick={() => {
                        setShowAddProduct(true);
                        setEditingProduct(null);
                        setNewProduct({
                          productId: "",
                          productName: "",
                          categoryId: categories[0]?.id ?? "",
                          sellingPrice: "",
                          baseUnit: "",
                          isActive: true,
                          ingredients: [],
                        });
                      }}
                    >
                      <Plus size={13} />
                      Thêm sản phẩm
                    </button>
                  </div>
                </div>

                <div className="tabs">
                  <button
                    type="button"
                    className={`tab ${kitchenSubTab === "products" ? "active" : ""}`}
                    onClick={() => setKitchenSubTab("products")}
                  >
                    Sản phẩm
                  </button>
                  <button
                    type="button"
                    className={`tab ${kitchenSubTab === "categories" ? "active" : ""}`}
                    onClick={() => setKitchenSubTab("categories")}
                  >
                    Danh mục
                  </button>
                </div>

                <div className="stats stats--cols-3">
                  <div className="stat stat-s1">
                    <div className="stat-label">Tổng sản phẩm</div>
                    <div className="stat-val">{productStats.total}</div>
                    <div className="stat-sub">đang bán</div>
                  </div>
                  <div className="stat stat-s2">
                    <div className="stat-label">Danh mục</div>
                    <div
                      className="stat-val"
                      style={{ color: "var(--purple, #a78bfa)" }}
                    >
                      {productStats.categoriesCount}
                    </div>
                    <div className="stat-sub">phân loại</div>
                  </div>
                </div>

                {kitchenSubTab === "products" && (
                  <div id="tab-products">
                    <div className="toolbar">
                      <div className="search-wrap">
                        <Search size={14} />
                        <input
                          type="text"
                          placeholder="Tìm sản phẩm..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                        />
                      </div>
                      <div className="filt-group">
                        {productCategoryOptions.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            className={`filt ${productCatFilter === cat ? "active" : ""}`}
                            onClick={() => setProductCatFilter(cat)}
                          >
                            {cat === "all" ? "Tất cả" : cat}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="product-grid">
                      {filteredProducts.length === 0 ? (
                        <div
                          className="empty-state"
                          style={{ gridColumn: "1 / -1" }}
                        >
                          {products.length === 0
                            ? 'Chưa có sản phẩm. Bấm "Thêm sản phẩm" để tạo.'
                            : "Không tìm thấy sản phẩm phù hợp bộ lọc."}
                        </div>
                      ) : (
                        filteredProducts.map((p) => {
                          const catName = getProductCategoryName(p);
                          const hasFormula =
                            p.ingredients && p.ingredients.length > 0;
                          const price = Number(p.sellingPrice ?? p.price ?? 0);
                          const unitRaw = (p.baseUnit || "").toString().trim();
                          const unitDisplay = unitRaw ? labelFor(unitRaw) : "—";
                          const pcCatClass = `pc-cat pc-cat-${catName ? "cat" : "other"}`;
                          return (
                            <div
                              key={p.id ?? p.productId}
                              className="product-card"
                              role="button"
                              tabIndex={0}
                              onClick={async () => {
                                setDetailProduct(p);
                                setDetailProductFormula([]);
                                setDetailProductFormulaLoading(true);
                                const id1 = p.productId ?? p.id;
                                const id2 = p.id ?? p.productId;
                                const idsToTry = [id1]
                                  .concat(id1 !== id2 ? [id2] : [])
                                  .map(String)
                                  .filter(Boolean);
                                let formulaList = [];
                                // Ưu tiên lấy công thức từ API mới getFormula,
                                // nếu không có thì fallback sang getRecipeOfProduct (API cũ),
                                // cuối cùng fallback sang p.ingredients (nếu có) để tránh luôn hiển thị rỗng.
                                for (const id of idsToTry) {
                                  try {
                                    const formula = await api.getFormula(id);
                                    const listFromFormula =
                                      formula?.ingredients ??
                                      (Array.isArray(formula) ? formula : []);
                                    if (listFromFormula.length > 0) {
                                      formulaList = listFromFormula;
                                      break;
                                    }
                                  } catch (_) {}
                                  try {
                                    const legacy =
                                      await api.getRecipeOfProduct(id);
                                    const listFromLegacy =
                                      legacy?.ingredients ??
                                      (Array.isArray(legacy) ? legacy : []);
                                    if (listFromLegacy.length > 0) {
                                      formulaList = listFromLegacy;
                                      break;
                                    }
                                  } catch (_) {}
                                }
                                if (
                                  formulaList.length === 0 &&
                                  Array.isArray(p.ingredients) &&
                                  p.ingredients.length > 0
                                ) {
                                  formulaList = p.ingredients;
                                }
                                setDetailProductFormula(formulaList);
                                setDetailProductFormulaLoading(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.currentTarget.click();
                                }
                              }}
                            >
                              {hasFormula && (
                                <div
                                  className="pc-formula-badge"
                                  title="Có công thức"
                                >
                                  <svg
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    <polyline points="2 8 6 12 14 4" />
                                  </svg>
                                </div>
                              )}
                              <div className={pcCatClass}>{catName || "—"}</div>
                              <div className="pc-name">
                                {p.name ?? p.productName}
                              </div>
                              <div className="pc-id">{p.id ?? p.productId}</div>
                              <div className="pc-footer">
                                <div className="pc-price">
                                  {price.toLocaleString("vi-VN")}đ
                                </div>
                                <span className="pc-unit">{unitDisplay}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {kitchenSubTab === "categories" && (
                  <div id="tab-categories">
                    <div className="toolbar">
                      <span className="toolbar-label">
                        Quản lý danh mục món
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm ml-auto"
                        onClick={() => {
                          setShowAddCategory(true);
                          setEditingCategory(null);
                          setNewCategoryName("");
                          setNewCategoryDescription("");
                        }}
                      >
                        <Plus size={13} />
                        Thêm danh mục
                      </button>
                    </div>
                    <div className="cat-grid">
                      {categories.length === 0 ? (
                        <div
                          className="empty-state"
                          style={{ gridColumn: "1 / -1" }}
                        >
                          Chưa có danh mục. Bấm &quot;Thêm danh mục&quot; để
                          tạo.
                        </div>
                      ) : (
                        categories.map((cat) => {
                          const count = products.filter(
                            (p) =>
                              getProductCategoryName(p) === cat.name ||
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
              </>
            )}

            {adminTab === "ingredients" && (
              <>
                <div className="header">
                  <div>
                    <div className="header-eyebrow">Quản lý kho</div>
                    <div className="header-title">Nguyên liệu</div>
                  </div>
                  <div className="header-actions">
                    <button
                      type="button"
                      className="btn btn-outline-teal"
                      onClick={() => {
                        setEditingIngredient(null);
                        setDetailIngredient(null);
                        setIngredientForm({
                          name: "",
                          kitchenStock: "",
                          unit: "",
                          unitCost: "",
                          minThreshold: "",
                        });
                        setShowAddIngredient(true);
                      }}
                    >
                      <Plus size={13} />
                      Thêm nguyên liệu
                    </button>
                    <button
                      type="button"
                      className="btn btn-teal"
                      onClick={() => {
                        setImportForm({
                          note: "",
                          items: [
                            {
                              ingredientId: "",
                              unit: "",
                              quantity: "",
                              importPrice: "",
                            },
                          ],
                        });
                        setShowImportModal(true);
                      }}
                    >
                      Nhập kho
                    </button>
                  </div>
                </div>

                <div className="tabs">
                  <button
                    type="button"
                    className={`tab ${ingredientSubTab === "stock" ? "active" : ""}`}
                    onClick={() => setIngredientSubTab("stock")}
                  >
                    Tồn kho
                  </button>
                  <button
                    type="button"
                    className={`tab ${ingredientSubTab === "history" ? "active" : ""}`}
                    onClick={() => setIngredientSubTab("history")}
                  >
                    Lịch sử nhập hàng
                  </button>
                </div>

                <div className="stats">
                  <div className="stat">
                    <div className="stat-label">Tổng nguyên liệu</div>
                    <div className="stat-val">{ingredientStats.total}</div>
                    <div className="stat-sub">đang theo dõi</div>
                  </div>
                  <div className="stat stat-warn">
                    <div className="stat-label">Sắp hết hàng</div>
                    <div className="stat-val" style={{ color: "var(--amber)" }}>
                      {ingredientStats.low}
                    </div>
                    <div className="stat-sub">dưới mức tối thiểu</div>
                  </div>
                  <div className="stat stat-danger">
                    <div className="stat-label">Hết hàng</div>
                    <div className="stat-val" style={{ color: "var(--red)" }}>
                      {ingredientStats.empty}
                    </div>
                    <div className="stat-sub">cần nhập gấp</div>
                  </div>
                  <div className="stat stat-teal">
                    <div className="stat-label">Giá trị tồn kho</div>
                    <div className="stat-val" style={{ color: "var(--teal)" }}>
                      {ingredientStats.totalValue >= 1e6
                        ? `${(ingredientStats.totalValue / 1e6).toFixed(1)} tr`
                        : Number(ingredientStats.totalValue).toLocaleString()}
                    </div>
                    <div className="stat-sub">ước tính</div>
                  </div>
                </div>

                {ingredientSubTab === "stock" && (
                  <div id="tab-stock">
                    <div className="toolbar">
                      <div className="search-wrap">
                        <Search size={14} />
                        <input
                          type="text"
                          placeholder="Tìm nguyên liệu..."
                          value={ingredientSearch}
                          onChange={(e) => setIngredientSearch(e.target.value)}
                        />
                      </div>
                      <div className="filt-group">
                        <button
                          type="button"
                          className={`filt ${ingredientFilter === "all" ? "active" : ""}`}
                          onClick={() => setIngredientFilter("all")}
                        >
                          Tất cả
                        </button>
                        <button
                          type="button"
                          className={`filt ${ingredientFilter === "low" ? "active" : ""}`}
                          onClick={() => setIngredientFilter("low")}
                        >
                          Sắp hết
                        </button>
                        <button
                          type="button"
                          className={`filt ${ingredientFilter === "ok" ? "active" : ""}`}
                          onClick={() => setIngredientFilter("ok")}
                        >
                          Đủ hàng
                        </button>
                      </div>
                    </div>
                    <div className="tbl-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Nguyên liệu</th>
                            <th>Tồn kho</th>
                            <th>Đơn vị</th>
                            <th>Đơn giá</th>
                            <th>Giá trị tồn</th>
                            <th>Trạng thái</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredIngredients.length === 0 ? (
                            <tr className="empty-row">
                              <td colSpan={7}>
                                {ingredients.length === 0
                                  ? 'Chưa có nguyên liệu. Bấm "Thêm nguyên liệu" để tạo.'
                                  : "Không có dữ liệu phù hợp bộ lọc."}
                              </td>
                            </tr>
                          ) : (
                            filteredIngredients.map((ing) => {
                              const id = ing.ingredientId ?? ing.id;
                              const stock = Number(ing.kitchenStock) || 0;
                              const min = Number(ing.minThreshold) || 0;
                              const unitCost = Number(ing.unitCost) || 0;
                              const value = stock * unitCost;
                              const status = getIngredientStatus(ing);
                              const statusLabel =
                                status === "empty"
                                  ? "Hết hàng"
                                  : status === "low"
                                    ? "Sắp hết"
                                    : "Đủ hàng";
                              const badgeClass =
                                status === "empty"
                                  ? "b-empty"
                                  : status === "low"
                                    ? "b-low"
                                    : "b-ok";
                              const barPct =
                                min > 0
                                  ? Math.min(
                                      100,
                                      Math.round((stock / (min * 3)) * 100),
                                    )
                                  : 100;
                              const barColor =
                                status === "empty"
                                  ? "#b91c1c"
                                  : status === "low"
                                    ? "#b45309"
                                    : "#15803d";
                              return (
                                <tr key={id}>
                                  <td>
                                    <div className="ing-name">
                                      {ing.name ?? ing.ingredientName}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="stock-main">
                                      {stock.toLocaleString("vi-VN")}{" "}
                                      <span className="stock-min">
                                        / {min} min
                                      </span>
                                    </div>
                                    <div className="stock-bar">
                                      <div
                                        className="stock-fill"
                                        style={{
                                          width: `${barPct}%`,
                                          background: barColor,
                                        }}
                                      />
                                    </div>
                                  </td>
                                  <td>
                                    <span className="chip">
                                      {labelFor(ing.unit || "KG")}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="price-val">
                                      {unitCost.toLocaleString("vi-VN")}đ
                                    </span>
                                  </td>
                                  <td
                                    style={{
                                      fontSize: 13,
                                      color: "var(--text2)",
                                    }}
                                  >
                                    {value.toLocaleString("vi-VN")}đ
                                  </td>
                                  <td>
                                    <span className={`badge ${badgeClass}`}>
                                      {statusLabel}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="act-btns">
                                      <button
                                        type="button"
                                        className="act-btn"
                                        onClick={() => loadIngredientDetail(id)}
                                      >
                                        Chi tiết
                                      </button>
                                      <button
                                        type="button"
                                        className="act-btn"
                                        onClick={() => {
                                          setEditingIngredient(ing);
                                          setDetailIngredient(null);
                                          setIngredientForm({
                                            name: ing.name ?? "",
                                            kitchenStock:
                                              ing.kitchenStock != null
                                                ? String(ing.kitchenStock)
                                                : "",
                                            unit: ing.unit || "",
                                            unitCost:
                                              ing.unitCost != null
                                                ? String(ing.unitCost)
                                                : "",
                                            minThreshold:
                                              ing.minThreshold != null
                                                ? String(ing.minThreshold)
                                                : "",
                                          });
                                          setShowAddIngredient(true);
                                        }}
                                      >
                                        Sửa
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {ingredientSubTab === "history" && (
                  <div id="tab-history">
                    <div className="toolbar">
                      <span
                        style={{
                          fontSize: 13,
                          color: "var(--text2)",
                          fontWeight: 500,
                        }}
                      >
                        Lịch sử nhập kho
                      </span>
                      <button
                        type="button"
                        className="btn btn-outline-teal"
                        disabled={importHistoryLoading}
                        onClick={() => loadImportHistory()}
                      >
                        Làm mới
                      </button>
                    </div>
                    {importHistoryLoading ? (
                      <div className="history-empty">
                        Đang tải lịch sử nhập hàng…
                      </div>
                    ) : importHistoryList.length === 0 ? (
                      <div className="history-empty">
                        Chưa có phiếu nhập nào.
                      </div>
                    ) : (
                      <div className="history-list">
                        {importHistoryList.map((ticket, ticketIdx) => {
                          const tid = String(
                            ticket.ticketId ?? ticket.id ?? ticketIdx,
                          );
                          const expanded = importHistoryExpandedId === tid;
                          const items = Array.isArray(ticket.items)
                            ? ticket.items
                            : [];
                          const total = Number(
                            ticket.totalAmount ?? 0,
                          ).toLocaleString("vi-VN");
                          const status = String(
                            ticket.status ?? "",
                          ).toUpperCase();
                          const statusBadgeClass =
                            status === "COMPLETED"
                              ? "b-ok"
                              : status === "CANCELLED" || status === "FAILED"
                                ? "b-empty"
                                : "b-low";
                          const statusLabelVi =
                            status === "COMPLETED"
                              ? "Hoàn tất"
                              : status === "CANCELLED"
                                ? "Đã hủy"
                                : status === "FAILED"
                                  ? "Thất bại"
                                  : status === "PENDING"
                                    ? "Chờ xử lý"
                                    : status || "—";
                          const dateStr = ticket.importDate
                            ? new Date(ticket.importDate).toLocaleString(
                                "vi-VN",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : "—";
                          const previewItems = items.slice(0, 2);
                          const moreItemCount = Math.max(
                            0,
                            items.length - previewItems.length,
                          );
                          return (
                            <div
                              key={tid}
                              className="import-history-ticket import-history-ticket--rich"
                            >
                              <div className="import-history-card__layout">
                                <div className="import-history-card__left">
                                  <div
                                    className="import-history-card__icon"
                                    aria-hidden
                                  >
                                    <Package size={22} />
                                  </div>
                                  <div className="import-history-card__content">
                                    <div className="import-history-card__title-row">
                                      <span className="import-history-card__ticket-id">
                                        {tid}
                                      </span>
                                      {status ? (
                                        <span
                                          className={`badge ${statusBadgeClass} import-history-card__status`}
                                        >
                                          {statusLabelVi}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="import-history-card__meta-row">
                                      <span className="import-history-card__meta-item">
                                        <Clock size={14} />
                                        {dateStr}
                                      </span>
                                      <span className="import-history-card__meta-dot">
                                        ·
                                      </span>
                                      <span className="import-history-card__meta-item">
                                        <User size={14} />
                                        {ticket.createdByName ?? "—"}
                                      </span>
                                      {items.length > 0 ? (
                                        <>
                                          <span className="import-history-card__meta-dot">
                                            ·
                                          </span>
                                          <span className="import-history-card__meta-count">
                                            {items.length} mặt hàng
                                          </span>
                                        </>
                                      ) : null}
                                    </div>
                                    {previewItems.length > 0 && (
                                      <div className="import-history-card__preview">
                                        {previewItems.map((it, pi) => (
                                          <span
                                            key={pi}
                                            className="import-history-card__preview-chip"
                                          >
                                            {it.ingredientName ?? "—"}
                                          </span>
                                        ))}
                                        {moreItemCount > 0 ? (
                                          <span className="import-history-card__preview-more">
                                            +{moreItemCount} mục
                                          </span>
                                        ) : null}
                                      </div>
                                    )}
                                    {ticket.note ? (
                                      <div className="import-history-card__note">
                                        <span className="import-history-card__note-label">
                                          Ghi chú
                                        </span>
                                        {ticket.note}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="import-history-card__aside">
                                  <div className="import-history-card__aside-label">
                                    Tổng giá trị
                                  </div>
                                  <div className="import-history-card__total">
                                    {total}
                                    <span className="import-history-card__currency">
                                      đ
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    className="btn btn-teal import-history-card__cta"
                                    onClick={() =>
                                      setImportHistoryExpandedId(
                                        expanded ? null : tid,
                                      )
                                    }
                                  >
                                    {expanded
                                      ? "Thu gọn bảng"
                                      : "Xem bảng chi tiết"}
                                  </button>
                                </div>
                              </div>
                              {expanded && (
                                <div className="import-history-items">
                                  {items.length === 0 ? (
                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: 13,
                                        color: "var(--text3)",
                                      }}
                                    >
                                      Phiếu không có dòng hàng chi tiết.
                                    </p>
                                  ) : (
                                    <table>
                                      <thead>
                                        <tr>
                                          <th>Nguyên liệu</th>
                                          <th>SL</th>
                                          <th>Đơn vị</th>
                                          <th>Đơn giá</th>
                                          <th>Thành tiền</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {items.map((row, i) => (
                                          <tr key={i}>
                                            <td className="ing-name">
                                              {row.ingredientName ?? "—"}
                                            </td>
                                            <td
                                              style={{
                                                fontFamily: "var(--fm)",
                                              }}
                                            >
                                              {Number(
                                                row.quantity ?? 0,
                                              ).toLocaleString("vi-VN")}
                                            </td>
                                            <td>
                                              <span className="chip">
                                                {row.unit != null &&
                                                String(row.unit).trim() !== ""
                                                  ? labelFor(row.unit)
                                                  : "—"}
                                              </span>
                                            </td>
                                            <td>
                                              {Number(
                                                row.importPrice ?? 0,
                                              ).toLocaleString("vi-VN")}
                                              đ
                                            </td>
                                            <td className="price-val">
                                              {Number(
                                                row.totalPrice ??
                                                  (Number(row.quantity) || 0) *
                                                    (Number(row.importPrice) ||
                                                      0),
                                              ).toLocaleString("vi-VN")}
                                              đ
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {adminTab === "broadcast" && (
              <>
                <div className="header">
                  <div>
                    <div className="header-eyebrow">Thông báo hệ thống</div>
                    <div className="header-title">Phát loa</div>
                  </div>
                </div>
                <div className="broadcast-shell">
                  <form
                    className="broadcast-form"
                    onSubmit={handleBroadcastSubmit}
                  >
                    {broadcastSuccess ? (
                      <div
                        className="broadcast-alert broadcast-alert--ok"
                        role="status"
                        ref={broadcastSuccessRef}
                      >
                        <div className="broadcast-alert__shimmer" aria-hidden />
                        <div className="broadcast-alert__row">
                          <span className="broadcast-alert__icon-wrap broadcast-alert__icon-wrap--ok">
                            <CheckCircle size={22} />
                          </span>
                          <div className="broadcast-alert__copy">
                            <p className="broadcast-alert__eyebrow broadcast-alert__eyebrow--solo">
                              Đã Phát Thông Báo Thành Công
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {broadcastError ? (
                      <div
                        className="broadcast-alert broadcast-alert--err"
                        role="alert"
                      >
                        <div className="broadcast-alert__row">
                          <span className="broadcast-alert__icon-wrap broadcast-alert__icon-wrap--err">
                            <AlertTriangle size={22} />
                          </span>
                          <div className="broadcast-alert__copy">
                            <p className="broadcast-alert__eyebrow">
                              Chưa gửi được
                            </p>
                            <p className="broadcast-alert__msg">
                              {broadcastError}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <section className="broadcast-section">
                      <div className="broadcast-section__rule" aria-hidden />
                      <h3 className="broadcast-section__title">
                        <Megaphone
                          size={14}
                          className="broadcast-section__icon"
                        />
                        <span>Loại thông báo</span>
                      </h3>
                      <div className="broadcast-type-row">
                        {BROADCAST_TYPE_CARDS.map(
                          ({ value, label, Icon, tone }) => (
                            <button
                              key={value}
                              type="button"
                              className={`broadcast-type-card broadcast-type-card--${tone}${broadcastType === value ? " is-selected" : ""}`}
                              onClick={() => {
                                setBroadcastType(value);
                                setBroadcastSuccess(false);
                                setBroadcastError(null);
                              }}
                            >
                              <span
                                className={`broadcast-type-card__glyph broadcast-type-card__glyph--${tone}`}
                              >
                                <Icon size={22} />
                              </span>
                              <span className="broadcast-type-card__label">
                                {label}
                              </span>
                            </button>
                          ),
                        )}
                      </div>
                    </section>

                    <section className="broadcast-section">
                      <div className="broadcast-section__rule" aria-hidden />
                      <h3 className="broadcast-section__title">
                        <Target size={14} className="broadcast-section__icon" />
                        <span>Đối tượng nhận</span>
                      </h3>
                      <div className="broadcast-global-card">
                        <div className="broadcast-global-card__main">
                          <div className="broadcast-global-card__text">
                            <span className="broadcast-global-card__label">
                              Phát loa toàn hệ thống
                            </span>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={broadcastAllUsers}
                            className={`broadcast-toggle${broadcastAllUsers ? " is-on" : ""}`}
                            onClick={() => {
                              setBroadcastAllUsers((v) => {
                                const next = !v;
                                if (next) setBroadcastTargetRoles([]);
                                return next;
                              });
                              setBroadcastSuccess(false);
                              setBroadcastError(null);
                            }}
                          >
                            <span className="broadcast-toggle__knob" />
                          </button>
                        </div>
                      </div>
                      <div
                        className={`broadcast-recipient-grid${broadcastAllUsers ? " is-disabled" : ""}`}
                        aria-disabled={broadcastAllUsers}
                      >
                        {BROADCAST_RECIPIENT_ROLES.map((r) => {
                          const checked = broadcastTargetRoles.includes(
                            r.value,
                          );
                          return (
                            <label
                              key={r.value}
                              className={`broadcast-recipient-tile${checked ? " is-selected" : ""}`}
                            >
                              <input
                                type="checkbox"
                                className="broadcast-recipient-tile__input"
                                checked={checked}
                                disabled={broadcastAllUsers}
                                onChange={() => toggleBroadcastRole(r.value)}
                              />
                              <span className="broadcast-recipient-tile__indicator" />
                              <span className="broadcast-recipient-tile__body">
                                <span className="broadcast-recipient-tile__name">
                                  {r.desc}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </section>

                    <section className="broadcast-section">
                      <div className="broadcast-section__rule" aria-hidden />
                      <h3 className="broadcast-section__title">
                        <Pencil size={14} className="broadcast-section__icon" />
                        <span>Nội dung thông báo</span>
                      </h3>
                      <div className="broadcast-field">
                        <label
                          className="broadcast-field__label"
                          htmlFor="broadcast-title"
                        >
                          Tiêu đề
                        </label>
                        <div className="broadcast-field__wrap">
                          <input
                            id="broadcast-title"
                            type="text"
                            className="broadcast-input"
                            value={broadcastTitle}
                            maxLength={BROADCAST_TITLE_MAX}
                            onChange={(e) => {
                              setBroadcastTitle(
                                e.target.value.slice(0, BROADCAST_TITLE_MAX),
                              );
                              setBroadcastSuccess(false);
                              setBroadcastError(null);
                            }}
                            placeholder="Bảo trì hệ thống khẩn cấp!"
                            autoComplete="off"
                          />
                          <span className="broadcast-field__counter">
                            {broadcastTitle.length}/{BROADCAST_TITLE_MAX}
                          </span>
                        </div>
                      </div>
                      <div className="broadcast-field">
                        <label
                          className="broadcast-field__label"
                          htmlFor="broadcast-message"
                        >
                          Nội dung
                        </label>
                        <div className="broadcast-field__wrap broadcast-field__wrap--textarea">
                          <textarea
                            id="broadcast-message"
                            className="broadcast-textarea"
                            rows={4}
                            value={broadcastMessage}
                            maxLength={BROADCAST_MESSAGE_MAX}
                            onChange={(e) => {
                              setBroadcastMessage(
                                e.target.value.slice(0, BROADCAST_MESSAGE_MAX),
                              );
                              setBroadcastSuccess(false);
                              setBroadcastError(null);
                            }}
                            placeholder="Đêm nay 12h hệ thống sẽ bảo trì 30 phút. Các cửa hàng chú ý chốt ca sớm!"
                          />
                          <span className="broadcast-field__counter">
                            {broadcastMessage.length}/{BROADCAST_MESSAGE_MAX}
                          </span>
                        </div>
                      </div>
                    </section>

                    <div className="broadcast-actions">
                      <button
                        type="submit"
                        className="broadcast-submit"
                        disabled={broadcastSubmitting}
                      >
                        <Megaphone size={16} />
                        {broadcastSubmitting
                          ? "Đang phát loa…"
                          : "Gửi phát loa ngay"}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {showAddUser && (
        <div
          className="ck-modal-overlay ingredient-form-modal"
          onClick={() => setShowAddUser(false)}
          role="presentation"
        >
          <div
            className="ck-modal-box ingredient-form-box ck-max-w-lg ck-w-full"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="form-header">
              <div>
                <h3>Tạo tài khoản mới</h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowAddUser(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <form
              className="form-body"
              onSubmit={(e) => {
                e.preventDefault();
                handleAddUser();
              }}
            >
              <div className="field">
                <label>Tên đăng nhập</label>
                <input
                  type="text"
                  autoComplete="username"
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  placeholder="vd: q1_store"
                />
              </div>
              <div className="field">
                <label>Mật khẩu</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  placeholder="vd: 123 (ít nhất 6 ký tự)"
                />
              </div>
              <div className="field">
                <label>Họ tên</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  placeholder="vd: Quản lý Quận 1"
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  placeholder="vd: quanlyq1@centralkitchen.com"
                />
              </div>
              <div className="field">
                <label>Vai trò</label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                >
                  {ADMIN_ACCOUNT_ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAddUser(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-submit">
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddStore && (
        <div
          className="ck-modal-overlay ingredient-form-modal"
          onClick={() => {
            setShowAddStore(false);
            setEditingStore(null);
            setAssignManagerId("");
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
                  {editingStore ? "Chỉnh sửa cửa hàng" : "Tạo cửa hàng mới"}
                </h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  setShowAddStore(false);
                  setEditingStore(null);
                  setAssignManagerId("");
                }}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <form
              className="form-body"
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveStore();
              }}
            >
              <div className="field">
                <label>Tên cửa hàng</label>
                <input
                  type="text"
                  value={newStore.name}
                  readOnly={!!editingStore}
                  onChange={(e) =>
                    setNewStore({ ...newStore, name: e.target.value })
                  }
                  placeholder="vd: Cửa hàng Quận 1 - Chi nhánh A"
                  style={editingStore ? { cursor: "not-allowed" } : undefined}
                />
              </div>
              <div className="field">
                <label>Địa chỉ</label>
                <input
                  type="text"
                  value={newStore.address}
                  readOnly={!!editingStore}
                  onChange={(e) =>
                    setNewStore({ ...newStore, address: e.target.value })
                  }
                  placeholder="vd: 123 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM"
                  style={editingStore ? { cursor: "not-allowed" } : undefined}
                />
              </div>
              <div className="field">
                <label>Điện thoại</label>
                <input
                  type="text"
                  value={newStore.phone}
                  readOnly={!!editingStore}
                  onChange={(e) =>
                    setNewStore({ ...newStore, phone: e.target.value })
                  }
                  placeholder="vd: 0901234567"
                  style={editingStore ? { cursor: "not-allowed" } : undefined}
                />
              </div>
              {editingStore && (
                <div className="field">
                  <label>Nhân viên phụ trách</label>
                  <select
                    value={assignManagerId}
                    onChange={(e) => setAssignManagerId(e.target.value)}
                  >
                    <option value="">Chưa có</option>
                    {storeManagerOptionsForEdit(editingStore).map((u) => {
                      const id = String(u.accountId ?? u.id ?? u.userId ?? "");
                      return (
                        <option key={id || `opt-${u.username}`} value={id}>
                          {(u.name ?? u.fullName ?? u.username ?? id) || "—"}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowAddStore(false);
                    setEditingStore(null);
                    setAssignManagerId("");
                  }}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-submit">
                  {editingStore ? "Lưu thay đổi" : "Thêm cửa hàng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(showAddCategory || editingCategory) && (
        <div
          className="ck-modal-overlay ingredient-form-modal"
          onClick={() => {
            setShowAddCategory(false);
            setEditingCategory(null);
            setNewCategoryName("");
            setNewCategoryDescription("");
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
                <h3>{editingCategory ? "Sửa danh mục" : "Thêm danh mục"}</h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  setShowAddCategory(false);
                  setEditingCategory(null);
                  setNewCategoryName("");
                  setNewCategoryDescription("");
                }}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="form-body">
              <div className="field">
                <label>Tên danh mục *</label>
                <input
                  type="text"
                  value={
                    editingCategory ? editingCategory.name : newCategoryName
                  }
                  onChange={(e) =>
                    editingCategory
                      ? setEditingCategory({
                          ...editingCategory,
                          name: e.target.value,
                        })
                      : setNewCategoryName(e.target.value)
                  }
                  placeholder="VD: Món nước"
                />
              </div>
              <div className="field">
                <label>Mô tả</label>
                <textarea
                  value={
                    editingCategory
                      ? (editingCategory.description ?? "")
                      : newCategoryDescription
                  }
                  onChange={(e) =>
                    editingCategory
                      ? setEditingCategory({
                          ...editingCategory,
                          description: e.target.value,
                        })
                      : setNewCategoryDescription(e.target.value)
                  }
                  placeholder="VD: Phở, bún, hủ tiếu..."
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowAddCategory(false);
                    setEditingCategory(null);
                    setNewCategoryName("");
                    setNewCategoryDescription("");
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn-submit"
                  onClick={handleSaveCategory}
                >
                  {editingCategory ? "Lưu thay đổi" : "Thêm danh mục"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(showAddProduct || editingProduct) && (
        <div
          className="ck-modal-overlay ingredient-form-modal"
          onClick={() => {
            setShowAddProduct(false);
            setEditingProduct(null);
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
                  {editingProduct ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
                </h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  setShowAddProduct(false);
                  setEditingProduct(null);
                }}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="form-body ck-max-h-[70vh] ck-overflow-y-auto">
              <div className="form-row">
                <div className="field">
                  <label>Mã sản phẩm *</label>
                  <input
                    type="text"
                    value={
                      (editingProduct || newProduct).productId ||
                      (editingProduct || newProduct).id ||
                      ""
                    }
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        productId: e.target.value,
                      })
                    }
                    placeholder="VD: PROD_PHO_01"
                    readOnly={!!editingProduct}
                  />
                  {!editingProduct && (
                    <span className="helper">Chữ hoa, không dấu</span>
                  )}
                </div>
                <div className="field">
                  <label>Danh mục *</label>
                  <select
                    value={
                      (editingProduct || newProduct).categoryId ??
                      (editingProduct || newProduct).category ??
                      ""
                    }
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        categoryId: e.target.value,
                      })
                    }
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Tên sản phẩm *</label>
                <input
                  type="text"
                  value={
                    (editingProduct || newProduct).productName ??
                    (editingProduct || newProduct).name ??
                    ""
                  }
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      productName: e.target.value,
                    })
                  }
                  placeholder="VD: Phở bò đặc biệt"
                />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Giá bán (đ) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={
                      (editingProduct || newProduct).sellingPrice ??
                      (editingProduct || newProduct).price ??
                      ""
                    }
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        sellingPrice: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="field">
                  <label>Đơn vị *</label>
                  <select
                    value={(editingProduct || newProduct).baseUnit ?? ""}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, baseUnit: e.target.value })
                    }
                  >
                    <option value="">-- Chọn đơn vị --</option>
                    {salesGrouped.map(([groupName, items]) => (
                      <optgroup key={groupName} label={groupName}>
                        {items.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
              <div className="sep" />
              <div className="section-label">
                Công thức nguyên liệu
                <span className="section-helper">
                  Tùy chọn, có thể thêm sau
                </span>
              </div>
              {(newProduct.ingredients || []).length === 0 ? (
                <div className="field" style={{ marginBottom: 8 }}>
                  <div
                    className="product-add-ing-btn"
                    onClick={() =>
                      setNewProduct((p) => ({
                        ...p,
                        ingredients: [
                          ...(p.ingredients || []),
                          { ingredientId: "", amountNeeded: 0.1 },
                        ],
                      }))
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setNewProduct((p) => ({
                          ...p,
                          ingredients: [
                            ...(p.ingredients || []),
                            { ingredientId: "", amountNeeded: 0.1 },
                          ],
                        }));
                      }
                    }}
                  >
                    <Plus size={14} />
                    Thêm nguyên liệu vào công thức
                  </div>
                </div>
              ) : (
                <>
                  {(newProduct.ingredients || []).map((row, idx) => (
                    <div key={idx} className="formula-row">
                      <div className="field">
                        {idx === 0 && <label>Nguyên liệu</label>}
                        <select
                          value={row.ingredientId ?? ""}
                          onChange={(e) =>
                            setNewProduct((p) => ({
                              ...p,
                              ingredients: p.ingredients.map((it, i) =>
                                i === idx
                                  ? { ...it, ingredientId: e.target.value }
                                  : it,
                              ),
                            }))
                          }
                        >
                          <option value="">-- Chọn nguyên liệu --</option>
                          {ingredients.map((ing) => (
                            <option
                              key={ing.id ?? ing.ingredientId}
                              value={ing.ingredientId ?? ing.id}
                            >
                              {ing.ingredientName ??
                                ing.name ??
                                ing.ingredientId ??
                                ing.id}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        {idx === 0 && <label>Lượng dùng</label>}
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={row.amountNeeded ?? ""}
                          onChange={(e) =>
                            setNewProduct((p) => ({
                              ...p,
                              ingredients: p.ingredients.map((it, i) =>
                                i === idx
                                  ? {
                                      ...it,
                                      amountNeeded: Number(e.target.value) || 0,
                                    }
                                  : it,
                              ),
                            }))
                          }
                          placeholder="0.1"
                        />
                      </div>
                      <button
                        type="button"
                        className="formula-row-rm"
                        onClick={() =>
                          setNewProduct((p) => ({
                            ...p,
                            ingredients: p.ingredients.filter(
                              (_, i) => i !== idx,
                            ),
                          }))
                        }
                        title="Xóa dòng"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="product-add-ing-btn"
                    onClick={() =>
                      setNewProduct((p) => ({
                        ...p,
                        ingredients: [
                          ...(p.ingredients || []),
                          { ingredientId: "", amountNeeded: 0.1 },
                        ],
                      }))
                    }
                  >
                    <Plus size={14} />
                    Thêm nguyên liệu vào công thức
                  </button>
                </>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowAddProduct(false);
                    setEditingProduct(null);
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn-submit"
                  onClick={handleSaveProduct}
                >
                  {editingProduct ? "Cập nhật công thức" : "Tạo sản phẩm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <X size={18} />
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

              <div className="form-row form-row--single">
                <div className="field">
                  <label>Đơn vị</label>
                  <select
                    value={ingredientForm.unit}
                    onChange={(e) =>
                      setIngredientForm({
                        ...ingredientForm,
                        unit: e.target.value,
                      })
                    }
                  >
                    <option value="">-- Chọn đơn vị --</option>
                    {baseGrouped.map(([groupName, items]) => (
                      <optgroup key={groupName} label={groupName}>
                        {items.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {editingIngredient && (
                <div className="form-row form-row--single">
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

      {(ingredientDetailLoading || detailIngredient !== null) && (
        <div
          className="ck-modal-overlay"
          onClick={() => {
            setDetailIngredient(null);
            setIngredientDetailLoading(false);
          }}
          role="presentation"
        >
          <div
            className="ck-modal-box ck-max-w-md ck-w-full ck-p-8"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="ck-flex ck-items-center ck-justify-between ck-mb-6">
              <h3 className="ck-text-2xl ck-font-black ck-text-white">
                Chi tiết nguyên liệu
              </h3>
              <button
                type="button"
                className="ck-btn ck-p-2 ck-rounded-lg"
                onClick={() => {
                  setDetailIngredient(null);
                  setIngredientDetailLoading(false);
                }}
                style={{ background: "none", border: "none" }}
              >
                <X size={24} className="ck-text-gray-400" />
              </button>
            </div>
            {ingredientDetailLoading ? (
              <p className="ck-text-gray-400">Đang tải...</p>
            ) : detailIngredient ? (
              <div className="ck-space-y-4">
                <div>
                  <span className="ck-text-sm ck-text-gray-500">Tên</span>
                  <p className="ck-font-semibold ck-text-white">
                    {detailIngredient.name ?? detailIngredient.ingredientName}
                  </p>
                </div>
                <div>
                  <span className="ck-text-sm ck-text-gray-500">Mã</span>
                  <p className="ck-mono ck-text-gray-400">
                    {detailIngredient.ingredientId ?? detailIngredient.id}
                  </p>
                </div>
                <div>
                  <span className="ck-text-sm ck-text-gray-500">
                    Tồn kho / Ngưỡng tối thiểu
                  </span>
                  <p className="ck-text-white">
                    {Number(detailIngredient.kitchenStock).toLocaleString()} /{" "}
                    {Number(detailIngredient.minThreshold).toLocaleString()}{" "}
                    {labelFor(detailIngredient.unit || "KG")}
                  </p>
                </div>
                <div>
                  <span className="ck-text-sm ck-text-gray-500">
                    Đơn giá (VND)
                  </span>
                  <p className="ck-mono ck-text-white">
                    {Number(detailIngredient.unitCost).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="ck-text-sm ck-text-gray-500">
                    Giá trị tồn (VND)
                  </span>
                  <p className="ck-mono ck-text-white">
                    {(
                      (Number(detailIngredient.kitchenStock) || 0) *
                      (Number(detailIngredient.unitCost) || 0)
                    ).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="ck-text-sm ck-text-gray-500">
                    Trạng thái
                  </span>
                  <p>
                    <span
                      className={`ck-badge ${
                        getIngredientStatus(detailIngredient) === "empty"
                          ? "ck-badge-red"
                          : getIngredientStatus(detailIngredient) === "low"
                            ? "ck-badge-yellow"
                            : "ck-badge-green"
                      }`}
                    >
                      {getIngredientStatus(detailIngredient) === "empty"
                        ? "Hết hàng"
                        : getIngredientStatus(detailIngredient) === "low"
                          ? "Sắp hết"
                          : "Đủ hàng"}
                    </span>
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {detailProduct !== null && (
        <div
          className="ck-modal-overlay ingredient-form-modal"
          onClick={() => setDetailProduct(null)}
          role="presentation"
        >
          <div
            className="ck-modal-box ingredient-form-box product-detail-box ck-max-w-lg ck-w-full"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="form-header">
              <div>
                <h3>Chi tiết sản phẩm</h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setDetailProduct(null)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="form-body ck-max-h-[70vh] ck-overflow-y-auto">
              <div className="form-row">
                <div className="field">
                  <label>Mã sản phẩm</label>
                  <div className="product-detail-value">
                    {detailProduct.productId ?? detailProduct.id ?? "—"}
                  </div>
                </div>
                <div className="field">
                  <label>Danh mục</label>
                  <div className="product-detail-value">
                    {getProductCategoryName(detailProduct) || "—"}
                  </div>
                </div>
              </div>
              <div className="field">
                <label>Tên sản phẩm</label>
                <div className="product-detail-value product-detail-value--name">
                  {detailProduct.productName ?? detailProduct.name ?? "—"}
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Giá bán (đ)</label>
                  <div className="product-detail-value product-detail-value--price">
                    {Number(
                      detailProduct.sellingPrice ?? detailProduct.price ?? 0,
                    ).toLocaleString("vi-VN")}
                    ₫
                  </div>
                </div>
                <div className="field">
                  <label>Đơn vị</label>
                  <div className="product-detail-value">
                    {detailProduct.baseUnit
                      ? labelFor(detailProduct.baseUnit)
                      : "—"}
                  </div>
                </div>
              </div>
              <div className="sep" />
              <div className="section-label">Công thức nguyên liệu</div>
              {detailProductFormulaLoading ? (
                <div className="product-detail-loading">Đang tải...</div>
              ) : detailProductFormula.length === 0 ? (
                <div className="product-detail-empty">
                  <Package size={28} />
                  <span>Chưa thêm nguyên liệu vào công thức</span>
                </div>
              ) : (
                <div className="product-detail-formula-list">
                  {detailProductFormula.map((ing, i) => (
                    <div key={i} className="product-detail-formula-item">
                      <div className="product-detail-formula-icon">
                        <Package size={18} />
                      </div>
                      <div className="product-detail-formula-info">
                        <span className="product-detail-formula-name">
                          {ing.ingredientName ??
                            ing.name ??
                            ing.ingredientId ??
                            "—"}
                        </span>
                      </div>
                      <div className="product-detail-formula-qty">
                        <span className="product-detail-formula-amount">
                          {Number(
                            ing.amountNeeded ?? ing.amount ?? 0,
                          ).toLocaleString("vi-VN")}
                        </span>
                        <span className="product-detail-formula-unit">
                          {labelFor(ing.unit || "KG")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-submit"
                  onClick={() => {
                    const p = detailProduct;
                    const catNameForProduct = getProductCategoryName(p);
                    const productId = String(p.productId ?? p.id ?? "");
                    setDetailProduct(null);
                    setEditingProduct(p);
                    setNewProduct({
                      productId: productId || (p.productId ?? p.id),
                      productName: p.productName ?? p.name,
                      categoryId:
                        p.categoryId ??
                        categories.find((c) => c.name === catNameForProduct)
                          ?.id ??
                        "",
                      sellingPrice: String(p.sellingPrice ?? p.price ?? ""),
                      baseUnit: p.baseUnit ?? "",
                      isActive: p.isActive !== false,
                      ingredients:
                        detailProductFormula.length > 0
                          ? detailProductFormula.map((i) => ({
                              ingredientId: String(
                                i.ingredientId ?? i.id ?? "",
                              ).trim(),
                              amountNeeded:
                                Number(i.amountNeeded ?? i.amount ?? 0) || 0.1,
                              ingredientName: i.ingredientName ?? null,
                              unit: i.unit ?? null,
                            }))
                          : [
                              {
                                ingredientId: "",
                                amountNeeded: 0.1,
                                ingredientName: null,
                                unit: null,
                              },
                            ],
                    });
                    setShowAddProduct(true);
                  }}
                >
                  Cập nhật sản phẩm
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setDetailProduct(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div
          className="ck-modal-overlay ingredient-form-modal"
          onClick={() => !importSubmitting && setShowImportModal(false)}
          role="presentation"
        >
          <div
            className="ck-modal-box ingredient-form-box import-modal-box--wide ck-w-full"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="form-header">
              <div>
                <h3>Tạo phiếu nhập kho</h3>
              </div>
              <button
                type="button"
                className="btn-close import-modal-close"
                disabled={importSubmitting}
                onClick={() => setShowImportModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitImport} className="form-body">
              <div className="field">
                <label>Ghi chú phiếu nhập</label>
                <textarea
                  className="ck-input ck-w-full ck-min-h-[64px] ck-py-2.5 ck-px-3 ck-rounded-xl ck-resize-none"
                  placeholder="VD: Nhập hàng thịt đợt 1..."
                  value={importForm.note}
                  onChange={(e) =>
                    setImportForm((prev) => ({ ...prev, note: e.target.value }))
                  }
                />
              </div>

              <div className="field import-lines-field">
                <div className="import-lines-intro">
                  <span className="import-lines-intro__title">
                    Danh sách nguyên liệu
                  </span>
                  <span className="import-lines-intro__badge">
                    {importForm.items.length} dòng
                  </span>
                </div>
                <p className="import-lines-intro__hint">
                  Chọn nguyên liệu, đơn vị nhập, số lượng và đơn giá — hệ thống
                  tự tính thành tiền từng dòng.
                </p>

                <div className="import-lines-stack">
                  {importForm.items.map((row, index) => {
                    const selectedIng = ingredients.find(
                      (x) =>
                        String(x.ingredientId ?? x.id) ===
                        String(row.ingredientId),
                    );
                    const qty = Number(row.quantity) || 0;
                    const price = Number(row.importPrice) || 0;
                    const lineTotal = qty * price;
                    const stockVal =
                      selectedIng != null
                        ? Number(
                            selectedIng.kitchenStock ??
                              selectedIng.stockQuantity ??
                              selectedIng.stock ??
                              0,
                          ) || 0
                        : null;
                    return (
                      <div key={index} className="import-line-card">
                        <div className="import-line-card__head">
                          <div className="import-line-card__index">
                            <span
                              className="import-line-card__index-icon"
                              aria-hidden
                            >
                              <Package size={14} />
                            </span>
                            Dòng {index + 1}
                          </div>
                          {selectedIng ? (
                            <div className="import-line-card__meta">
                              Tồn hiện tại:{" "}
                              <strong>
                                {stockVal.toLocaleString("vi-VN")}{" "}
                                {labelFor(selectedIng.unit || row.unit || "KG")}
                              </strong>
                            </div>
                          ) : (
                            <div className="import-line-card__meta import-line-card__meta--muted">
                              Chưa chọn nguyên liệu
                            </div>
                          )}
                          <button
                            type="button"
                            className="import-line-card__remove import-remove-row-btn"
                            onClick={() => handleRemoveImportRow(index)}
                            title="Xóa dòng"
                            aria-label="Xóa dòng"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="import-line-card__body">
                          <div className="import-line-block">
                            <span className="import-line-label">
                              Nguyên liệu
                            </span>
                            <select
                              className="import-line-select"
                              value={row.ingredientId}
                              onChange={(e) =>
                                handleImportRowChange(
                                  index,
                                  "ingredientId",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="">— Chọn nguyên liệu —</option>
                              {ingredients.map((ing) => {
                                const nm =
                                  ing.name ??
                                  ing.ingredientName ??
                                  ing.ingredientId ??
                                  ing.id;
                                return (
                                  <option
                                    key={ing.ingredientId ?? ing.id}
                                    value={ing.ingredientId ?? ing.id}
                                  >
                                    {nm}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div className="import-line-grid">
                            <div className="import-line-block">
                              <span className="import-line-label">
                                Đơn vị nhập
                              </span>
                              <select
                                className="import-line-select"
                                value={row.unit ?? ""}
                                onChange={(e) =>
                                  handleImportRowChange(
                                    index,
                                    "unit",
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="">— Chọn ĐVT —</option>
                                {allGrouped.map(([groupName, items]) => (
                                  <optgroup key={groupName} label={groupName}>
                                    {items.map((u) => (
                                      <option key={u.value} value={u.value}>
                                        {u.label}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </div>
                            <div className="import-line-block">
                              <span className="import-line-label">
                                Số lượng
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="import-line-input"
                                value={row.quantity}
                                onChange={(e) =>
                                  handleImportRowChange(
                                    index,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                placeholder="0"
                              />
                            </div>
                            <div className="import-line-block">
                              <span className="import-line-label">
                                Đơn giá (đ)
                              </span>
                              <input
                                type="number"
                                min="0"
                                className="import-line-input"
                                value={row.importPrice}
                                onChange={(e) =>
                                  handleImportRowChange(
                                    index,
                                    "importPrice",
                                    e.target.value,
                                  )
                                }
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <div className="import-line-foot">
                            <span className="import-line-foot__label">
                              Thành tiền dòng
                            </span>
                            <span className="import-line-foot__value">
                              {lineTotal.toLocaleString("vi-VN")}đ
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="import-grand-total">
                  <span className="import-grand-total__label">
                    Tổng giá trị phiếu (ước tính)
                  </span>
                  <span className="import-grand-total__value">
                    {importGrandTotal.toLocaleString("vi-VN")}đ
                  </span>
                </div>

                <button
                  type="button"
                  className="import-add-row-btn ck-w-full ck-py-2.5 ck-px-3 ck-text-sm ck-flex ck-items-center ck-justify-center ck-gap-2 ck-transition-colors"
                  onClick={handleAddImportRow}
                >
                  <Plus size={13} />
                  Thêm dòng nguyên liệu
                </button>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => !importSubmitting && setShowImportModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={importSubmitting}
                >
                  {importSubmitting ? "Đang tạo phiếu..." : "Tạo phiếu nhập"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
