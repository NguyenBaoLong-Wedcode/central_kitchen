/**
 * ====================================================================
 * API SERVICE - ULTIMATE STABLE VERSION
 * Version: 2026 - Real API Integration (No more fake users)
 * ====================================================================
 */

const BASE_URL =
  process.env.NODE_ENV === "development"
    ? ""
    : process.env.REACT_APP_API_URL || "http://localhost:8081";
const TOKEN_KEY = "ck_token";
const USER_KEY = "ck_user";

// --- QUẢN LÝ LOCAL STORAGE ---
const storage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),

  setToken: (t) =>
    t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  },
  setUser: (u) =>
    u
      ? localStorage.setItem(USER_KEY, JSON.stringify(u))
      : localStorage.removeItem(USER_KEY),
};

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

/**
 * Suy ra lỗi theo trường từ nội dung backend (email, mật khẩu, OTP, tên đăng nhập).
 */
function messageByField(s) {
  if (
    s.includes("bị khóa") ||
    s.includes("bi khoa") ||
    s.includes("vô hiệu hóa") ||
    s.includes("vo hieu hoa") ||
    s.includes("forbidden")
  )
    return "Đăng nhập thất bại! Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa.";
  if (
    s.includes("email") ||
    s.includes("gmail") ||
    s.includes("mail") ||
    s.includes("user not found") ||
    s.includes("not found")
  )
    return "Email không đúng.";
  if (
    s.includes("password") ||
    s.includes("mật khẩu") ||
    s.includes("wrong") ||
    s.includes("sai mật khẩu") ||
    s.includes("invalid password")
  )
    return "Mật khẩu không đúng.";
  if (
    s.includes("username") ||
    s.includes("tên đăng nhập") ||
    s.includes("login")
  )
    return "Tên đăng nhập không đúng.";
  if (s.includes("otp") || s.includes("mã") || s.includes("code"))
    return "Mã OTP không đúng.";
  return null;
}

/**
 * Lỗi theo ngữ cảnh API (khi backend trả Forbidden/401/400 chung).
 */
function messageByPath(path, status) {
  const p = (path || "").toLowerCase();
  if (p.includes("/auth/login"))
    return "Tên đăng nhập hoặc mật khẩu không đúng.";
  if (p.includes("/auth/forgot-password")) return "Email không đúng.";
  if (p.includes("/auth/verify-otp")) return "Mã OTP không đúng.";
  if (p.includes("/auth/reset-password"))
    return "Mã OTP không đúng hoặc mật khẩu mới không hợp lệ.";
  if (status === 403 && p.includes("/admin/accounts"))
    return "Bạn không có quyền thực hiện thao tác này. Chỉ tài khoản Admin mới thực hiện được — hãy đăng nhập bằng tài khoản Admin hoặc kiểm tra cấu hình quyền trên backend.";
  if (status === 403 && p.includes("/notifications/broadcast"))
    return "Chỉ tài khoản Admin mới có thể phát loa thông báo tới hệ thống.";
  return null;
}

/** Từ payload login/verify-otp: tên & mã cửa hàng (backend có nhiều kiểu trường). */
function extractStoreFromAuthPayload(info) {
  if (!info || typeof info !== "object")
    return { storeName: null, storeId: null };
  const stores = info.stores;
  if (Array.isArray(stores) && stores.length > 0) {
    const first = stores[0];
    if (typeof first === "string") {
      const n = first.trim();
      return {
        storeName: n || null,
        storeId: info.storeId ?? info.store_id ?? null,
      };
    }
    if (first && typeof first === "object") {
      const n = first.name ?? first.storeName ?? first.store_name;
      const id = first.storeId ?? first.id ?? first.store_id;
      return {
        storeName: n && String(n).trim() ? String(n).trim() : null,
        storeId: id ?? info.storeId ?? info.store_id ?? null,
      };
    }
  }
  const storeNames = info.storeNames;
  if (Array.isArray(storeNames) && storeNames.length > 0) {
    const n = storeNames.find((s) => s && String(s).trim());
    if (n)
      return {
        storeName: String(n).trim(),
        storeId: info.storeId ?? info.store_id ?? null,
      };
  }
  const sn =
    info.storeName ??
    info.store_name ??
    info.assignedStoreName ??
    info.managedStoreName;
  if (sn && String(sn).trim()) {
    return {
      storeName: String(sn).trim(),
      storeId: info.storeId ?? info.store_id ?? null,
    };
  }
  return { storeName: null, storeId: info.storeId ?? info.store_id ?? null };
}

function toUserFriendlyError(res, data, path) {
  const status = res.status;
  const raw =
    data.message ||
    data.error ||
    (typeof data.msg === "string" ? data.msg : null) ||
    res.statusText ||
    "";
  const s = String(raw).trim().toLowerCase();

  const byField = messageByField(s);
  if (byField) return byField;

  if (status === 401) {
    const byPath = messageByPath(path, status);
    if (byPath) return byPath;
    return "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.";
  }
  if (status === 403) {
    const byPath = messageByPath(path, status);
    if (byPath) return byPath;
    return "Bạn không có quyền thực hiện thao tác này.";
  }
  if (status === 404) return "Không tìm thấy dữ liệu.";
  if (status === 400) {
    const byPath = messageByPath(path);
    if (byPath) return byPath;
    return raw || "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.";
  }
  if (status === 422) return "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.";
  if (status >= 500) return "Lỗi hệ thống. Vui lòng thử lại sau.";
  if (raw) return typeof raw === "string" ? raw : JSON.stringify(raw);
  return "Đã xảy ra lỗi. Vui lòng thử lại.";
}

/** Gọi API: tự gắn Bearer token nếu có. Hỗ trợ response JSON hoặc text (trả về { message } nếu là text). */
function request(path, options = {}) {
  const url = `${BASE_URL.replace(/\/$/, "")}${path}`;
  const token = storage.getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  return fetch(url, { ...options, headers }).then(async (res) => {
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }
    const friendlyMessage = toUserFriendlyError(res, data, path);
    if (res.status === 401) {
      setToken(null);
      setStoredUser(null);
      throw new Error(friendlyMessage);
    }
    if (!res.ok) {
      throw new Error(friendlyMessage);
    }
    return data;
  });
}

// --- BẢO HIỂM MẢNG (CHỐNG LỖI .FILTER) ---
const toArray = (res) =>
  Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

// --- CHUẨN HÓA ROLE (GIỐNG BẠN CỦA BẠN) ---
function normalizeRole(role) {
  if (!role) return "franchise";
  const r = String(role).toUpperCase().replace(/-/g, "_");
  if (r === "ADMIN") return "admin";
  if (r === "MANAGER") return "manager";
  if (r === "KITCHEN_MANAGER") return "kitchen";
  if (r === "STORE_MANAGER") return "franchise";
  if (r === "COORDINATOR") return "supply";
  return r.toLowerCase();
}

// =========================================================
// [API OBJECT CHÍNH]
// =========================================================

