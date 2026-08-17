import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { HotTable } from '@handsontable/react-wrapper';
import { registerAllModules } from 'handsontable/registry';
import { useDispatch, useSelector } from 'react-redux';
import autoTable from 'jspdf-autotable';   // ← Changed import
import EditOrderDetailModal from './EditOrderDetailModal';
import Handsontable from 'handsontable';
import { fetchOrdersAdmin, fetchOrders, postOrderFiles, updateOrderFiles, createGenerateId, postSyncOrder, importOrderFiles, fetchOrderOptions } from '../store/usersSlice';
import { columnsOfSheet } from '../utils/constant';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';
import OrderDetailModal from './OrderDetailModal';
import ExportOrdersPdf from './ExportOrdersPdf';
import { fetchOrderTypesMap } from '../store/orderTypeSlice';

registerAllModules();
const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
};
function OrderListTable({ Orders }) {
  const hotRef = useRef(null);
  const isRightClickRef = useRef(false);
  const isContextMenuOpen = useRef(false);
  const dispatch = useDispatch();
  const { orderloading, syncLoading } = useSelector((state) => state.users);
  const { token, storeId, user: authUser } = useSelector((state) => state.auth);
  const { orderTypesMap } = useSelector((state) => state.orderTypes);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isRMAMode, setIsRMAMode] = useState(false);
  const [isCreatePartMode, setIsCreatePartMode] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [showColorFilter, setShowColorFilter] = useState(false);
  const [filterPosition, setFilterPosition] = useState({ top: 0, left: 0 });
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [selectionSummary, setSelectionSummary] = useState({
    sum: 0,
    count: 0,
    visible: false,
  });
  // Add these calculations inside the component (before the return)
  const summary = useMemo(() => {
    if (!Orders || Orders.length === 0) {
      return {
        totalPrice: 0,
        totalCost: 0,
        totalCostPlus4: 0,
        grossProfit: 0,
        grossProfitMinus4: 0,
        count: 0,
      };
    }

    return Orders.reduce(
      (acc, order) => {
        acc.totalPrice += Number(order["Total Price"] || 0);
        acc.totalCost += Number(order["Total Cost"] || 0);
        acc.totalCostPlus4 += Number(order["Total Cost+4%"] || 0);
        acc.grossProfit += Number(order["Gross Profit"] || 0);
        acc.grossProfitMinus4 += Number(order["Gross Profit-4%"] || 0);
        acc.count += 1;
        return acc;
      },
      {
        totalPrice: 0,
        totalCost: 0,
        totalCostPlus4: 0,
        grossProfit: 0,
        grossProfitMinus4: 0,
        count: 0,
      }
    );
  }, [Orders]);

  const handleBeforeOnCellMouseDown = (event, coords, TD) => {
    // Right click (button === 2) → prevent selection
    if (event.button === 2) {
      event.stopImmediatePropagation();   // stops Handsontable from selecting the cell
      return false;
    }
  };
  const handleBeforeOnCellContextMenu = (event) => {
    event.stopImmediatePropagation();
    // Also hide the sum badge
    setSelectionSummary({ sum: 0, count: 0, visible: false });
  };

  // const updateSelectionSummary = () => {
  //   if (isRightClickRef.current) return;

  //   const hot = hotRef.current?.hotInstance;
  //   if (!hot) return;

  //   const selected = hot.getSelected();
  //   if (!selected || selected.length === 0) {
  //     setSelectionSummary({ sum: 0, count: 0, visible: false });
  //     return;
  //   }

  //   let sum = 0;
  //   let count = 0;
  //   const [r1, c1, r2, c2] = selected[0];

  //   for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
  //     for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
  //       const val = parseFloat(hot.getDataAtCell(r, c));
  //       if (!isNaN(val)) {
  //         sum += val;
  //         count++;
  //       }
  //     }
  //   }

  //   setSelectionSummary({
  //     sum,
  //     count,
  //     visible: count > 1,
  //   });
  // };
  const filteredOrders = useMemo(() => {
    if (!Orders) return [];

    if (orderTypeFilter === "all") return Orders;

    return Orders.filter((order) => {
      const type = String(order.order_type || "").toLowerCase();
      const status = String(order.Status || "").toLowerCase();

      if (orderTypeFilter === "cancelled") return status === "cancelled";
      if (orderTypeFilter === "delivered") return status === "delivered";
      return type === orderTypeFilter;
    });
  }, [Orders, orderTypeFilter]);

  const updateSelectionSummary = useCallback(() => {
    if (isRightClickRef.current) return;

    const hot = hotRef.current?.hotInstance;
    if (!hot) return;

    const selected = hot.getSelected();
    if (!selected || selected.length === 0) {
      setSelectionSummary((prev) =>
        prev.visible ? { sum: 0, count: 0, visible: false } : prev
      );
      return;
    }

    let sum = 0;
    let count = 0;
    const [r1, c1, r2, c2] = selected[0];

    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
        const val = parseFloat(hot.getDataAtCell(r, c));
        if (!isNaN(val)) {
          sum += val;
          count++;
        }
      }
    }

    setSelectionSummary((prev) => {
      // Only update state if values actually changed
      if (prev.sum === sum && prev.count === count && prev.visible === count > 1) {
        return prev;
      }
      return {
        sum,
        count,
        visible: count > 1,
      };
    });
  }, []);
  const exportToExcel = () => {
    if (!Orders || Orders.length === 0) return alert("No data to export");

    const ws = XLSX.utils.json_to_sheet(Orders);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `Orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  const handleSyncOrders = async () => {

    await dispatch(postSyncOrder({ storeId: storeId?.id, storeName: storeId?.name?.toLowerCase() })).unwrap().then(() => {
      dispatch(fetchOrdersAdmin(storeId?.id));
    })
  };

  const exportToPDF = () => {
    if (!Orders || Orders.length === 0) {
      return alert("No data to export");
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a1'
    });

    doc.setFontSize(14);
    doc.text("CTS Dashboard - Order Sheet", 14, 20);

    const tableColumn = columnsOfSheet.map(col => col.title);
    const tableRows = Orders.map(order =>
      columnsOfSheet.map(col => {
        let value = order[col.data];
        if (value === null || value === undefined) return "";
        return String(value); // full value, no truncation
      })
    );

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: {
        fontSize: 6,
        cellPadding: 1.5,
        overflow: 'linebreak',   // wraps long text instead of cutting it
        valign: 'top'
      },
      headStyles: {
        fillColor: [27, 81, 239],
        fontSize: 7,
        textColor: 255,
        overflow: 'linebreak'
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 25, right: 10, bottom: 15, left: 10 },
      tableWidth: 'wrap',
      columnStyles: {
        0: { cellWidth: 22 },
        17: { cellWidth: 45 },
        18: { cellWidth: 45 },
        28: { cellWidth: 40 }
      },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.text(
          `Page ${doc.internal.getNumberOfPages()}`,
          data.settings.margin.left,
          doc.internal.pageSize.getHeight() - 8
        );
      }
    });

    doc.save(`Orders_${new Date().toISOString().slice(0, 10)}.pdf`);
  };
  // Add this handler
  const handleOrderClick = (rowIndex) => {
    // rowIndex from Handsontable is 0-based (header is row 0)
    const actualDataIndex = rowIndex;

    const { order_type, ...clickedOrder } = Orders[actualDataIndex];

    if (clickedOrder) {
      setIsCreatePartMode(false);
      setIsRMAMode(false);
      setSelectedOrder(clickedOrder);
    }
  };
  const importExcel = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx, .xls";

    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const result = await dispatch(importOrderFiles(file)).unwrap();

        alert(result.message || "Excel imported successfully!");

        // Refresh the table
        dispatch(fetchOrdersAdmin(storeId?.id));
      } catch (err) {
        alert(err || "Import failed");
      }
    };

    input.click();
  };

  // Fetch options when modal opens
  useEffect(() => {
    if (storeId?.id) {
      dispatch(fetchOrderOptions(storeId?.id));
      dispatch(fetchOrderTypesMap(storeId.id));
    }
  }, [storeId?.id]);
  const cells = useCallback((row) => {
    const order = Orders?.[row];
    const cellProperties = {};

    if (!order) return cellProperties;

    const status = String(order.Status || "").toLowerCase();
    const type = String(order.order_type || "").toLowerCase();
    if (status === "delivered") {
      cellProperties.className = "delivered-row";
    } else if (status === "cancelled") {
      cellProperties.className = "cancelled-row";
    } else if (type === "po") {
      cellProperties.className = "po-row";
    } else if (type === "rma") {
      cellProperties.className = "rma-row";
    }

    return cellProperties;
  }, [Orders]);

  const nestedHeaders = useMemo(() => {
    return [
      // Top row (summary)
      columnsOfSheet.map((col) => {
        if (col.data === "Order#") {
          return { label: String(summary.count), colspan: 1 };
        }
        if (col.data === "Total Price") {
          return { label: formatCurrency(summary.totalPrice), colspan: 1 };
        }
        if (col.data === "Total Cost") {
          return { label: formatCurrency(summary.totalCost), colspan: 1 };
        }
        if (col.data === "Total Cost+4%") {
          return { label: formatCurrency(summary.totalCostPlus4), colspan: 1 };
        }
        if (col.data === "Gross Profit") {
          return { label: formatCurrency(summary.grossProfit), colspan: 1 };
        }
        if (col.data === "Gross Profit-4%") {
          return { label: formatCurrency(summary.grossProfitMinus4), colspan: 1 };
        }
        return "";
      }),

      // Second row (titles)
      columnsOfSheet.map((col) => col.title),
    ];
  }, [summary]);
  useEffect(() => {
    const styleId = "dynamic-row-colors";
    let styleTag = document.getElementById(styleId);

    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    styleTag.innerHTML = `
    .handsontable td.po-row {
      background-color: ${orderTypesMap?.po} !important;
    }
    .handsontable td.rma-row {
      background-color: ${orderTypesMap?.rma || "#e5c13e"} !important;
    }
    .handsontable td.cancelled-row {
      background-color: ${orderTypesMap?.cancelled || "#ea8b81"} !important;
    }
    .handsontable td.delivered-row {
      background-color: #86bd93 !important;
    }
  `;
  }, [orderTypesMap?.po,
  orderTypesMap?.rma,
  orderTypesMap?.cancelled]);

  if (orderloading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Dashboard - Order Sheet</h2>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '60px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #1b51ef',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ fontSize: '16px', color: '#666' }}>Loading orders...</p>
        </div>

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <React.Fragment>
      {selectedOrder && (
        <EditOrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSave={(updatedOrderPayload) => {

            const {
              "Total Price": totalPrice,
              "Total Cost": totalCost,
              "Card Payment": cardPayment,
              "Total Cost+4%": totalCostPlus4,
              "Gross Profit": grossProfit,
              "Gross Profit-4%": grossProfitMinus4,
              "Profit %": profitPercent, ...updatedOrder
            } = updatedOrderPayload;
            if (isCreatePartMode) {

              // ========== CREATE API ==========
              dispatch(
                postOrderFiles({
                  payload: { ...updatedOrder, order_type: "po" },
                  role_id: storeId?.id,
                })
              ).unwrap()
                .then(() => {
                  dispatch(fetchOrdersAdmin(storeId?.id));
                  setSelectedOrder(null);
                  setIsCreatePartMode(false);
                })
                .catch((err) => {
                  console.error("Create failed:", err);
                });
            } else if (isRMAMode) {
              dispatch(
                postOrderFiles({
                  payload: { ...updatedOrder, order_type: "rma" },
                  role_id: storeId?.id,
                })
              ).unwrap()
                .then(() => {
                  dispatch(fetchOrdersAdmin(storeId?.id));
                  setSelectedOrder(null);
                  setIsRMAMode(false);
                })
                .catch((err) => {
                  console.error("Create failed:", err);
                });
            } else {
              // ========== UPDATE API ==========
              dispatch(updateOrderFiles({
                id: updatedOrder["Order#"],
                data: updatedOrder,
                role_id: storeId?.id,
              }))
                .unwrap()
                .then(() => {
                  dispatch(fetchOrdersAdmin(storeId?.id));
                  setSelectedOrder(null);
                })
                .catch((err) => {
                  console.error("Update failed:", err);
                });
            }
          }}
        />
      )}
      {isAddMode && (
        <OrderDetailModal
          order={null}
          onClose={() => {
            setIsAddMode(false);
          }}
          onSave={(data, isNew) => {
            if (isNew) {

              dispatch(
                postOrderFiles({
                  payload: data,
                  role_id: storeId?.id,
                })
              ).unwrap()
                .then(() => {
                  dispatch(fetchOrdersAdmin(storeId?.id))
                  setSelectedOrder(null)
                }).catch((err) => {
                  console.error("Update failed:", err);
                });
            }
          }}
        />
      )}
      <div style={{ padding: '20px' }}>
        <div
          style={{
            position: 'sticky',
            top: '0px',
            zIndex: 30,
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            padding: '12px 0',
          }}
        >
          <h2>Dashboard - Order Sheet</h2>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSyncOrders}
              style={{ padding: '8px 16px', background: 'gray', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              {syncLoading ? "Sync..." : "Sync Orders"}
            </button>
            <button
              onClick={exportToExcel}
              style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Download Excel
            </button>
            <button
              onClick={importExcel}
              style={{
                padding: "8px 16px",
                background: "#1b51ef",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Import Excel
            </button>
            <ExportOrdersPdf orders={Orders || []} />

            <button
              onClick={() => setIsAddMode(true)}
              className="bg-indigo-600"
              style={{ padding: '8px 16px', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: "center" }}
            >
              + Add Order
            </button>
          </div>
        </div>
        {/* Summary Bar */}

        {/* ← Add this div with higher z-index control */}
        <div style={{ position: 'relative', zIndex: 10 }}>

          <HotTable
            ref={hotRef}
            data={Orders || []}
            columns={columnsOfSheet}
            style={{ zIndex: 10 }}
            colHeaders={true}
            rowHeaders={false}

            fragmentSelection={false}
            afterOnCellMouseDown={(event, coords) => {
              // coords.row === -1 means header was clicked
              if (coords.row === -1) {
                event.stopImmediatePropagation();
              }
            }}
            beforeOnCellMouseDown={(event) => {
              isRightClickRef.current = event.button === 2;
            }}

            beforeOnCellContextMenu={(event) => {
              event.preventDefault(); // only this is needed
              isRightClickRef.current = true; // reset right-click flag
            }}

            afterSelectionEnd={() => {
              // Delay slightly so context menu can open first
              setTimeout(() => {
                if (isRightClickRef.current) {
                  isRightClickRef.current = false;
                  return;
                }
                updateSelectionSummary();
              }, 50);
            }}

            afterDeselect={() => {
              setSelectionSummary((prev) =>
                prev.visible ? { sum: 0, count: 0, visible: false } : prev
              );
            }}

            afterContextMenuHide={() => {
              isRightClickRef.current = false;
            }}
            stretchH="all"
            height="calc(100vh - 180px)"
            width="100%"
            licenseKey="non-commercial-and-evaluation"
            filters={true}
            dropdownMenu={false}
            dropdownMenu={[
              'filter_by_condition',
              'filter_by_value',
              'filter_action_bar'
            ]}
            // contextMenu={true}
            manualColumnResize={true}
            columnSorting={false}
            fixedColumnsStart={2}
            renderAllRows={false}
            // Important settings
            readOnly={true}
            disableVisualSelection={false}
            outsideClickDeselects={false}

            afterGetColHeader={(col, TH, headerLevel) => {
              if (headerLevel !== 0) return;

              // col index starts from 0 for the first data column (Sno)
              const column = columnsOfSheet[col];
              if (!column) return;

              // Clean previous classes
              TH.classList.remove(
                "htOrderCount",
                "htTotalPrice",
                "htTotalCost",
                "htTotalCost4",
                "htGrossProfit",
                "htGrossProfit4"
              );

              if (column.data === "Order#") {
                TH.classList.add("htOrderCount");
              } else if (column.data === "Total Price") {
                TH.classList.add("htTotalPrice");
              } else if (column.data === "Total Cost") {
                TH.classList.add("htTotalCost");
              } else if (column.data === "Total Cost+4%") {
                TH.classList.add("htTotalCost4");
              } else if (column.data === "Gross Profit") {
                TH.classList.add("htGrossProfit");
              } else if (column.data === "Gross Profit-4%") {
                TH.classList.add("htGrossProfit4");
              }
            }}
            nestedHeaders={nestedHeaders}
            // nestedHeaders={[
            //   // Top row (summary)
            //   columnsOfSheet.map((col) => {
            //     if (col.data === "Order#") {
            //       return {
            //         label: String(summary.count),
            //         colspan: 1,
            //       };
            //     }
            //     if (col.data === "Total Price") {
            //       return { label: formatCurrency(summary.totalPrice), colspan: 1 };
            //     }
            //     if (col.data === "Total Cost") {
            //       return { label: formatCurrency(summary.totalCost), colspan: 1 };
            //     }
            //     if (col.data === "Total Cost+4%") {
            //       return { label: formatCurrency(summary.totalCostPlus4), colspan: 1 };
            //     }
            //     if (col.data === "Gross Profit") {
            //       return { label: formatCurrency(summary.grossProfit), colspan: 1 };
            //     }
            //     if (col.data === "Gross Profit-4%") {
            //       return { label: formatCurrency(summary.grossProfitMinus4), colspan: 1 };
            //     }
            //     return "";
            //   }),

            //   // Second row (titles)
            //   columnsOfSheet.map((col) => col.title),
            // ]}
            contextMenu={{
              items: {
                edit: {
                  name: 'Edit',
                  callback: function (key, selection) {
                    const row = selection[0].start.row;
                    handleOrderClick(row);          // your existing handler
                  }
                },
                create_part: {
                  name: 'Create part order',
                  hidden: function () {
                    const selected = this.getSelectedLast();
                    if (!selected) return true;

                    const row = selected[0];
                    const order = Orders?.[row];
                    const type = String(order?.order_type || '').toLowerCase();

                    return type === 'po' || type === 'rma';
                  },
                  callback: async (key, selection) => {
                    const row = selection[0].start.row;


                    let { order_type, ...originalOrder } = Orders[row];

                    if (!originalOrder) return;

                    try {
                      const result = await dispatch(
                        createGenerateId({ orderId: String(originalOrder['Order#']), role_id: storeId?.id })
                      ).unwrap();

                      if (result.success && result.generated_id) {
                        const newOrderData = {
                          ...originalOrder,
                          'Order#': result.generated_id,   // only Order# changes
                        };

                        setIsCreatePartMode(true);         // ← mark as create mode
                        setSelectedOrder(newOrderData);
                      }
                    } catch (err) {
                      console.error('Failed to generate part number:', err);
                    }
                  }
                },
                rma: {
                  name: 'RMA',
                  hidden: function () {
                    const selected = this.getSelectedLast();
                    if (!selected) return true;

                    const row = selected[0];
                    const order = Orders?.[row];
                    const type = String(order?.order_type || '').toLowerCase();

                    return type === 'rma';
                  },
                  callback: async (key, selection) => {
                    const row = selection[0].start.row;
                    let { order_type, ...originalOrder } = Orders[row];

                    if (!originalOrder) return;

                    try {
                      const result = await dispatch(
                        createGenerateId({ orderId: String(originalOrder['Order#']), role_id: storeId?.id })
                      ).unwrap();

                      if (result.success && result.generated_id) {
                        const newOrderData = {
                          ...originalOrder,
                          'Order#': result.generated_id,   // only Order# changes
                        };

                        setIsRMAMode(true);         // ← mark as create mode
                        setSelectedOrder(newOrderData);
                      }
                    } catch (err) {
                      console.error('Failed to generate part number:', err);
                    }
                  }
                },
                // Optional separator
                sp1: '---------',
                // You can still keep some default items if needed
                // copy: {},
                // cut: {},
              }
            }}
            cells={cells}

            emptyDataMessage="No orders found"
          />
          {/* Selection Summary Badge */}
          {selectionSummary.visible && (
            <div
              style={{
                position: "fixed",
                bottom: "24px",
                right: "30px",
                background: "#e8f5e9",
                border: "1px solid #81c784",
                borderRadius: "6px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#2e7d32",
                boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
                zIndex: 9999,
                display: "flex",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <span>
                Sum:{" "}
                {selectionSummary.sum.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span style={{ opacity: 0.5 }}>|</span>
              <span>Count: {selectionSummary.count}</span>
            </div>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}

export default OrderListTable;
