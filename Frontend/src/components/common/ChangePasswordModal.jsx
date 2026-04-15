import React, { useEffect, useRef, useState } from "react";
import { Lock, X } from "../icons/Icons";
import api from "../../services/api";

/**
 * Modal Đổi mật khẩu trong Settings (khi đã đăng nhập).
 * PUT /api/settings/change-password — Body: ChangePasswordRequest { oldPassword, newPassword, confirmPassword }
 * Ví dụ: { "oldPassword": "123", "newPassword": "MatKhaumoi@2026", "confirmPassword": "MatKhaumoi@2026" }
 */
function ChangePasswordModal({ open, onClose }) {
  const overlayRef = useRef(null);
  const [variant, setVariant] = useState(() => {
    if (typeof document === "undefined") return "ck";
    return document.querySelector(".sm-page") ? "sm" : "ck";
  });

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const old = oldPassword.trim();
    const pwd = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!old) {
      setError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (!pwd || !confirm) {
      setError("Vui lòng nhập mật khẩu mới và xác nhận.");
      return;
    }
    if (pwd.length < 6) {
      setError("Mật khẩu mới tối thiểu 6 ký tự.");
      return;
    }
    if (pwd !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const msg = await api.changePassword(old, pwd, confirm);
      setSuccess(
        typeof msg === "string" && msg
          ? msg
          : "Đổi mật khẩu thành công! Bạn có thể đăng nhập lại bằng mật khẩu mới.",
      );
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Đổi mật khẩu thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError("");
    setSuccess("");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    onClose?.();
  };

  // Quyết định modal theo layout của page (sm vs ck)
  useEffect(() => {
    if (!open) return;
    const root = overlayRef.current;
    const smRoot = root?.closest?.(".sm-page");
    setVariant(smRoot ? "sm" : "ck");
  }, [open]);

  if (!open) return null;

  if (variant === "sm") {
    return (
      <div
        ref={overlayRef}
        className="sm-dim"
        onClick={handleClose}
        role="presentation"
      >
        <div
          className="sm-modal-box"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-labelledby="change-password-title"
        >
          <div className="sm-modal-hd">
            <h2 id="change-password-title" className="sm-modal-title">
              Đổi mật khẩu
            </h2>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={handleClose}
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="sm-modal-bd">
              {success && (
                <div
                  className="ibox"
                  style={{
                    background: "var(--sage-bg)",
                    borderColor: "var(--sage-border)",
                    color: "var(--sage)",
                    marginBottom: 14,
                  }}
                >
                  {success}
                </div>
              )}
              {error && (
                <div className="ibox danger" role="alert">
                  {error}
                </div>
              )}

              <div className="fg">
                <label htmlFor="sm-change-old">Mật khẩu hiện tại</label>
                <input
                  id="sm-change-old"
                  type="password"
                  autoComplete="current-password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="vd: 123"
                />
              </div>

              <div className="fg">
                <label htmlFor="sm-change-new">Mật khẩu mới</label>
                <input
                  id="sm-change-new"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="vd: MatKhaumoi@2026"
                />
              </div>

              <div className="fg" style={{ marginBottom: 0 }}>
                <label htmlFor="sm-change-confirm">Xác nhận mật khẩu mới</label>
                <input
                  id="sm-change-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="vd: MatKhaumoi@2026"
                />
              </div>
            </div>

            <div className="sm-modal-ft">
              <button
                type="button"
                className="btn"
                onClick={handleClose}
                disabled={loading}
              >
                Đóng
              </button>
              <button type="submit" className="btn btn-rust" disabled={loading}>
                {loading ? "⏳ Đang xử lý..." : "🔐 Đổi mật khẩu"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={overlayRef}
      className="ck-modal-overlay"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="ck-modal-box ck-max-w-md ck-w-full ck-p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="change-password-title"
      >
        <div className="ck-flex ck-items-center ck-justify-between ck-mb-6">
          <h2
            id="change-password-title"
            className="ck-text-2xl ck-font-black ck-text-white"
          >
            Đổi mật khẩu
          </h2>
          <button
            type="button"
            className="ck-btn ck-p-2 ck-rounded-lg"
            onClick={handleClose}
            style={{ background: "none", border: "none" }}
            aria-label="Đóng"
          >
            <X size={24} className="ck-text-gray-400" />
          </button>
        </div>

        {success && (
          <div className="ck-rounded-xl ck-mb-4 ck-p-3 ck-bg-green-500/20 ck-border ck-border-green-500/40">
            <p className="ck-text-green-400 ck-text-sm ck-font-semibold">
              {success}
            </p>
          </div>
        )}
        {error && (
          <div className="ck-rounded-xl ck-mb-4 ck-p-3 ck-bg-red-500/20 ck-border ck-border-red-500/40">
            <p className="ck-text-red-400 ck-text-sm ck-font-semibold">
              {error}
            </p>
          </div>
        )}

        <form className="ck-space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="ck-block ck-text-sm ck-font-semibold ck-text-gray-300 ck-mb-2">
              Mật khẩu hiện tại
            </label>
            <div className="ck-input-wrap">
              <span className="ck-input-icon">
                <Lock size={18} />
              </span>
              <input
                type="password"
                className="ck-input ck-w-full"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="vd: 123"
              />
            </div>
          </div>
          <div>
            <label className="ck-block ck-text-sm ck-font-semibold ck-text-gray-300 ck-mb-2">
              Mật khẩu mới
            </label>
            <div className="ck-input-wrap">
              <span className="ck-input-icon">
                <Lock size={18} />
              </span>
              <input
                type="password"
                className="ck-input ck-w-full"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="vd: MatKhaumoi@2026"
              />
            </div>
          </div>
          <div>
            <label className="ck-block ck-text-sm ck-font-semibold ck-text-gray-300 ck-mb-2">
              Xác nhận mật khẩu mới
            </label>
            <div className="ck-input-wrap">
              <span className="ck-input-icon">
                <Lock size={18} />
              </span>
              <input
                type="password"
                className="ck-input ck-w-full"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="vd: MatKhaumoi@2026"
              />
            </div>
          </div>
          <div className="ck-flex ck-gap-3 ck-pt-2">
            <button
              type="button"
              className="ck-btn ck-flex-1 ck-px-4 ck-py-3 ck-bg-gray-700 ck-text-white ck-rounded-xl ck-font-semibold"
              style={{ border: "none" }}
              onClick={handleClose}
            >
              Đóng
            </button>
            <button
              type="submit"
              className="ck-btn ck-flex-1 ck-px-4 ck-py-3 ck-bg-gradient-btn-admin ck-text-white ck-rounded-xl ck-font-bold"
              style={{ border: "none" }}
              disabled={loading}
            >
              {loading ? "⏳ Đang xử lý..." : "🔐 Đổi mật khẩu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePasswordModal;