const auth = {
  isAuthenticated: () => !!storage.getToken(),
  getStoredUser,

  /**
   * Đăng nhập (bước 1).
   * Backend trả: { token, username, role } hoặc OTP: { token: null, message: "OTP_REQUIRED", username }.
   */
  async login(username, password) {
    const res = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    const raw = res?.data ?? res;
    const requiresOtp = Boolean(
      raw.requiresOtp ?? res.requiresOtp ?? res.message === "OTP_REQUIRED",
    );
    const token =
      raw.token ??
      raw.accessToken ??
      raw.access_token ??
      res.token ??
      res.accessToken ??
      res.access_token;

    if (requiresOtp || !token || typeof token !== "string") {
      return {
        requiresOtp: true,
        username: res.username ?? username,
      };
    }
    const info = raw ?? res;
    setToken(token);
    const { storeName, storeId } = extractStoreFromAuthPayload(info);
    const user = {
      id: info.userId ?? info.id ?? info.username,
      username: info.username ?? res.username,
      name: info.fullName ?? info.name ?? info.username ?? res.username,
      fullName: info.fullName ?? info.name ?? null,
      role: normalizeRole(info.role ?? res.role),
      roleRaw: info.role ?? res.role,
      email: info.email ?? res.email ?? undefined,
      ...(storeName ? { storeName } : {}),
      ...(storeId != null && String(storeId).trim() !== ""
        ? { storeId: String(storeId).trim() }
        : {}),
    };

    storage.setToken(token);
    storage.setUser(user);
    return user;
  },

  /**
   * Xác nhận OTP đăng nhập. Backend nhận { username, otp }, trả { token, username, role, message }.
   */
  async verifyOtp(otp, emailOrUsername) {
    const res = await request("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({
        username: emailOrUsername,
        otp,
      }),
    });
    const token = res.token ?? res.accessToken ?? res.access_token;
    if (token && typeof token === "string") {
      const info = res?.data ?? res;
      setToken(token);
      const { storeName, storeId } = extractStoreFromAuthPayload(info);
      const user = {
        id: res.userId ?? info.userId ?? res.username,
        username: res.username ?? emailOrUsername,
        name: res.fullName ?? info.fullName ?? res.username ?? emailOrUsername,
        fullName: res.fullName ?? info.fullName ?? res.name ?? null,
        role: normalizeRole(res.role ?? info.role),
        roleRaw: res.role ?? info.role,
        email: info.email ?? res.email ?? undefined,
        ...(storeName ? { storeName } : {}),
        ...(storeId != null && String(storeId).trim() !== ""
          ? { storeId: String(storeId).trim() }
          : {}),
      };
      setStoredUser(user);
      return user;
    }
    return res;
  },

  /**
   * Đăng ký tài khoản. Request: { username, password, fullName, role, email, storeId }.
   * Trả message hoặc AccountResponse (accountId, username, role, isActive, userId, fullName, email).
   */
  async register(data) {
    const raw = (data.role || "KITCHEN_MANAGER")
      .toUpperCase()
      .replace(/[\s-]/g, "_");
    const roleEnum =
      {
        FRANCHISE: "STORE_MANAGER",
        KITCHEN_STAFF: "KITCHEN_MANAGER",
        KITCHEN: "KITCHEN_MANAGER",
      }[raw] || raw;
    const res = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username: data.username?.trim(),
        password: data.password,
        fullName: data.fullName ?? data.name?.trim(),
        role: roleEnum,
        email: data.email?.trim() || undefined,
        storeId: data.storeId?.trim() || undefined,
      }),
    });
    return res.message ?? res.msg ?? res;
  },

  /**
   * Cập nhật hồ sơ cá nhân (các role trừ Admin).
   * PUT /api/auth/update-profile
   * @typedef {Object} UpdateProfileRequest
   * @property {string} fullName - Họ tên (vd: "Nguyễn Văn B (Đã đổi tên)")
   * @property {string} email - Email (vd: "nguyenvanb_new@gmail.com")
   */
  async updateProfile(data) {
    const body = {
      fullName: (data.fullName ?? data.name ?? "").trim(),
      email: (data.email ?? "").trim(),
    };
    const res = await request("/api/auth/update-profile", {
      method: "PUT",
      body: JSON.stringify(body),
    });
    const current = getStoredUser();
    if (res && current) {
      const raw = res?.data ?? res;
      const fullName =
        raw.fullName ??
        raw.name ??
        res.fullName ??
        res.name ??
        current.fullName ??
        current.name;
      const { storeName, storeId } = extractStoreFromAuthPayload(raw);
      setStoredUser({
        ...current,
        name: fullName ?? current.name,
        fullName: fullName ?? null,
        email: raw.email ?? res.email ?? current.email,
        ...(storeName ? { storeName } : {}),
        ...(storeId != null && String(storeId).trim() !== ""
          ? { storeId: String(storeId).trim() }
          : {}),
      });
    }
    return res;
  },

  /**
   * Đổi mật khẩu trong Settings (khi đã đăng nhập).
   * PUT /api/settings/change-password
   * @typedef {Object} ChangePasswordRequest
   * @property {string} oldPassword - Mật khẩu hiện tại (vd: "123")
   * @property {string} newPassword - Mật khẩu mới (vd: "MatKhaumoi@2026")
   * @property {string} confirmPassword - Xác nhận mật khẩu mới (vd: "MatKhaumoi@2026")
   */
  async changePassword(oldPassword, newPassword, confirmPassword) {
    const res = await request("/api/settings/change-password", {
      method: "PUT",
      body: JSON.stringify({
        oldPassword: oldPassword ?? "",
        newPassword: newPassword ?? "",
        confirmPassword: confirmPassword ?? "",
      }),
    });
    return res.message ?? res.msg ?? res;
  },

  /** Đăng xuất: xóa token và user */
  logout() {
    setToken(null);
    setStoredUser(null);
  },

  // --- Quản lý Sản phẩm ---
  getProducts: async () => toArray(await request("/api/products")),
  getMasterProducts: async () => toArray(await request("/api/products")),

  createProduct: (b) =>
    request("/api/products", { method: "POST", body: JSON.stringify(b) }),
  createMasterProduct: (b) =>
    request("/api/products", { method: "POST", body: JSON.stringify(b) }),
  updateProduct: (id, b) =>
    request(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  updateMasterProduct: (id, b) =>
    request(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: "DELETE" }),
  deleteMasterProduct: (id) =>
    request(`/api/products/${id}`, { method: "DELETE" }),

  // --- Quản lý Cửa hàng ---
  getStores: async () => {
    try {
      const res = await request("/api/stores/all");
      return Array.isArray(res) ? res : (res?.data ?? []);
    } catch {
      return [];
    }
  },

  /**
   * Tạo cửa hàng (admin). Request: { name, address, phone, type (KIOSK/FLAGSHIP) }.
   * Response: StoreResponse { storeId, name, address, phone, type, isActive }.
   */
  createStore: (b) =>
    request("/api/stores", {
      method: "POST",
      body: JSON.stringify({
        name: b.name?.trim(),
        address: (b.address || "").trim(),
        phone: (b.phone || "").trim(),
        type: (b.type || "FLAGSHIP").toUpperCase(),
      }),
    }),
  updateStore: (id, b) =>
    request(`/api/stores/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: b.name,
        phone: b.phone,
        address: b.address,
      }),
    }),

  deleteStore: (id) => request(`/api/stores/${id}`, { method: "DELETE" }),

  // --- Quản lý Danh mục ---
  getCategories: async () => {
    try {
      const res = await request("/api/categories");
      return Array.isArray(res) ? res : res?.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Tạo danh mục sản phẩm. POST /api/categories
   * Body: { name, description }
   * Response: { id, name, description }
   */
  createCategory: (b) =>
    request("/api/categories", {
      method: "POST",
      body: JSON.stringify({
        name: (b.name ?? "").trim(),
        description: (b.description ?? "").trim() || "",
      }),
    }),
  deleteCategory: (id) =>
    request(`/api/categories/${id}`, { method: "DELETE" }),

  // --- Nguyên liệu & Kho ---
  getIngredients: async () => [],
  createIngredient: (b) =>
    request("/api/ingredients", { method: "POST", body: JSON.stringify(b) }),
  updateIngredient: (id, b) =>
    request(`/api/ingredients/${id}`, {
      method: "PUT",
      body: JSON.stringify(b),
    }),
  deleteIngredient: (id) =>
    request(`/api/ingredients/${id}`, { method: "DELETE" }),
  getManagerInventory: async () => [],
  importInventory: (b) =>
    request("/api/inventory/import", {
      method: "POST",
      body: JSON.stringify(b),
    }),

  // --- Đơn hàng (kênh Admin / bếp trung tâm) ---
  getOrdersHistory: async (sId) =>
    toArray(await request(`/api/orders/history?storeId=${sId}`)),
  addOrder: (b) =>
    request("/api/orders/standard", {
      method: "POST",
      body: JSON.stringify(b),
    }),
  addOrderUrgent: (b) =>
    request("/api/orders/urgent", { method: "POST", body: JSON.stringify(b) }),
  cancelOrder: (id) => request(`/api/orders/${id}/cancel`, { method: "PUT" }),

  // --- Công thức (BOM) ---

  /** Lấy toàn bộ công thức (dùng cho màn hình quản lý/ADMIN). */
  getManagerRecipes: async () => toArray(await request("/api/formulas")),

  /** Xem Công Thức của 1 sản phẩm theo productId. GET /api/formulas/{productId} */
  getRecipeOfProduct: (pId) => request(`/api/formulas/${pId}`),

  /**
   * Lưu / Cập nhật Công thức (Upsert).
   * POST /api/formulas
   */
  saveRecipe: (b) =>
    request("/api/formulas", { method: "POST", body: JSON.stringify(b) }),

  /** Xóa Công Thức của 1 sản phẩm. DELETE /api/formulas/{productId} */
  deleteRecipe: (productId) =>
    request(`/api/formulas/${productId}`, { method: "DELETE" }),

  upsertFormula: (body) =>
    request("/api/formulas", {
      method: "POST",
      body: JSON.stringify({
        productId: body.productId,
        ingredients: (body.ingredients || []).map((i) => ({
          ingredientId: i.ingredientId,
          amountNeeded: i.amountNeeded,
        })),
      }),
    }),
  getFormula: (productId) => request(`/api/formulas/${productId}`),
  deleteFormula: (productId) =>
    request(`/api/formulas/${productId}`, { method: "DELETE" }),

  // --- Bếp (Kitchen) ---
  getKitchenAggregation: () => request("/api/kitchen/orders"),
  // ✅ SỬA LẠI (unwrap ra mảng)
  confirmAggregation: (orderIds) =>
    request("/api/kitchen/aggregation/confirm", {
      method: "POST",
      body: JSON.stringify(orderIds),
    }),
  cook: (b) =>
    request("/api/kitchen/cook", { method: "POST", body: JSON.stringify(b) }),
  getActiveProductions: async () => api.getProductionRuns(),
  getProductionRuns: async () => {
    try {
      const res = await request("/api/kitchen/productions/active");
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      return list; // Trả thẳng list để hàm loadData xử lý map logic mới
    } catch (error) {
      console.error("Lỗi lấy danh sách mẻ nấu:", error);
      return [];
    }
  },
  updateProductionRunStatus: (id, s) =>
    request(`/api/production-runs/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: s }),
    }),
  // reportWastage: (b) =>
  //   request("/api/kitchen/wastage", {
  //     method: "POST",
  //     body: JSON.stringify(b),
  //   }),

  // --- Thống kê & Quy đổi ---
  getKPIStats: async () => {
    return await request("/api/manager/analytics/revenue");
  },

  /** Yêu cầu gửi OTP quên mật khẩu (email hoặc username) */
  async forgotPassword(emailOrUsername) {
    const res = await request("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: emailOrUsername }),
    });
    return res.message ?? res.msg ?? res;
  },

  /** Đặt lại mật khẩu bằng OTP. Body: { email, otp, newPassword }. */
  async resetPassword(otp, newPassword, emailOrUsername) {
    const res = await request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email: emailOrUsername,
        otp,
        newPassword,
      }),
    });
    return res.message ?? res.msg ?? res;
  },

  /** Lấy thông tin Role/Username hiện tại (Debug) */
  async checkMe() {
    return request("/api/auth/check-me", { method: "GET" });
  },
  getRevenueAnalytics: () => request("/api/manager/analytics/revenue"),

  // --- Báo cáo ---
  getReports: async () => toArray(await request("/api/reports")),
  createReport: (b) =>
    request("/api/reports/export", { method: "POST", body: JSON.stringify(b) }),

  // --- Hàm bổ trợ cũ ---
  getUsers: async () => [],
  saveUsers: async () => [],
  saveCategories: async () => [],
  saveProducts: async () => [],
};

