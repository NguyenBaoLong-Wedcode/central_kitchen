import React from "react";

/**
 * Thẻ thống kê dùng cho Dashboard
 * @param {Function} onClick - Optional. Khi có thì thẻ có thể bấm được.
 * @param {boolean} active - Optional. Đang được chọn (highlight).
 */
function StatCard({
  label,
  value,
  change,
  icon: Icon,
  color,
  onClick,
  active,
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      className={`ck-stat-card ck-rounded-2xl ck-p-6 ck-card-hover ${onClick ? "ck-btn ck-w-full ck-text-left" : ""} ${active ? "ck-stat-card-active" : ""}`}
      style={onClick ? { border: "none", cursor: "pointer" } : undefined}
      onClick={onClick}
    >
      <div className="ck-flex ck-justify-center ck-mb-4">
        <div
          className={`ck-icon-box ck-w-14-h-14 ck-rounded-xl ck-shadow-lg ${color}`}
        >
          <Icon className="ck-text-white" size={28} />
        </div>
      </div>
      {change ? (
        <div className="ck-flex ck-justify-end ck-mb-2">
          <span
            className={`ck-badge ${
              change.startsWith("+") ? "ck-badge-green" : "ck-badge-red"
            }`}
          >
            {change}
          </span>
        </div>
      ) : null}
      <p className="ck-text-gray-400 ck-text-sm ck-mb-2 ck-font-medium">
        {label}
      </p>
      <p className="ck-text-4xl ck-font-black ck-text-white">{value}</p>
    </Wrapper>
  );
}

export default StatCard;
