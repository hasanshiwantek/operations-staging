import React, { useState } from "react";
import Modal from "./Modal";
import { AlertTriangle } from "lucide-react";

const OrderTab = ({ orderData, handleUpdateField }) => {
  const [showProcuredBy, setShowProcuredBy] = useState(false);
  const [showLeadSource, setShowLeadSource] = useState(false);
  const [showSalesAgent, setShowSalesAgent] = useState(false);

    const hasDash = orderData?.orderId?.includes("-");

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Details</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="text-gray-600 text-sm border-b bg-gray-50">
              <th className="py-3 px-4 text-left font-semibold">Order ID</th>
              <th className="py-3 px-4 text-left font-semibold">Charged date</th>
              <th className="py-3 px-4 text-left font-semibold">Lead source</th>
              <th className="py-3 px-4 text-left font-semibold">Procured by</th>
              <th className="py-3 px-4 text-left font-semibold">Order date</th>
              <th className="py-3 px-4 text-left font-semibold">Refund date</th>
              <th className="py-3 px-4 text-left font-semibold">Sales agent</th>
            </tr>
          </thead>

          <tbody>
            <tr className="text-gray-800 hover:bg-gray-50 transition">
             <td className={`py-3 px-4 flex items-center gap-1 ${hasDash ? "text-red-600" : "text-gray-900"}`}>
  {orderData.orderId}
  {hasDash && <AlertTriangle size={14} className="text-red-600" />}
</td>
              <td className="py-3 px-4">{orderData.chargedDate}</td>
              <td className="py-3 px-4">
                <button
                  onClick={() => setShowLeadSource(true)}
                  className="text-indigo-600 font-medium hover:underline"
                >
                  {orderData.leadSource || "Select"}
                </button>
              </td>
              <td className="py-3 px-4">
                <button
                  onClick={() => setShowProcuredBy(true)}
                  className="text-indigo-600 font-medium hover:underline"
                >
                  {orderData.procuredBy || "Select"}
                </button>
              </td>
              <td className="py-3 px-4">{orderData.orderDate}</td>
              <td className="py-3 px-4">{orderData.refundDate}</td>
              <td className="py-3 px-4">
                <button
                  onClick={() => setShowSalesAgent(true)}
                  className="text-indigo-600 font-medium hover:underline"
                >
                  {orderData.salesAgent || "Select"}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Dropdown Modals */}
      {showProcuredBy && (
        <Modal
          title="Procured by"
          options={["Taha Waqar", "Ali Sheikh", "Harry Patel", "John Doe"]}
          selected={orderData.procuredBy}
          onSelect={(v) => handleUpdateField("Procured By", v)}
          onClose={() => setShowProcuredBy(false)}
        />
      )}
      {showLeadSource && (
        <Modal
          title="Lead source"
          options={[
            "PPC",
            "Inbound call",
            "Live chat",
            "Contact form",
            "Repeat inquiry",
            "Email",
            "Follow up",
            "Direct",
          ]}
          selected={orderData.leadSource}
          onSelect={(v) => handleUpdateField("Lead Source", v)}
          onClose={() => setShowLeadSource(false)}
        />
      )}
      {showSalesAgent && (
        <Modal
          title="Sales agent"
          options={["Taha Waqar", "Ali Sheikh", "Harry Patel", "John Doe"]}
          selected={orderData.salesAgent}
          onSelect={(v) => handleUpdateField("Sales Agent", v)}
          onClose={() => setShowSalesAgent(false)}
        />
      )}
    </div>
  );
};

export default OrderTab;

