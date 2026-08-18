export const toNumber = (price) => {
  if (!price) return 0;
  const isNegative = price.toString().trim().startsWith("-");
  const value = parseFloat(price.toString().replace(/[^0-9.]/g, ""));
  return isNegative ? -value : value;
};
export const normalizeOrderOptions = (apiData) => {
  if (!apiData || typeof apiData !== 'object') return {};

  const map = {};

  Object.entries(apiData).forEach(([key, value]) => {
    // Only keep keys that have an array of options
    if (Array.isArray(value)) {
      map[key] = value;
    }
  });

  return map;
};
export const getFieldValue = (field) => {
  if (field && typeof field === "object") return field.value ?? "";
  return field ?? "";
};
export const getIsAdmin = () => {
  const value = localStorage.getItem("isAdmin");
  return value === true || value === "true";
};
export const getFieldChecked = (field) => {
  if (field && typeof field === "object") return Boolean(field.isTrue);
  return false;
};
// const makeCheckboxRenderer = (fieldName) => {
//   return function (instance, td, row, col, prop, value) {
//     const val = getFieldValue(value);
//     const checked = getFieldChecked(value);

//     td.innerHTML = "";

//     const wrap = document.createElement("div");
//     wrap.style.display = "flex";
//     wrap.style.gap = "2px";
//     wrap.style.alignItems = "center";

//     const checkbox = document.createElement("input");
//     checkbox.type = "checkbox";
//     checkbox.checked = checked;
//     checkbox.style.accentColor = "#1B51EF";

//     checkbox.addEventListener("mousedown", (e) => {
//       e.stopPropagation();
//     });

//     checkbox.addEventListener("click", (e) => {
//       e.stopPropagation();

//       const current = instance.getSourceDataAtRow(row);
//       const currentField = current[fieldName];

//       instance.setSourceDataAtCell(row, fieldName, {
//         value: getFieldValue(currentField),
//         isTrue: e.target.checked,
//       });

//       instance.render(); // refresh pink highlight
//     });

//     const span = document.createElement("span");
//     span.textContent = val;

//     wrap.appendChild(checkbox);
//     wrap.appendChild(span);
//     td.appendChild(wrap);

//     return td;
//   };
// };

