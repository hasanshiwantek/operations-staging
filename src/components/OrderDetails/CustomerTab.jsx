import React from "react";

const CustomerTab = ({ orderData }) => {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Customer Details</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="text-gray-600 text-sm border-b bg-gray-50">
              <th className="py-3 px-4 text-left font-semibold">Name</th>
              <th className="py-3 px-4 text-left font-semibold">Company</th>
              <th className="py-3 px-4 text-left font-semibold">Email</th>
              <th className="py-3 px-4 text-left font-semibold">Phone</th>
              <th className="py-3 px-4 text-left font-semibold">Price</th>
              <th className="py-3 px-4 text-left font-semibold">Shipping</th>
              <th className="py-3 px-4 text-left font-semibold">Tax</th>
            </tr>
          </thead>

          <tbody>
            <tr className="text-gray-800 hover:bg-gray-50 transition">
              <td className="py-3 px-4">{orderData.customerName || "N/A"}</td>
              <td className="py-3 px-4">{orderData.customerCompany || "N/A"}</td>
              <td className="py-3 px-4">{orderData.customerEmail || "N/A"}</td>
              <td className="py-3 px-4">{orderData.customerPhone || "N/A"}</td>
              <td className="py-3 px-4">
                ${parseFloat(orderData.price || 0).toFixed(2)}
              </td>
              <td className="py-3 px-4">
                ${parseFloat(orderData.shipping || 0).toFixed(2)}
              </td>
              <td className="py-3 px-4">
                ${parseFloat(orderData.tax || 0).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerTab;

