import React from "react";
import { Sun, Moon } from "../icons/Icons";
import { useUiTheme } from "../../context/UiThemeContext";

/**
 * Nút chuyển sáng / tối (dùng chung mọi trang).
 */
function ThemeToggleButton({ className = "" }) {
  const { uiTheme, toggleUiTheme } = useUiTheme();
  const label = uiTheme === "dark" ? "Chế độ sáng" : "Chế độ tối";
  return (
    <button
      type="button"
      className={`ck-theme-toggle ${className}`.trim()}
      onClick={toggleUiTheme}
      title={label}
      aria-label={label}
    >
      {uiTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export default ThemeToggleButton;
