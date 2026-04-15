import React, { useEffect, useRef, useState } from "react";
import { User, Mail, X } from "../icons/Icons";
import api from "../../services/api";

/**
 * Modal Cập nhật hồ sơ cá nhân (các role trừ Admin).
 * PUT /api/auth/update-profile — Body: UpdateProfileRequest { fullName, email }
 * Ví dụ: { "fullName": "Nguyễn Văn B (Đã đổi tên)", "email": "nguyenvanb_new@gmail.com" }
 */
function UpdateProfileModal({
  open,
  onClose,
  initialFullName = "",
  initialEmail = "",
  onSuccess,
}) {
  const overlayRef = useRef(null);
  const [variant, setVariant] = useState(() => {
    if (typeof document === "undefined") return "ck";
    return document.querySelector(".sm-page") ? "sm" : "ck";
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (open) {
      setFullName(initialFullName || "");
      setEmail(initialEmail || "");
      setError("");
      setSuccess("");
    }
  }, [open, initialFullName, initialEmail]);

  // Quyết định modal theo layout của page (sm vs ck)
  useEffect(() => {
    if (!open) return;
    const root = overlayRef.current;
    const smRoot = root?.closest?.(".sm-page");
    setVariant(smRoot ? "sm" : "ck");
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nameTrim = fullName.trim();
    const emailTrim = email.trim();

    if (!nameTrim) {
      setError("Vui lòng nhập họ tên.");
      return;
    }
    if (!emailTrim) {
      setError("Vui lòng nhập email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setError("Email không đúng định dạng.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await api.updateProfile({ fullName: nameTrim, email: emailTrim });
      setSuccess("Cập nhật hồ sơ thành công!");
      onSuccess?.();
    } catch (err) {
      setError(err.message || "Cập nhật hồ sơ thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError("");
    setSuccess("");
    onClose?.();
  };

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
          aria-labelledby="update-profile-title"
        >
          <div className="sm-modal-hd">
            <h2 id="update-profile-title" className="sm-modal-title">
              Cập nhật hồ sơ cá nhân
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
                <label htmlFor="sm-update-fullName">Họ tên (fullName) *</label>
                <input
                  id="sm-update-fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="vd: Nguyễn Văn B (Đã đổi tên)"
                />
              </div>

              <div className="fg" style={{ marginBottom: 0 }}>
                <label htmlFor="sm-update-email">Email *</label>
                <input
                  id="sm-update-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vd: nguyenvanb_new@gmail.com"
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
                {loading ? "⏳ Đang lưu..." : "Lưu hồ sơ"}
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
        aria-labelledby="update-profile-title"
      >
        <div className="ck-flex ck-items-center ck-justify-between ck-mb-6">
          <h2
            id="update-profile-title"
            className="ck-text-2xl ck-font-black ck-text-white"
          >
            Cập nhật hồ sơ cá nhân
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
              Họ tên (fullName) *
            </label>
            <div className="ck-input-wrap">
              <span className="ck-input-icon">
                <User size={18} />
              </span>
              <input
                type="text"
                className="ck-input ck-w-full"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="vd: Nguyễn Văn B (Đã đổi tên)"
              />
            </div>
          </div>
          <div>
            <label className="ck-block ck-text-sm ck-font-semibold ck-text-gray-300 ck-mb-2">
              Email *
            </label>
            <div className="ck-input-wrap">
              <span className="ck-input-icon">
                <Mail size={18} />
              </span>
              <input
                type="email"
                className="ck-input ck-w-full"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vd: nguyenvanb_new@gmail.com"
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
              {loading ? "⏳ Đang lưu..." : "Lưu hồ sơ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UpdateProfileModal;
