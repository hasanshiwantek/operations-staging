import React from "react";

const VendorTab = ({ orderData }) => {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Vendor Details</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="text-gray-600 text-sm border-b bg-gray-50">
              <th className="py-3 px-4 text-left font-semibold">Vendor</th>
              <th className="py-3 px-4 text-left font-semibold">Vendor order#</th>
              <th className="py-3 px-4 text-left font-semibold">Vendor part#</th>
              <th className="py-3 px-4 text-left font-semibold">Status</th>
              <th className="py-3 px-4 text-left font-semibold">CC/PayPal 4%</th>
              <th className="py-3 px-4 text-left font-semibold">Charged vendor</th>
              <th className="py-3 px-4 text-left font-semibold">Paid via</th>
              <th className="py-3 px-4 text-left font-semibold">Cost</th>
              <th className="py-3 px-4 text-left font-semibold">Shipping</th>
              <th className="py-3 px-4 text-left font-semibold">Tax</th>
            </tr>
          </thead>

          <tbody>
            <tr className="text-gray-800 hover:bg-gray-50 transition">
              <td className="py-3 px-4">{orderData.vendor || "N/A"}</td>
              <td className="py-3 px-4">
                {orderData["Vendor order#"] || orderData.vendorOrder || "N/A"}
              </td>
              <td className="py-3 px-4">
                {orderData["Vendor Part#"] || orderData.vendorPart || "N/A"}
              </td>
              <td className="py-3 px-4">{orderData.status || "N/A"}</td>
              <td className="py-3 px-4">
                ${((parseFloat(orderData.ccPaypal) || 0)).toFixed(2)}
              </td>
              <td className="py-3 px-4">
                {orderData["Charged Vendor"] || "Yes"}
              </td>
              <td className="py-3 px-4">
                {orderData["Paid Via"] ||
                  orderData["Paid via"] ||
                  orderData.paidVia ||
                  "N/A"}
              </td>
              <td className="py-3 px-4">
                ${parseFloat(orderData.cost || 0).toFixed(2)}
              </td>
              <td className="py-3 px-4">
                ${parseFloat(orderData.vendorShipping || 0).toFixed(2)}
              </td>
              <td className="py-3 px-4">
                ${parseFloat(orderData.vendorTax || 0).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VendorTab;

