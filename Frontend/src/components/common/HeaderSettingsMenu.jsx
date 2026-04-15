import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { User, Lock, LogOut, ChevronRight } from "../../components/icons/Icons";
import "../../styles/HeaderSettingsMenu.css";

const DROPDOWN_WIDTH = 220;

function getInitials(name) {
  if (!name || typeof name !== "string") return "NV";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Menu dropdown Cài đặt (thiết kế theo UserDropdown: avatar + tên + role, Hồ sơ / Đổi mật khẩu / Đăng xuất).
 * Dùng --rust, --rust-bg cho mục Đăng xuất.
 */
function HeaderSettingsMenu({
  userData,
  showProfile = true,
  onOpenProfile,
  onChangePassword,
  onLogout,
  buttonClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const buttonRef = useRef(null);
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        left: Math.max(8, rect.right - DROPDOWN_WIDTH),
        top: rect.bottom + 8,
        width: DROPDOWN_WIDTH,
        zIndex: 9999,
      });
    }
  }, [open]);

  const openMenu = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        left: Math.max(8, rect.right - DROPDOWN_WIDTH),
        top: rect.bottom + 8,
        width: DROPDOWN_WIDTH,
        zIndex: 9999,
      });
    }
    setOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [open]);

  const handle = (fn) => {
    setOpen(false);
    fn?.();
  };

  const displayName = userData?.name ?? userData?.fullName ?? "Người dùng";
  const role = userData?.role ?? "Nhân viên";
  const initials = getInitials(displayName);

  return (
    <div className={`hsm-root ${buttonClassName}`.trim()} ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        className="hsm-trigger"
        onClick={() => (open ? setOpen(false) : openMenu())}
        title="Cài đặt"
        aria-expanded={open}
      >
        <User size={16} />
      </button>

      {open && (
        <div className="hsm-dropdown" style={dropdownStyle} role="menu">
          <div className="hsm-header">
            <div className="hsm-avatar">{initials}</div>
            <div>
              <div className="hsm-name">{displayName}</div>
              <div className="hsm-role-row">
                <span className="hsm-dot" />
                {role}
              </div>
            </div>
          </div>

          <div className="hsm-menu">
            {showProfile && (
              <button
                type="button"
                className="hsm-item"
                onClick={() => handle(onOpenProfile)}
                role="menuitem"
              >
                <User size={15} />
                <span className="hsm-item-label">Hồ sơ</span>
                <ChevronRight size={12} />
              </button>
            )}
            <button
              type="button"
              className="hsm-item"
              onClick={() => handle(onChangePassword)}
              role="menuitem"
            >
              <Lock size={15} />
              <span className="hsm-item-label">Đổi mật khẩu</span>
              <ChevronRight size={12} />
            </button>
            <div className="hsm-divider" />
            <button
              type="button"
              className="hsm-item hsm-danger"
              onClick={() => handle(onLogout)}
              role="menuitem"
            >
              <LogOut size={15} />
              <span className="hsm-item-label">Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HeaderSettingsMenu;
