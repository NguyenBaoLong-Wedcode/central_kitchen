import React from "react";
import { Eye } from "../icons/Icons";
import { ORDER_STATUS } from "../../constants";

/**
 * Thẻ hiển thị một đơn hàng (dùng trong danh sách đơn)
 */
function OrderCard({ order, onView }) {
  const status = ORDER_STATUS[order?.status] || ORDER_STATUS.pending;
  const StatusIcon = status.icon;
  const items = Array.isArray(order?.items) ? order.items : [];
  const total = Number(order?.total) || 0;

  return (
    <div className="ck-order-card ck-rounded-2xl ck-p-6 ck-card-hover">
      <div
        className="ck-flex ck-justify-between ck-mb-4"
        style={{ alignItems: "flex-start" }}
      >
        <div>
          <h3 className="ck-font-bold ck-text-white ck-text-xl ck-mb-1 ck-mono">
            {order?.id ?? "—"}
          </h3>
          <p className="ck-text-gray-400 ck-text-sm">{order?.date ?? ""}</p>
        </div>
        <span className={`ck-badge ${status.bg}`}>
          <StatusIcon size={16} />
          {status.label}
        </span>
      </div>

      <div className="ck-bg-gray-900-50 ck-rounded-xl ck-p-4 ck-mb-4">
        <p className="ck-text-sm ck-text-gray-400 ck-mb-2">
          Sản phẩm đặt hàng:
        </p>
        {items.slice(0, 3).map((item, idx) => (
          <p key={idx} className="ck-text-sm ck-text-white ck-mb-1">
            • {item.name}{" "}
            <span className="ck-font-bold ck-text-orange-400">
              x{item.quantity}
            </span>
          </p>
        ))}
        {items.length > 3 && (
          <p className="ck-text-xs ck-text-gray-500 ck-mt-2">
            +{items.length - 3} sản phẩm khác
          </p>
        )}
      </div>

      {order.note && (
        <div className="ck-bg-blue-500-10 ck-border ck-border-blue-500-30 ck-rounded-lg ck-p-3 ck-mb-4">
          <p className="ck-text-xs ck-text-blue-400 ck-font-semibold ck-mb-1">
            📝 Ghi chú:
          </p>
          <p className="ck-text-sm ck-text-orange-300">{order.note}</p>
        </div>
      )}

      <div className="ck-flex ck-items-center ck-justify-between">
        <button
          type="button"
          className="ck-btn ck-text-sm ck-text-orange-400 ck-font-semibold ck-flex ck-items-center ck-gap-1"
          style={{ background: "none", border: "none", cursor: "pointer" }}
          onClick={() => onView(order)}
        >
          <Eye size={16} />
          Chi tiết
        </button>
        <span className="ck-font-black ck-text-2xl ck-text-orange-400">
          {total.toLocaleString()}₫
        </span>
      </div>
    </div>
  );
}

export default OrderCard;
