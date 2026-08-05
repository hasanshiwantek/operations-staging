import React from "react";
import { Link } from "react-router-dom";
import orderIcon from "../assets/totalorders-icon.svg";
import { AlertTriangle } from "lucide-react";

const statusStyles = {
  delivered: "bg-green-50 text-green-700",
  "in transit": "bg-blue-50 text-blue-700",
  intransit: "bg-blue-50 text-blue-700",
  delayed: "bg-yellow-50 text-yellow-700",
  cancel: "bg-red-50 text-red-700",
  cancelled: "bg-red-50 text-red-700",
  partial: "bg-purple-50 text-purple-700",
  refunded: "bg-gray-100 text-gray-700",
};

const OrderCard = ({ order }) => {
  const statusKey = order.status?.toLowerCase() || "";
  const badgeClass = statusStyles[statusKey] || "bg-gray-100 text-gray-600";
  const orderDate = order.order_date ? order.order_date : "N/A";
  const price = order.price ? `$${order.price.toLocaleString()}` : "$0";
  const totalPrice = order.totalPrice ? `$${order.totalPrice.toLocaleString()}` : "$0";
  const hasDash = String(order?.order_id)?.includes("-");

  return (
    <Link
      to={`/order/${order.order_id}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-2xl"
    >
      <article className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <img src={orderIcon} alt="Order icon" className="w-6 h-6" />
            </div>
            <div>
              <p
                className={`text-sm font-semibold flex items-center gap-1 ${hasDash ? "text-gray-900" : "text-gray-900"
                  }`}
              >
                #{order.order_id}
                {/* {hasDash && <AlertTriangle size={14} className="text-red-600" />} */}
              </p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Order</p>
            </div>
          </div>
          {order.status && <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
            <span className="w-2 h-2 rounded-full bg-current" />
            {order.status || ""}
          </span>}
        </div>

        <div className="grid grid-cols-3 gap-y-4 text-sm text-gray-900">
          <div>
            <p className="font-semibold">{order.brand || "N/A"}</p>
            <p className="text-xs text-gray-500 uppercase">Brand</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{order.category || "N/A"}</p>
            <p className="text-xs text-gray-500 uppercase">Category</p>
          </div>
          <div className="text-right invisible">
            <p className="font-semibold">{order.qty || 0}</p>
            <p className="text-xs text-gray-500 uppercase">Qty</p>
          </div>

          <div>
            <p className="font-semibold">{orderDate}</p>
            <p className="text-xs text-gray-500 uppercase">Order date</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{totalPrice}</p>
            <p className="text-xs text-gray-500 uppercase">Total Price</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{order.qty || 0}</p>
            <p className="text-xs text-gray-500 uppercase">Qty</p>
          </div>

        </div>

        <div className="border-t border-gray-100 mt-4 pt-3">
          <p className="text-sm text-gray-500">
            Procured by:{" "}
            <span className="font-semibold text-gray-900">{order.procured_by || "N/A"}</span>
          </p>
        </div>
      </article>
    </Link>
  );
};

export default OrderCard;
