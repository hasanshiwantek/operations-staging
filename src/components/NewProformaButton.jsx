// Opens the Proforma Invoice form empty, to create one by hand without an
// order on the sheet. Shown only with the Proforma Invoice permission
import { FilePlus } from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrderOptions } from "../store/usersSlice";
import { DOCUMENT_PERMISSIONS } from "../utils/constant";
import OrderDocumentModal from "./OrderDocumentModal";

// variant "toolbar": filled button for the order sheet toolbar; "icon": round
// icon; "button": outlined button with a label.
// onGenerated runs once the new Proforma is saved.
const NewProformaButton = ({ variant = "button", onGenerated }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { userPermissions } = useSelector((state) => state.permissions);
  const { orderOptions } = useSelector((state) => state.users);
  const [open, setOpen] = useState(false);

  // Super Admin / Admin → full access
  const allowed =
    user?.role_id === 1 ||
    user?.role_id === 2 ||
    userPermissions?.some((p) => p.slug === DOCUMENT_PERMISSIONS.proforma);
  if (!allowed) return null;

  const openForm = () => {
    // The form's dropdowns use the order sheet's option lists, which are
    // only loaded with the sheet
    const hasOptions = Object.values(orderOptions || {}).some(
      (list) => Array.isArray(list) && list.length,
    );
    if (!hasOptions) dispatch(fetchOrderOptions());
    setOpen(true);
  };

  const label = "New Proforma Invoice";

  return (
    <>
      {variant === "toolbar" ? (
        // Same look as the order sheet's toolbar buttons
        <button
          type="button"
          onClick={openForm}
          className="bg-teal-600 hover:bg-teal-700"
          style={{
            padding: "8px 16px",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          + Create Proforma
        </button>
      ) : variant === "icon" ? (
        <button
          type="button"
          onClick={openForm}
          className="p-2 hover:bg-gray-100 rounded-full transition"
          title={label}
          aria-label={label}
        >
          <FilePlus size={20} className="text-gray-600" />
        </button>
      ) : (
        <button
          type="button"
          onClick={openForm}
          className="h-9 w-full xl:w-auto px-3 flex items-center justify-center gap-1.5 border border-[#06245f] text-[#06245f] rounded-md text-sm font-medium hover:bg-indigo-50 whitespace-nowrap"
        >
          <FilePlus size={15} />
          {label}
        </button>
      )}
      {open && (
        <OrderDocumentModal
          type="proforma"
          manual
          onGenerated={onGenerated}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

export default NewProformaButton;
