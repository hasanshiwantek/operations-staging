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
import "./index.css";
import StoreSelection from "./pages/StoreSelection";
import ProtectedStore from "./components/ProtectedStore";
import AdminSheets from "./components/AdminSheets";
import PtotectecAdmin from "./components/PtotectecAdmin";
import OrderListTable from "./components/OrderListTable";

import Attributes from "./pages/Attributes";
import AttributeDetails from "./pages/AttributeDetails";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected routes */}
            <Route
              path="/store"
              element={
                <ProtectedStore>
                  <StoreSelection />
                </ProtectedStore>
              }
            />
            <Route
              path="/dashboard"
              element={
                <Layout>
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/sheet"
              element={
                <Layout>
                  <PtotectecAdmin>
                    <OrderListTable />
                  </PtotectecAdmin>
                </Layout>
              }
            />
            <Route
              path="/storeroles"
              element={
                <Layout>
                  <PtotectecAdmin>
                    <AdminSheets />
                  </PtotectecAdmin>
                </Layout>
              }
            />
            <Route
              path="/storeroles/attribute"
              element={
                <Layout>
                  <PtotectecAdmin>
                    <Attributes />
                  </PtotectecAdmin>
                </Layout>
              }
            />
            <Route
  path="/storeroles/attribute/:id"
  element={
    <Layout>
      <PtotectecAdmin>
        <AttributeDetails />
      </PtotectecAdmin>
    </Layout>
  }
/>
            <Route
              path="/users"
              element={
                <Layout>
                  <ProtectedRoute>
                    <UserManagement />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/order/:id"
              element={
                <Layout>
                  <ProtectedRoute>
                    <OrderDetails />
                  </ProtectedRoute>
                </Layout>
              }
            />
            <Route
              path="/activity"
              element={
                <Layout>
                  <ProtectedRoute>
                    <ActivityLog />
                  </ProtectedRoute>
                </Layout>
              }
            />
            {/* Catch-all route for 404 */}
            <Route
              path="*"
              element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">
                      404
                    </h1>
                    <p className="text-gray-600 mb-4">Page not found</p>
                  </div>
                </div>
              }
            />
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>,
);
