import React, { useEffect, useRef, useState } from 'react';
import { HotTable } from '@handsontable/react-wrapper';
import { registerAllModules } from 'handsontable/registry';
import { useDispatch, useSelector } from 'react-redux';
import autoTable from 'jspdf-autotable';   // ← Changed import
import EditOrderDetailModal from './EditOrderDetailModal';
import { fetchOrdersAdmin, fetchOrders, postOrderFiles, updateOrderFiles, createGenerateId } from '../store/usersSlice';
import { columnsOfSheet } from '../utils/constant';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';
import OrderDetailModal from './OrderDetailModal';
import ExportOrdersPdf from './ExportOrdersPdf';

registerAllModules();

function OrderListTable() {
  const hotRef = useRef(null);
  const dispatch = useDispatch();
  const { Orders, orderloading } = useSelector((state) => state.users);
  const { token, storeId, user: authUser } = useSelector((state) => state.auth);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isCreatePartMode, setIsCreatePartMode] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const exportToExcel = () => {
    if (!Orders || Orders.length === 0) return alert("No data to export");

    const ws = XLSX.utils.json_to_sheet(Orders);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `CTS_Orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

    doc.save(`CTS_Orders_${new Date().toISOString().slice(0, 10)}.pdf`);
  };
  // Add this handler
  const handleOrderClick = (rowIndex) => {
    // rowIndex from Handsontable is 0-based (header is row 0)
    const actualDataIndex = rowIndex;

    const clickedOrder = Orders[actualDataIndex];

    if (clickedOrder) {
      setIsCreatePartMode(false);
      setSelectedOrder(clickedOrder);
    }
  };

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
          // onSave={(updatedOrder) => {
          //   dispatch(updateOrderFiles({ id: updatedOrder["Order#"], data: updatedOrder }))
          //     .unwrap()
          //     .then(() => {
          //       dispatch(fetchOrders());
          //       setSelectedOrder(null)
          //     })
          //     .catch((err) => {
          //       console.error("Update failed:", err);
          //     });
          // }}
          onSave={(updatedOrder) => {
            console.log(isCreatePartMode, updatedOrder);
            if (isCreatePartMode) {

              // ========== CREATE API ==========
              dispatch(postOrderFiles(updatedOrder))   // ← your create thunk
                .unwrap()
                .then(() => {
                  dispatch(fetchOrders());
                  setSelectedOrder(null);
                  setIsCreatePartMode(false);
                })
                .catch((err) => {
                  console.error("Create failed:", err);
                });
            } else {
              // ========== UPDATE API ==========
              dispatch(updateOrderFiles({
                id: updatedOrder["Order#"],
                data: updatedOrder
              }))
                .unwrap()
                .then(() => {
                  dispatch(fetchOrders());
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
              dispatch(postOrderFiles(data)).unwrap()
                .then(() => {
                  dispatch(fetchOrders());
                  setSelectedOrder(null)
                }).catch((err) => {
                  console.error("Update failed:", err);
                });
            }
          }}
        />
      )}
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Dashboard - Order Sheet</h2>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={exportToExcel}
              style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Download Excel
            </button>
            {/* <button
              onClick={exportToPDF}
              style={{ padding: '8px 16px', background: '#e11d48', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Download PDF
            </button> */}

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

        {/* ← Add this div with higher z-index control */}
        <div style={{ position: 'relative', zIndex: 10 }}>

          <HotTable
            ref={hotRef}
            data={Orders || []}
            columns={columnsOfSheet}
            style={{ zIndex: 10 }}
            colHeaders={true}
            rowHeaders={true}
            stretchH="all"
            height="auto"
            width="100%"
            licenseKey="non-commercial-and-evaluation"
            filters={true}
            dropdownMenu={false}
            // dropdownMenu={[
            //   'filter_by_condition',
            //   'filter_by_value',
            //   'filter_action_bar'
            // ]}
            // contextMenu={true}
            manualColumnResize={true}
            columnSorting={true}
            fixedColumnsStart={1}
            readOnly={true}
            disableVisualSelection={true}
            contextMenu={{
              items: {
                edit: {
                  name: 'Edit',
                  callback: function (key, selection) {
                    const row = selection[0].start.row;
                    handleOrderClick(row);          // your existing handler
                  }
                },

                // create_part: {
                //   name: 'Create part number',
                //   callback: async (key, selection) => {
                //     const row = selection[0].start.row;
                //     const originalOrder = Orders[row];

                //     if (!originalOrder) return;

                //     const originalOrderId = originalOrder['Order#'];

                //     try {
                //       // 1. Generate new ID
                //       const result = await dispatch(
                //         createGenerateId({ orderId: originalOrderId })
                //       ).unwrap();

                //       if (result.success && result.generated_id) {
                //         // 2. Create a copy of original order + change only Order#
                //         const newOrderData = {
                //           ...originalOrder,
                //           'Order#': result.generated_id,   // only this field changes
                //         };

                //         // 3. Open the same Edit modal with the new data
                //         setSelectedOrder(newOrderData);
                //       }
                //     } catch (err) {
                //       console.error('Failed to generate part number:', err);
                //       // optionally show toast
                //     }
                //   }
                // },
                create_part: {
                  name: 'Create part number',
                  callback: async (key, selection) => {
                    const row = selection[0].start.row;
                    const originalOrder = Orders[row];

                    if (!originalOrder) return;

                    try {
                      const result = await dispatch(
                        createGenerateId({ orderId: originalOrder['Order#'] })
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
                raim: {
                  name: 'RAIM',
                  callback: async (key, selection) => {
                    const row = selection[0].start.row;
                    const originalOrder = Orders[row];

                    if (!originalOrder) return;

                    try {
                      const result = await dispatch(
                        createGenerateId({ orderId: originalOrder['Order#'] })
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
                // Optional separator
                sp1: '---------',
                // You can still keep some default items if needed
                // copy: {},
                // cut: {},
              }
            }}
            // In HotTable props:
            // afterOnCellMouseDown={(event, coords) => {
            //   if (coords.col === 0 && coords.row >= 0) {   // Only when clicking Order# column
            //     handleOrderClick(coords.row);
            //     // // Optional: Clear selection after click
            //     // if (hotRef.current) {
            //     //   hotRef.current.hotInstance.deselectCell();
            //     // }
            //   }
            // }}
            emptyDataMessage="No orders found"
          />
        </div>
      </div>
    </React.Fragment>
  );
}

export default OrderListTable;