// --- Products & Categories ---

function mapProduct(p) {
  return {
    id: p.productId || p.id,
    productId: p.productId,
    name: p.productName || p.name,
    productName: p.productName || p.name,
    category: p.categoryName || p.category || "",
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    price: Number(p.sellingPrice ?? p.price ?? 0),
    sellingPrice: Number(p.sellingPrice ?? p.price ?? 0),
    baseUnit: p.baseUnit || "TÔ",
    stock: p.stock ?? 0,
    min: p.min ?? 0,
    emoji: p.emoji || "🍽️",
    active: p.isActive !== false && p.active !== false,
    isActive: p.isActive !== false && p.active !== false,
  };
}

const productsApi = {
  async getList(params = {}) {
    const q = new URLSearchParams();
    if (params.page != null) q.set("page", params.page);
    if (params.limit != null) q.set("limit", params.limit);
    if (params.search) q.set("search", params.search);
    if (params.minPrice != null) q.set("minPrice", params.minPrice);
    if (params.maxPrice != null) q.set("maxPrice", params.maxPrice);
    const query = q.toString();
    const path = query ? `/api/products?${query}` : "/api/products";
    const res = await request(path);
    const list = Array.isArray(res)
      ? res
      : Array.isArray(res?.data)
        ? res.data
        : [];
    return (list || []).map(mapProduct);
  },

  async create(body) {
    const res = await request("/api/products", {
      method: "POST",
      body: JSON.stringify({
        productId: body.productId?.trim(),
        productName: body.productName ?? body.name?.trim(),
        categoryId: body.categoryId,
        sellingPrice: Number(body.sellingPrice ?? body.price ?? 0),
        baseUnit: (body.baseUnit || "TÔ").toUpperCase(),
        isActive: body.isActive !== false,
        ingredients: (body.ingredients || []).map((i) => ({
          ingredientId: i.ingredientId ?? i.id,
          amountNeeded: Number(i.amountNeeded ?? i.amount ?? 0),
        })),
      }),
    });
    return res;
  },
};

