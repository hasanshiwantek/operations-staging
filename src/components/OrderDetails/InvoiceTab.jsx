import React, { useState } from "react";
import Modal from "./Modal";

const InvoiceTab = ({ orderData, handleUpdateField }) => {
  const [showOrderSource, setShowOrderSource] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showCountry, setShowCountry] = useState(false);
  const [showCarrier, setShowCarrier] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Invoice Details</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="text-gray-600 text-sm border-b bg-gray-50">
              <th className="py-3 px-4 text-left font-semibold">Invoice#</th>
              <th className="py-3 px-4 text-left font-semibold">Order source</th>
              <th className="py-3 px-4 text-left font-semibold">Payment status</th>
              <th className="py-3 px-4 text-left font-semibold">Brand</th>
              <th className="py-3 px-4 text-left font-semibold">Category</th>
              <th className="py-3 px-4 text-left font-semibold">Part#</th>
              <th className="py-3 px-4 text-left font-semibold">QTY</th>
              <th className="py-3 px-4 text-left font-semibold">Condition</th>
            </tr>
          </thead>

          <tbody>
            <tr className="text-gray-800 hover:bg-gray-50 transition">
              <td className="py-3 px-4">{orderData.invoiceNo}</td>
              <td className="py-3 px-4">
                <button
                  onClick={() => setShowOrderSource(true)}
                  className="text-indigo-600 font-medium hover:underline"
                >
                  {orderData.orderSource || "Select"}
                </button>
              </td>
              <td className="py-3 px-4">
                <button
                  onClick={() => setShowPayment(true)}
                  className="text-indigo-600 font-medium hover:underline"
                >
                  {orderData.paymentStatus || "Select"}
                </button>
              </td>
              <td className="py-3 px-4">{orderData.brand}</td>
              <td className="py-3 px-4">{orderData.category}</td>
              <td className="py-3 px-4">{orderData.partNumber}</td>
              <td className="py-3 px-4">{orderData.qty}</td>
              <td className="py-3 px-4">{orderData.condition}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Shipping Details */}
      <h3 className="mt-8 text-lg font-semibold text-gray-800 mb-3">Shipping</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="text-gray-600 text-sm border-b bg-gray-50">
              <th className="py-3 px-4 text-left font-semibold">Shipping A/C</th>
              <th className="py-3 px-4 text-left font-semibold">Country</th>
              <th className="py-3 px-4 text-left font-semibold">City</th>
              <th className="py-3 px-4 text-left font-semibold">State</th>
              <th className="py-3 px-4 text-left font-semibold">Carrier</th>
              <th className="py-3 px-4 text-left font-semibold">Tracking#</th>
              <th className="py-3 px-4 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-gray-800 hover:bg-gray-50 transition">
              <td className="py-3 px-4">{orderData.shippingAccount}</td>
              <td className="py-3 px-4">
                <button
                  onClick={() => setShowCountry(true)}
                  className="text-indigo-600 font-medium hover:underline"
                >
                  {orderData.country || "Select"}
                </button>
              </td>
              <td className="py-3 px-4">{orderData.city}</td>
              <td className="py-3 px-4">{orderData.state}</td>
              <td className="py-3 px-4">
                <button
                  onClick={() => setShowCarrier(true)}
                  className="text-indigo-600 font-medium hover:underline"
                >
                  {orderData.carrier || "Select"}
                </button>
              </td>
              <td className="py-3 px-4">{orderData.tracking}</td>
              <td className="py-3 px-4">
                <button
                  onClick={() => setShowStatus(true)}
                  className="text-indigo-600 font-medium hover:underline"
                >
                  {orderData.status || "Select"}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Billing Info */}
      <div className="grid grid-cols-2 gap-6 mt-6 text-sm">
        <div className="border rounded-xl p-4 bg-gray-50">
          <h4 className="font-semibold text-gray-700 mb-2">Bill to address</h4>
          <p>{orderData.billTo}</p>
        </div>
        <div className="border rounded-xl p-4 bg-gray-50">
          <h4 className="font-semibold text-gray-700 mb-2">Ship to address</h4>
          <p>{orderData.shipTo}</p>
        </div>
      </div>
      <div className="mt-6">
        <h4 className="font-semibold text-gray-700 mb-2">Reasons (If any)</h4>
        <p className="bg-gray-50 rounded-xl p-3">
          {orderData.reason || "No reason provided"}
        </p>
      </div>

      {/* Modals */}
      {showOrderSource && (
        <Modal
          title="Order source"
          options={["Website", "Phone", "Email", "In-store"]}
          selected={orderData.orderSource}
          onSelect={(v) => handleUpdateField("Order Source", v)}
          onClose={() => setShowOrderSource(false)}
        />
      )}
      {showPayment && (
        <Modal
          title="Payment status"
          options={["Paid", "Pending", "Failed", "Refunded"]}
          selected={orderData.paymentStatus}
          onSelect={(v) => handleUpdateField("Payment Status", v)}
          onClose={() => setShowPayment(false)}
        />
      )}
      {showCountry && (
        <Modal
          title="Country"
          options={["USA", "Canada", "UK", "Australia"]}
          selected={orderData.country}
          onSelect={(v) => handleUpdateField("Country", v)}
          onClose={() => setShowCountry(false)}
        />
      )}
      {showCarrier && (
        <Modal
          title="Carrier"
          options={["FedEx", "UPS", "DHL", "USPS"]}
          selected={orderData.carrier}
          onSelect={(v) => handleUpdateField("Carrier", v)}
          onClose={() => setShowCarrier(false)}
        />
      )}
      {showStatus && (
        <Modal
          title="Status"
          options={["Delivered", "In Transit", "Delayed", "Cancel", "Partial", "Refunded"]}
          selected={orderData.status}
          onSelect={(v) => handleUpdateField("Status", v)}
          onClose={() => setShowStatus(false)}
        />
      )}
    </div>
  );
};

export default InvoiceTab;

