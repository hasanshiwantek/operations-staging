import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import Modal from "./Modal";

const TotalPriceProfitTab = ({ orderData, handleUpdateField }) => {
  const [showTotalPrice, setShowTotalPrice] = useState(false);
  const [showTotalCost, setShowTotalCost] = useState(false);
  const [showTotalCostPlus4, setShowTotalCostPlus4] = useState(false);
  const [showGrossProfit, setShowGrossProfit] = useState(false);
  const [showGrossProfitMinus4, setShowGrossProfitMinus4] = useState(false);
  const [showProfitPercent, setShowProfitPercent] = useState(false);
  const [showEntryReasonType, setShowEntryReasonType] = useState(false);
  const [showEntryReasonOrder, setShowEntryReasonOrder] = useState(false);

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Total Price & Profit Analysis
      </h2>

      {/* Financial Metrics Table */}
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="text-gray-600 text-sm border-b bg-gray-50">
              <th className="py-3 px-4 text-left font-semibold">Total price</th>
              <th className="py-3 px-4 text-left font-semibold">Total Cost</th>
              <th className="py-3 px-4 text-left font-semibold">Total Cost+4%</th>
              <th className="py-3 px-4 text-left font-semibold">Gross Profit</th>
              <th className="py-3 px-4 text-left font-semibold">Gross Profit-4%</th>
              <th className="py-3 px-4 text-left font-semibold">Profit %</th>
            </tr>
          </thead>

          <tbody>
            <tr className="text-gray-800 hover:bg-gray-50 transition">
              {/* Total Price */}
              <td className="py-3 px-4 relative">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    ${orderData?.totalPriceValue || "0"}
                  </span>
                  <button
                    onClick={() => setShowTotalPrice(!showTotalPrice)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                {showTotalPrice && (
                  <Modal
                    title="Total Price"
                    options={[
                      { label: "Price", value: orderData?.totalPriceValue || 0 },
                      { label: "Tax", value: orderData?.tax || 0 },
                      { label: "Total Price", value: orderData?.totalPriceValue + orderData?.tax || 0 },
                    ]}
                    selected={orderData?.profitTotalPrice}
                    onSelect={(v) => handleUpdateField("totalPriceValue", v)}
                    onClose={() => setShowTotalPrice(false)}
                  />
                )}
              </td>

              {/* Total Cost */}
              <td className="py-3 px-4 relative">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    ${orderData?.totalCost || "0"}
                  </span>
                  <button
                    onClick={() => setShowTotalCost(!showTotalCost)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                {showTotalCost && (
                  <Modal
                    title="Total Cost"
                    options={[
                      { label: "Cost", value: orderData?.totalCost || 0 },
                      { label: "Vendor Tax", value: orderData?.vendorTax || 0 },
                      { label: "Total Cost (4%)", value: orderData?.totalCost4Percent || 0 },
                    ]}

                    selected={orderData.totalCost4Percent}
                    onSelect={(v) => handleUpdateField("totalCostValue", v)}
                    onClose={() => setShowTotalCost(false)}
                  />
                )}
              </td>

              {/* Total Cost+4% */}
              <td className="py-3 px-4 relative">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    ${orderData?.totalCost4Percent || "0"}
                  </span>
                  <button
                    onClick={() => setShowTotalCostPlus4(!showTotalCostPlus4)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                {showTotalCostPlus4 && (
                  <Modal
                    title="Total Cost+4%"
                    options={[
                      { label: "Total Cost", value: orderData?.totalCost },
                      { label: "CC / PayPal 4%", value: orderData?.ccPaypal },
                      { label: "Total Cost (with 4%)", value: orderData?.totalCost4Percent },
                    ]}

                    selected={orderData?.totalCost4Percent}
                    onSelect={(v) => handleUpdateField("totalCostPlus4", v)}
                    onClose={() => setShowTotalCostPlus4(false)}
                  />
                )}
              </td>

              {/* Gross Profit */}
              <td className="py-3 px-4 relative">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    ${orderData?.grossProfit || ""}
                  </span>
                  <button
                    onClick={() => setShowGrossProfit(!showGrossProfit)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                {showGrossProfit && (
                  <Modal
                    title="Gross Profit"
                    options={[
                      { label: "Total Price", value: orderData?.totalPriceValue },
                      { label: "Total Cost", value: orderData?.totalCost },
                      { label: "Gross Profit", value: orderData?.grossProfit || 0 },
                    ]}

                    selected={orderData?.grossProfit}
                    onSelect={(v) => handleUpdateField("grossProfit", v)}
                    onClose={() => setShowGrossProfit(false)}
                  />
                )}
              </td>

              {/* Gross Profit-4% */}
              <td className="py-3 px-4 relative">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    ${orderData?.grossProfitMinus4 || ""}
                  </span>
                  <button
                    onClick={() => setShowGrossProfitMinus4(!showGrossProfitMinus4)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                {showGrossProfitMinus4 && (
                  <Modal
                    title="Gross Profit-4%"
                    options={[
                      { label: "Total Price", value: orderData?.totalPriceValue },
                      { label: "Total Cost (+4%)", value: orderData?.totalCost4Percent },
                      { label: "Gross Profit (-4%)", value: orderData?.grossProfitMinus4 },
                    ]}

                    selected={orderData?.grossProfitMinus4}
                    onSelect={(v) => handleUpdateField("grossProfitMinus4", v)}
                    onClose={() => setShowGrossProfitMinus4(false)}
                  />
                )}
              </td>

              {/* Profit % */}
              <td className="py-3 px-4 relative">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {orderData?.profit || "0"}
                  </span>
                  <button
                    onClick={() => setShowProfitPercent(!showProfitPercent)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                {showProfitPercent && (
                  <Modal
                    title="Profit %"
                    options={[
                      { label: "Total Cost (-4%)", value: orderData?.totalCost4Percent },
                      { label: "Total Price", value: orderData?.totalPriceValue },
                      { label: "Profit", value: orderData?.profit },
                    ]}

                    selected={orderData?.profit}
                    onSelect={(v) => handleUpdateField("profitPercent", v)}
                    onClose={() => setShowProfitPercent(false)}
                  />
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Entry Check and Comment Section */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="border rounded-xl p-4 bg-gray-50">
          <h4 className="font-semibold text-gray-700 mb-2">Entry check</h4>
          <p className="text-sm text-gray-600">
            {orderData.entryCheck || ""}
          </p>
        </div>
        <div className="border rounded-xl p-4 bg-gray-50">
          <h4 className="font-semibold text-gray-700 mb-2">Comment</h4>
          <p className="text-sm text-gray-600">
            {orderData.comment || ""}
          </p>
        </div>
      </div>

      {/* Entry Reason and Attached to Order Table */}
      <div className="overflow-x-auto">
        <table className="w-auto border-collapse">
          <thead>
            <tr className="text-gray-600 text-sm border-b bg-gray-50">
              <th className="py-3 px-4 text-left font-semibold w-48">Entry Reason</th>
              <th className="py-3 px-4 text-left font-semibold w-48">Attached to order</th>
            </tr>
          </thead>

          <tbody>
            <tr className="text-gray-800 hover:bg-gray-50 transition">
              {/* Entry Reason */}
              <td className="py-3 px-4">
                <div className="relative">
                  <button
                    onClick={() => setShowEntryReasonType(!showEntryReasonType)}
                    className="w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <span>{orderData?.entryReason || "N/A"}</span>
                    {/* <ChevronDown size={16} className="text-gray-400" /> */}
                  </button>
                  {/* {showEntryReasonType && (
                    <Modal
                      title="Entry Reason Type"
                      options={[orderData?.entryReason]}
                      onSelect={(v) => handleUpdateField("entryReasonType", v)}
                      onClose={() => setShowEntryReasonType(false)}
                    />
                  )} */}
                </div>
              </td>

              {/* Attached to order */}
              <td className="py-3 px-4">
                <div className="relative">
                  <button
                    onClick={() => setShowEntryReasonOrder(!showEntryReasonOrder)}
                    className="w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <span>{orderData?.attachedOrder || "New order"}</span>
                    {/* <ChevronDown size={16} className="text-gray-400" /> */}
                  </button>
                  {/* {showEntryReasonOrder && (
                    <Modal
                      title="Entry Reason Order"
                      options={["New order", "Update order", "Refund order", "Cancel order"]}
                      selected={orderData.entryReasonOrder}
                      onSelect={(v) => handleUpdateField("entryReasonOrder", v)}
                      onClose={() => setShowEntryReasonOrder(false)}
                    />
                  )} */}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TotalPriceProfitTab;