const categoriesApi = {
  async getList() {
    try {
      const res = await request("/api/categories");
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.content)) return res.content;
      if (Array.isArray(res?.categories)) return res.categories;
      if (process.env.NODE_ENV === "development" && res != null) {
        console.warn("[GET /api/categories] Response không phải mảng:", res);
      }
      return [];
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[GET /api/categories] Lỗi:", err?.message || err);
      }
      return [];
    }
  },

  async create(body) {
    return request("/api/categories", {
      method: "POST",
      body: JSON.stringify({
        name: (body.name ?? "").trim(),
        description: (body.description ?? "").trim() || "",
      }),
    });
  },
};

// --- Ingredients & Inventory ---

const ingredientsApi = {
  async getList() {
    try {
      const res = await request("/api/ingredients");
      return Array.isArray(res) ? res : res?.data || [];
    } catch {
      return [];
    }
  },

  async getById(id) {
    return request(`/api/ingredients/${encodeURIComponent(id)}`);
  },

  async create(body) {
    return request("/api/ingredients", {
      method: "POST",
      body: JSON.stringify({
        name: (body.name ?? "").trim(),
        kitchenStock: Number(body.kitchenStock) ?? 0,
        unit: (body.unit || "KG").toUpperCase(),
        unitCost: Number(body.unitCost) ?? 0,
        minThreshold: Number(body.minThreshold) ?? 0,
      }),
    });
  },

  async update(id, body) {
    return request(`/api/ingredients/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({
        name: (body.name ?? body.ingredientName ?? "").trim(),
        ingredientName: (body.name ?? body.ingredientName ?? "").trim(),
        unit: (body.unit || "KG").toUpperCase(),
        price: Number(body.unitCost ?? body.price) ?? 0,
        unitCost: Number(body.unitCost ?? body.price) ?? 0,
        stockQuantity: Number(body.kitchenStock ?? body.stockQuantity) ?? 0,
        kitchenStock: Number(body.kitchenStock ?? body.stockQuantity) ?? 0,
        minThreshold: Number(body.minThreshold) ?? 0,
        description: body.description?.trim() || undefined,
      }),
    });
  },
};

const inventoryApi = {
  async import(body) {
    return request("/api/inventory/import", {
      method: "POST",
      body: JSON.stringify({
        note: body.note || "",
        supplierId: body.supplierId || undefined,
        items: (body.items || []).map((i) => ({
          ingredientId: i.ingredientId ?? i.id,
          unit: (i.unit || "KG").toUpperCase(),
          quantity: Number(i.quantity) || 0,
          importPrice: Number(i.importPrice) || 0,
        })),
      }),
    });
  },
};

// --- Kitchen ---

const kitchenApi = {
  async cook(body) {
    return request("/api/kitchen/cook", {
      method: "POST",
      body: JSON.stringify({
        productId: body.productId ?? body.id,
        quantity: Number(body.quantity) || 1,
        note: body.note || undefined,
      }),
    });
  },
};

// --- API object thống nhất (tương thích code cũ) ---
const api = {
  init() {},

  isAuthenticated: () => auth.isAuthenticated(),
  login: (username, password) => auth.login(username, password),
  logout: () => auth.logout(),
  getStoredUser: () => auth.getStoredUser(),

  register: (data) => auth.register(data),
  updateProfile: (data) => auth.updateProfile(data),

  async getProducts(params) {
    return productsApi.getList(params || {});
  },

  async getIngredients() {
    return ingredientsApi.getList();
  },

  checkMe: () => auth.checkMe(),
  forgotPassword: (emailOrUsername) => auth.forgotPassword(emailOrUsername),
  verifyOtp: (otp, emailOrUsername) => auth.verifyOtp(otp, emailOrUsername),
  resetPassword: (otp, newPassword, emailOrUsername) =>
    auth.resetPassword(otp, newPassword, emailOrUsername),
  changePassword: (oldPassword, newPassword, confirmPassword) =>
    auth.changePassword(oldPassword, newPassword, confirmPassword),

  async getCategories() {
    return categoriesApi.getList();
  },

  async getStores() {
    try {
      const res = await request("/api/stores");
      return Array.isArray(res) ? res : (res?.data ?? []);
    } catch {
      return [];
    }
  },

  async getStoresAll() {
    try {
      const res = await request("/api/stores/all");
      const arr = Array.isArray(res) ? res : (res?.data ?? []);
      return arr.map((s) => ({
        ...s,
        isActive: s.isActive ?? s.active ?? true,
      }));
    } catch {
      return [];
    }
  },

  async getEmptyStores() {
    try {
      const res = await request("/api/stores/empty-stores");
      const arr = Array.isArray(res) ? res : (res?.data ?? []);
      return arr.map((s) => ({
        ...s,
        isActive: s.isActive ?? s.active ?? true,
      }));
    } catch {
      return [];
    }
  },

  createStore(b) {
    const body = {
      name: (b.name ?? "").trim(),
      address: (b.address ?? "").trim(),
      phone: (b.phone ?? "").trim(),
      type: (b.type || "FRANCHISE").toUpperCase(),
    };
    return request("/api/stores", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updateStore(id, b) {
    const body = {
      name: (b.name ?? "").trim(),
      address: (b.address ?? "").trim(),
      phone: (b.phone ?? "").trim(),
      type: (b.type || "FRANCHISE").toUpperCase(),
    };
    return request(`/api/stores/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  deleteStore(id) {
    return request(`/api/stores/${id}`, { method: "DELETE" });
  },

  async updateStoreActive(storeId, isActive) {
    const id = String(storeId ?? "").trim();
    if (!id) throw new Error("Không có mã cửa hàng.");
    return request(`/api/store/settings/${encodeURIComponent(id)}/active`, {
      method: "PUT",
      body: JSON.stringify({ isActive: Boolean(isActive) }),
    });
  },

  assignStoreManager(storeId, accountId) {
    const sid = String(storeId ?? "").trim();
    const aid = String(accountId ?? "").trim();
    if (!sid) throw new Error("Không có mã cửa hàng.");
    if (!aid) throw new Error("Không có mã tài khoản.");
    const params = new URLSearchParams({ accountId: aid });
    return request(
      `/api/stores/${encodeURIComponent(sid)}/assign-manager?${params.toString()}`,
      { method: "PUT" },
    );
  },

  async getStoreCart() {
    try {
      const res = await request("/api/store/cart");
      const items = Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
      return items;
    } catch {
      return [];
    }
  },

  addToStoreCart(body) {
    return request("/api/store/cart/add", {
      method: "POST",
      body: JSON.stringify({
        productId: body.productId ?? body.id,
        quantity: Number(body.quantity) ?? 1,
      }),
    });
  },

  updateStoreCartItem(body) {
    return request("/api/store/cart/update", {
      method: "PUT",
      body: JSON.stringify({
        productId: body.productId ?? body.id,
        quantity: Number(body.quantity) ?? 0,
      }),
    });
  },

  removeFromStoreCart(productId) {
    return request(`/api/store/cart/remove/${productId}`, {
      method: "DELETE",
    });
  },

  // 1. Lấy danh sách lịch sử kiểm kê
  getStocktakeHistory: async () => {
    return request("/api/inventory/stocktake/history", { method: "GET" });
  },

  // 2. Lấy chi tiết đợt kiểm kê
  getStocktakeHistoryDetail: async (sessionCode) => {
    return request(`/api/inventory/stocktake/history/${sessionCode}`, {
      method: "GET",
    });
  },
  checkoutStoreCart(body) {
    return request("/api/store/cart/checkout", {
      method: "POST",
      body: JSON.stringify({
        orderType: body.orderType ?? "STANDARD",
        note: (body.note ?? "").trim() || undefined,
      }),
    });
  },

  // --- Thanh toán (VNPay) ---
  /**
   * Tạo URL thanh toán VNPay.
   * BE: POST /api/payment/create-url?orderId={id}
   * Response kỳ vọng: { orderId, paymentUrl }
   */
  createPaymentUrl(orderId) {
    const oid = encodeURIComponent(String(orderId ?? ""));
    return request(`/api/payment/create-url?orderId=${oid}`, {
      method: "POST",
    });
  },

  /**
   * Lấy trạng thái thanh toán theo orderId.
   * BE: GET /api/payment/status/{id}
   */
  getPaymentStatus(orderId) {
    const oid = encodeURIComponent(String(orderId ?? ""));
    return request(`/api/payment/status/${oid}`, { method: "GET" });
  },

  async getStoreProfile() {
    try {
      const res = await request("/api/store/settings/profile");
      const body =
        res?.data != null &&
        typeof res.data === "object" &&
        !Array.isArray(res.data)
          ? res.data
          : res;
      return body && typeof body === "object" ? body : {};
    } catch {
      return {};
    }
  },

  updateStoreProfile(body) {
    return request("/api/store/settings/profile", {
      method: "PUT",
      body: JSON.stringify({
        name: (body.name ?? "").trim(),
        address: (body.address ?? "").trim(),
        phone: (body.phone ?? "").trim(),
      }),
    });
  },

  createCategory: (body) => categoriesApi.create(body),
  deleteCategory: (id) =>
    request(`/api/categories/${id}`, { method: "DELETE" }),
  createIngredient: (body) => ingredientsApi.create(body),
  getIngredient: (id) => ingredientsApi.getById(id),
  updateIngredient: (id, body) => ingredientsApi.update(id, body),
  createProduct: (body) => productsApi.create(body),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: "DELETE" }),
  importInventory: (body) => inventoryApi.import(body),
  cook: (body) => kitchenApi.cook(body),

  upsertFormula: (body) =>
    request("/api/formulas", {
      method: "POST",
      body: JSON.stringify(body || {}),
    }),

  async getStoreOrders() {
    try {
      const res = await request("/api/store/orders");
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.data?.content)) return res.data.content;
      if (Array.isArray(res?.data?.items)) return res.data.items;
      if (Array.isArray(res?.data?.orders)) return res.data.orders;
      if (Array.isArray(res?.content)) return res.content;
      if (Array.isArray(res?.items)) return res.items;
      if (Array.isArray(res?.orders)) return res.orders;
      return [];
    } catch {
      return [];
    }
  },

  getStoreOrderDetail(orderId) {
    return request(`/api/store/orders/${orderId}`);
  },

  createStoreOrder(body, orderType = "STANDARD") {
    const path =
      orderType === "URGENT"
        ? "/api/store/orders/urgent"
        : "/api/store/orders/standard";
    return request(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async getOrders() {
    return this.getStoreOrders();
  },

  async createUser(data) {
    const raw = (data.role || "KITCHEN_MANAGER")
      .toUpperCase()
      .replace(/[\s-]/g, "_");
    const roleEnum =
      {
        FRANCHISE: "STORE_MANAGER",
        KITCHEN_STAFF: "KITCHEN_MANAGER",
        KITCHEN: "KITCHEN_MANAGER",
      }[raw] || raw;
    const body = {
      username: (data.username ?? "").trim(),
      password: data.password ?? "",
      fullName: (data.fullName ?? data.name ?? "").trim(),
      role: roleEnum,
      email: (data.email ?? "").trim(),
    };
    if (data.storeId != null && String(data.storeId).trim())
      body.storeId = String(data.storeId).trim();
    if (data.storeName != null && String(data.storeName).trim())
      body.storeName = String(data.storeName).trim();
    const res = await request("/api/admin/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.message ?? res.msg ?? res;
  },

  resolveManagedStores(a) {
    if (!a) return "";
    const stores = a.stores;
    if (Array.isArray(stores) && stores.length > 0) {
      const names = stores
        .map((s) =>
          typeof s === "string" ? s : (s?.name ?? s?.storeName ?? ""),
        )
        .filter(Boolean);
      if (names.length) return names.join(", ");
    }
    const storeNames = a.storeNames;
    if (Array.isArray(storeNames) && storeNames.length > 0) {
      const names = storeNames.filter((s) => s && String(s).trim());
      if (names.length) return names.join(", ");
    }
    const storeName = a.storeName;
    if (storeName && String(storeName).trim()) return String(storeName).trim();
    return "";
  },

  async getUsers() {
    try {
      const list = await request("/api/admin/list-accounts");
      const arr = Array.isArray(list) ? list : (list?.data ?? []);
      return arr.map((a) => {
        const accountId = a.accountId ?? a.id ?? a.userId;
        const managedStores = this.resolveManagedStores(a);
        const firstStore =
          Array.isArray(a.stores) && a.stores[0] ? a.stores[0] : null;
        const storeId =
          a.storeId ??
          a.storeIds?.[0] ??
          (typeof firstStore === "object"
            ? (firstStore?.storeId ?? firstStore?.id)
            : null) ??
          null;
        return {
          id: accountId ?? a.userId,
          accountId,
          username: a.username,
          name: a.fullName ?? a.username,
          role: normalizeRole(a.role),
          roleRaw: a.role,
          status:
            a.isActive !== false && a.active !== false ? "active" : "inactive",
          storeName: a.storeName ?? null,
          storeId,
          storeIds: a.storeIds ?? (a.storeId ? [a.storeId] : null),
          managedStores,
          email: a.email ?? null,
          userId: a.userId,
        };
      });
    } catch {
      return [];
    }
  },

  async getActiveAccounts() {
    try {
      const list = await request("/api/admin/list-accounts/active");
      const arr = Array.isArray(list) ? list : (list?.data ?? []);
      return arr.map((a) => {
        const accountId = a.accountId ?? a.id ?? a.userId;
        const managedStores = this.resolveManagedStores(a);
        const firstStore =
          Array.isArray(a.stores) && a.stores[0] ? a.stores[0] : null;
        const storeId =
          a.storeId ??
          a.storeIds?.[0] ??
          (typeof firstStore === "object"
            ? (firstStore?.storeId ?? firstStore?.id)
            : null) ??
          null;
        return {
          id: accountId ?? a.userId,
          accountId,
          username: a.username,
          name: a.fullName ?? a.username,
          role: normalizeRole(a.role),
          roleRaw: a.role,
          status: "active",
          userId: a.userId,
          email: a.email ?? null,
          storeName: a.storeName ?? null,
          storeId,
          storeIds: a.storeIds ?? (a.storeId ? [a.storeId] : null),
          managedStores,
        };
      });
    } catch {
      return [];
    }
  },

  async getInactiveAccounts() {
    try {
      const list = await request("/api/admin/list-accounts/inactive");
      const arr = Array.isArray(list) ? list : (list?.data ?? []);
      return arr.map((a) => {
        const accountId = a.accountId ?? a.id ?? a.userId;
        const managedStores = this.resolveManagedStores(a);
        const firstStore =
          Array.isArray(a.stores) && a.stores[0] ? a.stores[0] : null;
        const storeId =
          a.storeId ??
          a.storeIds?.[0] ??
          (typeof firstStore === "object"
            ? (firstStore?.storeId ?? firstStore?.id)
            : null) ??
          null;
        return {
          id: accountId ?? a.userId,
          accountId,
          username: a.username,
          name: a.fullName ?? a.username,
          role: normalizeRole(a.role),
          roleRaw: a.role,
          status: "inactive",
          userId: a.userId,
          email: a.email ?? null,
          storeName: a.storeName ?? null,
          storeId,
          storeIds: a.storeIds ?? (a.storeId ? [a.storeId] : null),
          managedStores,
        };
      });
    } catch {
      return [];
    }
  },

  async updateAccountStatus(accountId, isActive) {
    const id = String(accountId ?? "").trim();
    if (!id) throw new Error("Không có mã tài khoản để cập nhật.");
    return request(`/api/admin/accounts/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      body: JSON.stringify({ isActive: Boolean(isActive) }),
    });
  },

  async updateAccount(accountId, data) {
    const id = String(accountId ?? "").trim();
    if (!id) throw new Error("Không có mã tài khoản.");
    const email = data?.email != null ? String(data.email).trim() : "";
    if (!email) throw new Error("Không có email để cập nhật.");
    return request(`/api/admin/accounts/${encodeURIComponent(id)}/email`, {
      method: "PATCH",
      body: JSON.stringify({ email }),
    });
  },

  async swapStores(accountId1, accountId2) {
    const id1 = String(accountId1 ?? "").trim();
    const id2 = String(accountId2 ?? "").trim();
    if (!id1 || !id2) throw new Error("Cần chọn đủ 2 tài khoản.");
    if (id1 === id2) throw new Error("Hai tài khoản phải khác nhau.");
    const params = new URLSearchParams();
    params.set("accountId1", id1);
    params.set("accountId2", id2);
    return request(`/api/admin/accounts/swap-stores?${params.toString()}`, {
      method: "PUT",
    });
  },

  async updateAccountStore(accountId, storeId) {
    const id = String(accountId ?? "").trim();
    if (!id) throw new Error("Không có mã tài khoản.");
    const sid = String(storeId ?? "").trim();
    if (!sid) throw new Error("Không có mã cửa hàng.");
    return request(
      `/api/admin/accounts/${encodeURIComponent(id)}/store?storeId=${encodeURIComponent(sid)}`,
      { method: "PATCH" },
    );
  },

  /** Master đơn vị tính (UoM). GET /api/units → [{ value, label, group, isBase, isSales }, ...] */
  getUnits: async () => {
    try {
      const res = await request("/api/units");
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },

  async updateAccountRole(accountId, roleName, storeId, replacementAccountId) {
    const id = String(accountId ?? "").trim();
    if (!id) throw new Error("Không có mã tài khoản.");
    const params = new URLSearchParams();
    params.set("roleName", String(roleName ?? "").trim());
    if (storeId) params.set("storeId", String(storeId).trim());
    if (replacementAccountId)
      params.set("replacementAccountId", String(replacementAccountId).trim());
    const query = params.toString();
    return request(
      `/api/admin/accounts/${encodeURIComponent(id)}/role${query ? `?${query}` : ""}`,
      {
        method: "PATCH",
      },
    );
  },

  getProductStatistics: async () => {
    try {
      const res = await request("/api/products/statistics");
      return res?.data ?? res ?? {};
    } catch {
      return {};
    }
  },

  async saveUsers(users) {
    return users;
  },

  async saveCategories() {
    return [];
  },
  async saveProducts() {
    return [];
  },

  /**
   * Cửa hàng xác nhận đã nhận đủ hàng:
   * POST /api/shipments/{shipmentId}/report
   * Không gửi body JSON.
   */
  reportShipment(shipmentId) {
    return request(
      `/api/shipments/${encodeURIComponent(String(shipmentId))}/report`,
      {
        method: "POST",
      },
    ).then((res) => res?.message ?? res?.msg ?? res);
  },

  getImportHistory: async () => {
    const res = await request("/api/inventory/import-history");
    return Array.isArray(res) ? res : res?.data || [];
  },

  reportShipmentShortage(shipmentId, body) {
    return request(`/api/shipments/${shipmentId}/report`, {
      method: "POST",
      body: JSON.stringify({
        reportedItems: (body.reportedItems || []).map((i) => ({
          productId: i.productId ?? i.id,
          receivedQuantity: Number(i.receivedQuantity ?? i.quantity ?? 0),
          note: (i.note ?? "").trim() || undefined,
        })),
      }),
    });
  },

  confirmOrderReceipt(orderId, body = {}, updateStock = true) {
    const q = new URLSearchParams();
    if (updateStock !== undefined) q.set("updateStock", String(updateStock));
    const query = q.toString();
    const path = query
      ? `/api/store/orders/${orderId}/confirm-receipt?${query}`
      : `/api/store/orders/${orderId}/confirm-receipt`;
    return request(path, {
      method: "PATCH",
      body: JSON.stringify({
        note: (body.note ?? "").trim() || undefined,
      }),
    });
  },

  autoRouting: async (body) => {
    return request("/api/logistics/allocate-routes", {
      method: "POST",
      body: JSON.stringify(body || {}),
    });
  },

  getManagerAnalytics: async (startDate, endDate) => {
    try {
      const q = new URLSearchParams();
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);
      const query = q.toString();

      const path = query
        ? `/api/manager/analytics/dashboard?${query}`
        : "/api/manager/analytics/dashboard";

      return await request(path, { method: "GET" });
    } catch (error) {
      console.error("Lỗi lấy dữ liệu Analytics:", error);
      return {
        totalExportValue: {},
        totalOrders: {},
        totalWastageValue: {},
        exportTrend: [],
        topExportedProducts: [],
        topWastedProducts: [],
      };
    }
  },

  getOrderDetails: async (orderId) => {
    return request(`/api/orders/${orderId}`, { method: "GET" });
  },

  cancelManagerOrder: async (orderId) => {
    return request(`/api/orders/${orderId}/cancel`, { method: "PUT" });
  },

  createUnitConversion: async (body) => {
    return request("/api/manager/conversions", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  calculateConversion: async (ingredientId, unit, quantity) => {
    return request(
      `/api/manager/conversions/calculate?ingredientId=${ingredientId}&unit=${unit}&quantity=${quantity}`,
      {
        method: "GET",
      },
    );
  },

  submitStocktake: async (body) => {
    return request("/api/inventory/stocktake", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  // reportKitchenWastage: async (body) => {
  //   return request("/api/kitchen/wastage", {
  //     method: "POST",
  //     body: JSON.stringify({
  //       runId: body.runId,
  //       wasteQty: Number(body.wasteQty) || 0,
  //       reason: body.reason || "Không có lý do",
  //     }),
  //   });
  // },

  dispatchShipment: async (shipmentId) => {
    return request(`/api/logistics/shipments/${shipmentId}/dispatch`, {
      method: "PATCH",
    });
  },

  async resolveReplacement(shipId) {
    const res = await request(`/api/shipments/${shipId}/resolve-replacement`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    return res.message ?? res.msg ?? res;
  },

  getMasterProducts: async () => {
    try {
      const res = await request("/api/products");
      const list = Array.isArray(res) ? res : res?.data || [];

      return list.map((item) => ({
        ...item,
        product_id: item.productId || item.product_id || "",
        product_name: item.productName || item.product_name || "Chưa có tên",
        category: item.categoryName || item.category || "Chưa phân loại",
        cost_price: item.costPrice || item.cost_price || 0,
        selling_price: item.sellingPrice || item.selling_price || 0,
        emoji: item.emoji || "🍔",
      }));
    } catch {
      return [];
    }
  },

  getManagerInventory: async () => {
    try {
      const res = await request("/api/ingredients");
      const list = Array.isArray(res) ? res : res?.data || [];

      return list.map((item) => ({
        ...item,
        ingredientId: item.ingredient_id || item.ingredientId || item.id,
        ingredientName: item.name || item.ingredientName || item.name,
        unit: item.unit || "KG",
        stock:
          item.stock ??
          item.kitchenStock ??
          item.stockQuantity ??
          item.quantity ??
          0,
      }));
    } catch (error) {
      console.error("Lỗi lấy kho:", error);
      return [];
    }
  },

  updateBulkProductionStatus: async (runIds, status = "COMPLETED") => {
    return request(`/api/kitchen/productions/status/bulk?status=${status}`, {
      method: "PUT",
      body: JSON.stringify(runIds),
    });
  },

  getKPIStats: async (startDate, endDate) => {
    try {
      const res = await api.getManagerAnalytics(startDate, endDate);

      const exportData = res.totalExportValue || {};
      const importData = res.totalImportValue || {}; // MỚI
      const ordersData = res.totalOrders || {};
      const stocktakeData = res.totalStocktakeDiscrepancies || {}; // MỚI

      return [
        {
          label: "Doanh thu xuất kho",
          value: `${(exportData.currentValue || 0).toLocaleString()} ₫`,
          isUp: exportData.trend === "UP",
          change: `${exportData.growthPercentage || 0}%`,
        },
        {
          label: "Chi phí nhập hàng",
          value: `${(importData.currentValue || 0).toLocaleString()} ₫`,
          isUp: importData.trend === "UP",
          change: `${importData.growthPercentage || 0}%`,
        },
        {
          label: "Tổng đơn hàng",
          value: ordersData.currentValue || 0,
          isUp: ordersData.trend === "UP",
          change: `${ordersData.growthPercentage || 0}%`,
        },
        {
          label: "Số lần lệch kho",
          value: stocktakeData.currentValue || 0,
          isUp: stocktakeData.trend === "UP",
          change: `${stocktakeData.growthPercentage || 0}%`,
        },
      ];
    } catch (error) {
      console.error("Lỗi getKPIStats:", error);
      return [];
    }
  },

  getReports: async () => [],

  createMasterProduct: async (b) =>
    request("/api/products", { method: "POST", body: JSON.stringify(b) }),
  updateMasterProduct: async (id, b) =>
    request(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  deleteMasterProduct: async (id) =>
    request(`/api/products/${id}`, { method: "DELETE" }),

  createReport: async (b) => {
    console.log("Chưa có API Report", b);
    return {};
  },

  getProductionRuns: async () =>
    toArray(await request("/api/kitchen/productions/active")),

  getKitchenAggregation: () => request("/api/kitchen/orders"),

  confirmAggregation: (orderIds) =>
    request("/api/kitchen/aggregation/confirm", {
      method: "POST",
      body: JSON.stringify(orderIds),
    }),
  cookRunItems: (runId, productIds) =>
    request(`/api/kitchen/productions/${runId}/cook-items`, {
      method: "PUT",
      body: JSON.stringify(productIds),
    }),
  updateProductionRunStatus: (id, s) =>
    request(`/api/kitchen/productions/${id}/status?status=${s}`, {
      method: "PUT",
    }),
  deleteIngredient: (id) =>
    request(`/api/ingredients/${id}`, { method: "DELETE" }),

  updateProductStatus: async (productId, isActive) => {
    return request(`/api/products/${productId}/status`, {
      method: "PUT",
      body: JSON.stringify({ isActive: Boolean(isActive) }),
    });
  },

  updateCategory: (id, b) =>
    request(`/api/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(b),
    }),
  updateProduct: (id, b) =>
    request(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(b) }),

  createIncident: (b) =>
    request("/api/incidents", { method: "POST", body: JSON.stringify(b) }),
  updateIncidentStatus: (id, s) =>
    request(`/api/incidents/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: s }),
    }),

  updateSystemConfig: async (configKey, body) => {
    return request("/api/manager/configs/" + configKey, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  // reportWastage: async (body) => {
  //   return request("/api/kitchen/wastage", {
  //     method: "POST",
  //     body: JSON.stringify({
  //       runId: body.runId,
  //       wasteQty: Number(body.wasteQty) || 0,
  //       reason: body.reason || "Không có lý do",
  //     }),
  //   });
  // },

  markOrderPreparing: async (orderId) => {
    return request(`/api/orders/delivery/${orderId}/preparing`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  markOrderReady: async (orderId) => {
    return request(`/api/orders/delivery/${orderId}/ready`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  updateStoreSettings: async (settingsData) => {
    return request("/api/store/settings", {
      method: "PUT",
      body: JSON.stringify(settingsData),
    });
  },

  getReadyOrders: async () =>
    toArray(await request("/api/logistics/orders/ready")),
  manualAllocateRoutes: async (orderIds) => {
    return request("/api/logistics/orders/manual-allocate", {
      method: "POST",
      body: JSON.stringify({ orderIds: orderIds || [] }),
    });
  },

  getDriverList: async () =>
    toArray(await request("/api/logistics/orders/coordinators-list")),
  assignDriver: async (shipmentId, accountId) => {
    return request(`/api/shipments/${shipmentId}/assign`, {
      method: "POST",
      body: JSON.stringify({ accountId }),
    });
  },
  markShipmentDelivered: async (shipmentId) => {
    return request(`/api/shipments/${shipmentId}/delivered`, {
      method: "POST",
    });
  },

  getActiveShipments: async () =>
    toArray(await request("/api/logistics/orders/active")),
  getHistoryShipments: async () =>
    toArray(await request("/api/logistics/orders/history")),
  getShipmentDetails: async (shipmentId) => {
    return request(`/api/logistics/orders/${shipmentId}/details`);
  },
  placeOrderForStore: (body) =>
    request("/api/orders/standard", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  addOrderUrgent: (body) =>
    request("/api/orders/urgent", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getStoreHistoryForManager: (storeId) =>
    request(`/api/orders/history?storeId=${storeId}`),
  getSystemConfigs: async () => {
    const res = await request("/api/manager/configs/map");
    return res?.data || res || {};
  },
  updateUnitConversion: (id, newFactor) =>
    request(`/api/manager/conversions/${id}?newFactor=${newFactor}`, {
      method: "PUT",
    }),
  deleteUnitConversion: (id) =>
    request(`/api/manager/conversions/${id}`, { method: "DELETE" }),
  getConversionsByIngredient: (ingredientId) =>
    request(`/api/manager/conversions/ingredient/${ingredientId}`),
  getManagerRecipes: async () => {
    try {
      const res = await request("/api/formulas");
      return Array.isArray(res) ? res : res?.data || [];
    } catch (e) {
      return [];
    }
  },
  getRecipeOfProduct: (pId) => request(`/api/formulas/${pId}`),
  saveRecipe: (b) =>
    request("/api/formulas", { method: "POST", body: JSON.stringify(b) }),
  deleteRecipe: (productId) =>
    request(`/api/formulas/${productId}`, { method: "DELETE" }),
  getReportedShipments: async () =>
    toArray(await request("/api/shipments/reported")),

  /**
   * Cửa hàng: lô đã đến nơi, chờ xác nhận nhận hàng / báo sự cố.
   * GET /api/shipments/pending-report
   */
  async getShipmentsPendingReport() {
    try {
      const res = await request("/api/shipments/pending-report");
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.data?.content)) return res.data.content;
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Xác nhận đã nhận đủ hàng cho lô (gỡ khỏi danh sách chờ).
   * Nếu BE dùng path khác, sửa tại đây.
   */
  confirmShipmentReport(shipmentId) {
    return request(`/api/shipments/${shipmentId}/confirm-report`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  /** GET /api/notifications/unread-count — số thông báo chưa đọc (hỗ trợ số thuần hoặc object từ BE). */
  async getNotificationsUnreadCount() {
    try {
      const res = await request("/api/notifications/unread-count");
      if (typeof res === "number" && Number.isFinite(res)) {
        return Math.max(0, Math.floor(res));
      }
      if (typeof res === "string" && /^\d+$/.test(res.trim())) {
        return Math.max(0, parseInt(res.trim(), 10));
      }
      if (res && typeof res === "object") {
        const n = res.unreadCount ?? res.count ?? res.total ?? res.data;
        if (typeof n === "number" && Number.isFinite(n)) {
          return Math.max(0, Math.floor(n));
        }
        if (typeof n === "string" && /^\d+$/.test(n)) {
          return Math.max(0, parseInt(n, 10));
        }
      }
      return 0;
    } catch {
      return 0;
    }
  },

  /** GET /api/notifications — danh sách, mới nhất trước (BE đã sắp xếp). */
  async getNotifications() {
    try {
      const res = await request("/api/notifications");
      return toArray(res);
    } catch {
      return [];
    }
  },

  /** PUT /api/notifications/{id}/read */
  markNotificationRead(notificationId) {
    return request(
      `/api/notifications/${encodeURIComponent(notificationId)}/read`,
      {
        method: "PUT",
        body: JSON.stringify({}),
      },
    );
  },

  /** PUT /api/notifications/read-all */
  markAllNotificationsRead() {
    return request("/api/notifications/read-all", {
      method: "PUT",
      body: JSON.stringify({}),
    });
  },

  /**
   * POST /api/notifications/broadcast — Admin phát thông báo theo vai trò.
   * targetRoles rỗng [] = gửi tới toàn bộ user trên server (theo BE).
   */
  broadcastNotification({ targetRoles, title, message, type }) {
    const roles = Array.isArray(targetRoles) ? targetRoles : [];
    return request("/api/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify({
        targetRoles: roles,
        title: title != null ? String(title) : "",
        message: message != null ? String(message) : "",
        type: type != null ? String(type) : "INFO",
      }),
    });
  },

  exportAnalyticsCSV: async (startDate, endDate) => {
    try {
      const token = storage.getToken();
      if (!token) {
        throw new Error("Không tìm thấy phiên đăng nhập!");
      }

      const q = new URLSearchParams();
      if (startDate) q.set("startDate", startDate);
      if (endDate) q.set("endDate", endDate);
      const query = q.toString();

      const finalUrl = `${BASE_URL.replace(/\/$/, "")}/api/manager/analytics/export/csv${query ? `?${query}` : ""}`;

      const response = await fetch(finalUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Lỗi xác thực hoặc không tải được file từ Server!");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute(
        "download",
        `Bao_Cao_Thong_Ke_${new Date().toISOString().split("T")[0]}.csv`,
      );

      document.body.appendChild(link);
      link.click();

      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Lỗi tải báo cáo CSV:", error);
      alert("Lỗi: " + error.message);
    }
  },
};
export default api;
