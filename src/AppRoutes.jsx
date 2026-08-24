import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
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
import Attributes from "./pages/Attributes";
import AttributeDetails from "./pages/AttributeDetails";
import OrderType from "./pages/OrderType";

// Public Route wrapper → if already logged in, redirect to /store
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/store" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* ========== Public Routes ========== */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />

        {/* ========== Protected Routes ========== */}
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
          path="/storeroles/order-type"
          element={
            <Layout>
              <PtotectecAdmin>
                <OrderType />
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

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
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
  );
};

export default AppRoutes;