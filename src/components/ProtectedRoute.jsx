import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, token, storeId } = useSelector((state) => state.auth);

  if (!isAuthenticated || !token || !storeId?.id) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
