import { useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AdminSheets from "./components/AdminSheets";
import Layout from "./components/Layout";
import NotificationListener from "./components/NotificationListener";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedStore from "./components/ProtectedStore";
import PtotectecAdmin from "./components/PtotectecAdmin";
import UserLogs from "./components/UserLogs";
import AttributeDetails from "./pages/AttributeDetails";
import Attributes from "./pages/Attributes";
import Dashboard from "./pages/Dashboard";
import DocumentHistory from "./pages/DocumentHistory";
import ForgotPassword from "./pages/ForgotPassword";
import Login from "./pages/Login";
import OrderDetails from "./pages/OrderDetails";
import OrderType from "./pages/OrderType";
import ResetPassword from "./pages/ResetPassword";
import StoreSelection from "./pages/StoreSelection";
import UserManagement from "./pages/UserManagement";

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
          path="/user-logs"
          element={
            <Layout>
              <PtotectecAdmin>
                <UserLogs />
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
          path="/document-history"
          element={
            <Layout>
              <ProtectedRoute>
                <DocumentHistory />
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

      <NotificationListener />
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
