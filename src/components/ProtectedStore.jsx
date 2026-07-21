
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedStore = ({ children }) => {
    const { isAuthenticated, token, user } = useSelector((state) => state.auth);

  // Roles array (agar undefined ho to empty array)
  const userRoles = user?.roles || [];

    if (!isAuthenticated || !token || userRoles.length === 0) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedStore;
