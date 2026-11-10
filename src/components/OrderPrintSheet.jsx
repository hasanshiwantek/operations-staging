import { useEffect } from "react";
import { createPortal } from "react-dom";

// Print-only view of an order: one row per field, the field name on the left
// and its full value on the right, so long values wrap instead of being cut
// off. Hidden on screen; while it is mounted, printing the page (Print button,
// Ctrl+P or the browser menu) prints only this sheet (see index.css).
const OrderPrintSheet = ({ order, title = "Order Details" }) => {
  useEffect(() => {
    document.body.classList.add("order-print-mode");
    return () => document.body.classList.remove("order-print-mode");
  }, []);

  // Plain fields only (lists joined); internal keys and nested objects skipped
  const rows = Object.entries(order || {})
    .filter(([key]) => key !== "order_type")
    .map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : value])
    .filter(([, value]) => value === null || typeof value !== "object");
  const orderNo = order?.["Order#"];
  const printedAt = new Date().toLocaleString();

  return createPortal(
    <div className="order-print-sheet">
      <div className="order-print-header">
        <h1>
          {title}
          {orderNo ? ` - #${orderNo}` : ""}
        </h1>
        <span>Printed {printedAt}</span>
      </div>
      <table>
        <tbody>
          {rows.map(([key, value]) => {
            const text = value == null ? "" : String(value).trim();
            return (
              <tr key={key}>
                <th scope="row">{key}</th>
                <td>{text || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>,
    document.body,
  );
};

export default OrderPrintSheet;
