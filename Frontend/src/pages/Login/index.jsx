import React, { useState } from "react";
import {
  ChefHat,
  User,
  Lock,
  Eye,
  EyeOff,
  Mail,
  ArrowLeft,
  KeyRound,
} from "../../components/icons/Icons";
import api from "../../services/api";

const VIEW = {
  LOGIN: "login",
  FORGOT: "forgot",
  VERIFY_OTP: "verify-otp",
  RESET: "reset",
};

/**
 * Trang đăng nhập & khôi phục tài khoản Central Kitchen
 * Auth: login, forgot-password → verify-otp → reset-password
 */
function LoginPage({ onLogin }) {
  const [view, setView] = useState(VIEW.LOGIN);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Luồng quên mật khẩu / OTP đăng nhập
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  /** 'login' = OTP sau khi đăng nhập đúng; 'forgot' = OTP trong luồng quên mật khẩu */
  const [otpMode, setOtpMode] = useState("login");

  const goBack = () => {
    setError("");
    setSuccess("");
    if (view === VIEW.FORGOT) setView(VIEW.LOGIN);
    else if (view === VIEW.VERIFY_OTP) {
      if (otpMode === "login") setView(VIEW.LOGIN);
      else setView(VIEW.FORGOT);
    } else if (view === VIEW.RESET) setView(VIEW.VERIFY_OTP);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const result = await api.login(username, password);
      if (result.requiresOtp) {
        setOtpMode("login");
        setEmailOrUsername(result.username || username);
        setOtp("");
        setSuccess("Mã OTP đã được gửi. Vui lòng nhập mã để tiếp tục.");
        setView(VIEW.VERIFY_OTP);
      } else {
        onLogin(result);
      }
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const value = (emailOrUsername || "").trim();
    if (!value) {
      setError("Vui lòng nhập email!");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const msg = await api.forgotPassword(value);
      setOtpMode("forgot");
      setSuccess(
        msg && typeof msg === "string"
          ? msg
          : "Mã OTP đã được gửi. Vui lòng kiểm tra email.",
      );
      setView(VIEW.VERIFY_OTP);
      setOtp("");
    } catch (err) {
      setError(err.message || "Gửi OTP thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = (otp || "").trim();
    if (!code) {
      setError("Vui lòng nhập mã OTP!");
      return;
    }
    if (otpMode === "forgot") {
      const pwd = newPassword.trim();
      const confirm = confirmPassword.trim();
      if (!pwd || !confirm) {
        setError("Vui lòng nhập mật khẩu mới và xác nhận!");
        return;
      }
      if (pwd.length < 6) {
        setError("Mật khẩu tối thiểu 6 ký tự!");
        return;
      }
      if (pwd !== confirm) {
        setError("Mật khẩu xác nhận không khớp!");
        return;
      }
      setError("");
      setLoading(true);
      try {
        const msg = await api.resetPassword(code, pwd, emailOrUsername.trim());
        setSuccess(
          msg && typeof msg === "string"
            ? msg
            : "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.",
        );
        setView(VIEW.LOGIN);
        setEmailOrUsername("");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (err) {
        setError(
          err.message || "OTP không hợp lệ hoặc đặt lại mật khẩu thất bại!",
        );
      } finally {
        setLoading(false);
      }
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await api.verifyOtp(code, emailOrUsername.trim());
      if (result && result.role != null) {
        onLogin(result);
        return;
      }
      setError("Xác thực OTP thất bại hoặc không nhận được token.");
    } catch (err) {
      setError(err.message || "Mã OTP không hợp lệ!");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const pwd = newPassword.trim();
    const confirm = confirmPassword.trim();
    if (!pwd || !confirm) {
      setError("Vui lòng nhập mật khẩu mới và xác nhận!");
      return;
    }
    if (pwd.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự!");
      return;
    }
    if (pwd !== confirm) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.resetPassword(otp.trim(), pwd, emailOrUsername.trim());
      setSuccess("Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.");
      setView(VIEW.LOGIN);
      setEmailOrUsername("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Đặt lại mật khẩu thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const passwordToggleStyle = {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9ca3af",
    transition: "all 0.2s ease",
  };

  const renderHeader = (title, subtitle) => (
    <div className="ck-text-center ck-mb-8">
      <div
        className="ck-flex ck-items-center ck-justify-center ck-w-14-h-14 ck-logo-icon ck-rounded-2xl ck-mb-4 ck-shadow-lg"
        style={{ marginLeft: "auto", marginRight: "auto" }}
      >
        <ChefHat className="ck-text-white" size={40} />
      </div>
      <h2 className="ck-text-3xl ck-font-black ck-text-white ck-mb-2">
        Central Kitchen
      </h2>
      <p className="ck-text-gray-400 ck-mono">
        {subtitle || "Hệ thống quản lý bếp trung tâm"}
      </p>
      {title && (
        <p className="ck-text-orange-400 ck-font-semibold ck-mb-2">{title}</p>
      )}
    </div>
  );

  return (
    <div className="ck-root ck-login-page">
      <div className="ck-grain" />
      <div
        className="ck-absolute ck-inset-0 ck-bg-grid-pattern"
        style={{ pointerEvents: "none" }}
      />

      <div className="ck-login-card">
        <div className="ck-login-box ck-animate-slide-in">
          {view !== VIEW.LOGIN && (
            <button
              type="button"
              onClick={goBack}
              className="ck-flex ck-items-center ck-gap-2 ck-text-gray-400 hover:ck-text-white ck-mb-4 ck-text-sm"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <ArrowLeft size={18} />
              Quay lại
            </button>
          )}

          {view === VIEW.LOGIN && renderHeader(null)}
          {view === VIEW.FORGOT &&
            renderHeader(null, "Nhập email của bạn để nhận mã OTP")}
          {view === VIEW.VERIFY_OTP &&
            renderHeader("Xác thực OTP", "Nhập mã OTP đã gửi đến bạn")}
          {view === VIEW.RESET &&
            renderHeader("Đặt lại mật khẩu", "Nhập mật khẩu mới")}

          {success && (
            <div className="ck-rounded-xl ck-mb-4 ck-p-3 ck-bg-green-500/20 ck-border ck-border-green-500/40">
              <p className="ck-text-green-400 ck-text-sm ck-font-semibold ck-text-center">
                {success}
              </p>
            </div>
          )}
          {error && (
            <div className="ck-error-box ck-rounded-xl ck-shake ck-mb-4">
              <p className="ck-text-red-400 ck-text-sm ck-font-semibold ck-text-center">
                {error}
              </p>
            </div>
          )}

          {/* --- LOGIN --- */}
          {view === VIEW.LOGIN && (
            <form
              className="ck-space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
            >
              <div>
                <label className="ck-block ck-text-sm ck-font-bold ck-text-gray-300 ck-mb-2">
                  Tên đăng nhập
                </label>
                <div className="ck-input-wrap">
                  <span className="ck-input-icon">
                    <User size={20} />
                  </span>
                  <input
                    type="text"
                    className="ck-input"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nhập tên đăng nhập"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="ck-block ck-text-sm ck-font-bold ck-text-gray-300 ck-mb-2">
                  Mật khẩu
                </label>
                <div className="ck-input-wrap" style={{ position: "relative" }}>
                  <span className="ck-input-icon">
                    <Lock size={20} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="ck-input"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    style={{ paddingRight: "48px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={passwordToggleStyle}
                    tabIndex={-1}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="ck-btn ck-btn-primary ck-w-full"
                disabled={loading}
              >
                {loading ? "⏳ Đang xác thực..." : "🚀 Đăng nhập"}
              </button>
              <div className="ck-text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setView(VIEW.FORGOT);
                    setEmailOrUsername(username);
                  }}
                  className="ck-text-sm ck-text-gray-400 hover:ck-text-orange-400"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Quên mật khẩu?
                </button>
              </div>
            </form>
          )}

          {/* --- FORGOT PASSWORD --- */}
          {view === VIEW.FORGOT && (
            <form
              className="ck-space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                handleForgotPassword();
              }}
            >
              <div>
                <label className="ck-block ck-text-sm ck-font-bold ck-text-gray-300 ck-mb-2">
                  Email
                </label>
                <div className="ck-input-wrap">
                  <span className="ck-input-icon">
                    <Mail size={20} />
                  </span>
                  <input
                    type="email"
                    className="ck-input"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder="Nhập email"
                    autoFocus
                  />
                </div>
              </div>
              <button
                type="submit"
                className="ck-btn ck-btn-primary ck-w-full"
                disabled={loading}
              >
                {loading ? "⏳ Đang gửi OTP..." : "📧 Gửi mã OTP"}
              </button>
            </form>
          )}

          {/* --- VERIFY OTP (luồng đăng nhập: chỉ OTP; luồng quên mật khẩu: OTP + mật khẩu mới) --- */}
          {view === VIEW.VERIFY_OTP && (
            <form
              className="ck-space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyOtp();
              }}
            >
              <div>
                <label className="ck-block ck-text-sm ck-font-bold ck-text-gray-300 ck-mb-2">
                  Mã OTP
                </label>
                <div className="ck-input-wrap">
                  <span className="ck-input-icon">
                    <KeyRound size={20} />
                  </span>
                  <input
                    type="text"
                    className="ck-input"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))
                    }
                    placeholder="Nhập mã 6 số"
                    maxLength={8}
                    autoFocus
                  />
                </div>
                <p className="ck-text-gray-500 ck-text-xs ck-mt-1">
                  {otpMode === "login"
                    ? `Xác thực đăng nhập cho tài khoản ${emailOrUsername || "bạn"}`
                    : `Mã đã gửi tới email/SMS của ${emailOrUsername || "bạn"}`}
                </p>
              </div>

              {otpMode === "forgot" && (
                <>
                  <div>
                    <label className="ck-block ck-text-sm ck-font-bold ck-text-gray-300 ck-mb-2">
                      Mật khẩu mới
                    </label>
                    <div
                      className="ck-input-wrap"
                      style={{ position: "relative" }}
                    >
                      <span className="ck-input-icon">
                        <Lock size={20} />
                      </span>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        className="ck-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                        style={{ paddingRight: "48px" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={passwordToggleStyle}
                        tabIndex={-1}
                      >
                        {showNewPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="ck-block ck-text-sm ck-font-bold ck-text-gray-300 ck-mb-2">
                      Xác nhận mật khẩu
                    </label>
                    <div className="ck-input-wrap">
                      <span className="ck-input-icon">
                        <Lock size={20} />
                      </span>
                      <input
                        type="password"
                        className="ck-input"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="ck-btn ck-btn-primary ck-w-full"
                disabled={loading}
              >
                {loading
                  ? "⏳ Đang xử lý..."
                  : otpMode === "forgot"
                    ? "🔐 Xác thực OTP và đặt lại mật khẩu"
                    : "✓ Xác thực OTP"}
              </button>
            </form>
          )}

          {/* --- RESET PASSWORD --- */}
          {view === VIEW.RESET && (
            <form
              className="ck-space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                handleResetPassword();
              }}
            >
              <div>
                <label className="ck-block ck-text-sm ck-font-bold ck-text-gray-300 ck-mb-2">
                  Mật khẩu mới
                </label>
                <div className="ck-input-wrap" style={{ position: "relative" }}>
                  <span className="ck-input-icon">
                    <Lock size={20} />
                  </span>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="ck-input"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    style={{ paddingRight: "48px" }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={passwordToggleStyle}
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="ck-block ck-text-sm ck-font-bold ck-text-gray-300 ck-mb-2">
                  Xác nhận mật khẩu
                </label>
                <div className="ck-input-wrap">
                  <span className="ck-input-icon">
                    <Lock size={20} />
                  </span>
                  <input
                    type="password"
                    className="ck-input"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="ck-btn ck-btn-primary ck-w-full"
                disabled={loading}
              >
                {loading ? "⏳ Đang lưu..." : "🔐 Đặt lại mật khẩu"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