const makeCheckboxRenderer = (fieldName) => {
  return function (instance, td, row, col, prop, value) {
    const val = getFieldValue(value);
    const checked = getFieldChecked(value);
    const isAdmin = getIsAdmin();

    td.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.gap = "2px";
    wrap.style.alignItems = "center";

    const span = document.createElement("span");
    span.textContent = val;

    // Admin: only show already-true checkboxes
    // Normal user: show all checkboxes
    const shouldShowCheckbox = isAdmin ? checked : true;

    if (shouldShowCheckbox) {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = checked;
      checkbox.style.accentColor = "#1B51EF";

      // Admin cannot enable new (false) options
      if (isAdmin) {
        checkbox.disabled = true;
      }

      checkbox.addEventListener("mousedown", (e) => e.stopPropagation());

      checkbox.addEventListener("click", (e) => {
        e.stopPropagation();

        if (isAdmin) return;

        const current = instance.getSourceDataAtRow(row);
        const currentField = current[fieldName];

        instance.setSourceDataAtCell(row, fieldName, {
          value: getFieldValue(currentField),
          isTrue: e.target.checked,
        });

        instance.render();
      });

      wrap.appendChild(checkbox);
    }

    wrap.appendChild(span);
    td.appendChild(wrap);
    return td;
  };
};
export const columnsOfSheet = [
  {
    data: "Sno",
    title: "Sno",
    width: 60,
    readOnly: true,
    renderer: function (instance, td, row) {
      td.innerHTML = row + 1; // Serial number starting from 1
      td.style.textAlign = "center";
      return td;
    },
  },
  { data: "Order#", title: "Order#" },
  { data: "Charged Date", title: "Charged Date" },
  { data: "Lead Source", title: "Lead Source" },
  { data: "Procured By", title: "Procured By" },
  { data: "Order Date", title: "Order Date" },
  { data: "Refund Date", title: "Refund Date" },
  { data: "Sales Agent", title: "Sales Agent" },
  { data: "Invoice#", title: "Invoice#" },
  { data: "Invoice Link", title: "Invoice Link" },
  { data: "Order Source", title: "Order Source" },
  { data: "Payment Status", title: "Payment Status" },
  { data: "Brands", title: "Brands" },
  { data: "Category", title: "Category" },
  { data: "Part#", title: "Part#" },
  { data: "Qty", title: "Qty" },
  { data: "Condition", title: "Condition" },
  { data: "Shipping A/C", title: "Shipping A/C" },
  { data: "Bill to address", title: "Bill to address" },
  { data: "Ship to address", title: "Ship to address" },
  { data: "City", title: "City" },
  { data: "State", title: "State" },
  { data: "Country", title: "Country" },
  { data: "Carrier", title: "Carrier" },
  { data: "Tracking", title: "Tracking#" },
  { data: "Status", title: "Status" },
  { data: "Reasons (IF any)", title: "Reasons (IF any)" },
  { data: "Customer", title: "Customer" },
  { data: "Customer Company", title: "Customer Company" },
  { data: "Email", title: "Email" },
  { data: "Phone", title: "Phone" },
  { data: "Customer PO#", title: "Customer PO#" },
  // { data: "Price", title: "Price" },
  // { data: "Shipping", title: "Shipping" },
  // { data: "Tax", title: "Tax" },
  { data: "Price", title: "Price", renderer: makeCheckboxRenderer("Price") },
  { data: "Shipping", title: "Shipping", renderer: makeCheckboxRenderer("Shipping") },
  { data: "Tax", title: "Tax", renderer: makeCheckboxRenderer("Tax") },
  { data: "Vendor", title: "Vendor" },
  { data: "Vendor order#", title: "Vendor order#" },
  { data: "Vendor Part#", title: "Vendor Part#" },
  { data: "CC/Paypal 4%", title: "CC/Paypal 4%", renderer: makeCheckboxRenderer("CC/Paypal 4%") },
  { data: "Charged Vendor", title: "Charged Vendor" },
  { data: "Paid Via", title: "Paid Via" },
  { data: "Cost", title: "Cost", renderer: makeCheckboxRenderer("Cost") },
  { data: "Vendor Shipping", title: "Vendor Shipping", renderer: makeCheckboxRenderer("Vendor Shipping") },
  { data: "Vendor Tax", title: "Vendor Tax", renderer: makeCheckboxRenderer("Vendor Tax") },
  // new filds added on 2024-06-05 total cost
  { data: "Courier Charges", title: "Courier Charges", renderer: makeCheckboxRenderer("Courier Charges") },
  { data: "Sales Tax", title: "Sales Tax", renderer: makeCheckboxRenderer("Sales Tax") },
  { data: "Warehouse Charges", title: "Warehouse Charges", renderer: makeCheckboxRenderer("Warehouse Charges") },
  { data: "Custom Duties", title: "Custom Duties", renderer: makeCheckboxRenderer("Custom Duties") },
  { data: "Card Payment", title: "Card Payment" },
  // 
  { data: "Total Price", title: "Total Price", disabled: true },//higlight if Price || Shipping || Tax
  { data: "Total Cost", title: "Total Cost", disabled: true }, //higlight if Cost || Vendor Shipping || Vendor Tax
  { data: "Total Cost+4%", title: "Total Cost+4%", disabled: true },//higlight if CC/Paypal 4%
  { data: "Gross Profit", title: "Gross Profit", disabled: true },
  { data: "Gross Profit-4%", title: "Gross Profit-4%", disabled: true },
  { data: "Profit %", title: "Profit %", disabled: true },

  { data: "Check/Invoice", title: "Check/Invoice" },
  { data: "Entry Check", title: "Entry Check" },
  { data: "Attached To Order", title: "Attached To Order" },
  { data: "Entry Reason", title: "Entry Reason" },
  { data: "Comment", title: "Comment" }
];

export const defaultOrder = {
  "Order#": "",
  "Charged Date": "",
  "Lead Source": "",
  "Procured By": "",
  "Order Date": "",
  "Refund Date": "",
  "Sales Agent": "",

  "Invoice#": "",
  "Invoice Link": "",

  "Order Source": "",
  "Payment Status": "",
  "Brands": "",
  "Category": "",
  "Part#": "",
  "Qty": "",
  "Condition": "",
  "Shipping A/C": "",
  "Bill to address": "",
  "Ship to address": "",
  "City": "",
  "State": "",
  "Country": "",
  "Carrier": "",
  "Tracking": "",
  "Status": "",
  "Reasons (IF any)": "",
  "Customer": "",
  "Customer Company": "",
  "Email": "",
  "Phone": "",
  "Customer PO#": "",
  "Price": "",
  "Shipping": "",
  "Tax": "",
  "Vendor": "",
  "Vendor order#": "",
  "Vendor Part#": "",
  "CC/Paypal 4%": "",
  "Charged Vendor": "",
  "Paid Via": "",
  "Cost": "",
  "Vendor Shipping": "",
  "Vendor Tax": "",
  // "Total Price": "",
  // "Total Cost": "",
  // "Total Cost+4%": "",
  // "Gross Profit": "",
  // "Gross Profit-4%": "",
  // "Profit %": "",
  // new filds added on 2024-06-05 total cost
  "Courier Charges": "",
  "Sales Tax": "",
  "Warehouse Charges": "",
  "Custom Duties": "",
  // "Card Payment": "",
  //
  "Check/Invoice": "",
  "Entry Check": "",
  "Attached To Order": "",
  "Entry Reason": "",
  "Comment": ""
};