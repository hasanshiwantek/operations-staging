import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { store, persistor } from "./store/store";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import UserManagement from "./pages/UserManagement";
import ActivityLog from "./pages/ActivityLog";
import OrderDetails from "./pages/OrderDetails";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import StoreSelection from "./pages/StoreSelection";
import ProtectedStore from "./components/ProtectedStore";
import AdminSheets from "./components/AdminSheets";
import PtotectecAdmin from "./components/PtotectecAdmin";
import OrderListTable from "./components/OrderListTable";

import Attributes from "./pages/Attributes";
import AttributeDetails from "./pages/AttributeDetails";
import OrderType from "./pages/OrderType";
import ResetPassword from "./pages/ResetPassword";
import AppRoutes from "./AppRoutes";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppRoutes />
      </PersistGate>
    </Provider>
  </React.StrictMode>,
);
