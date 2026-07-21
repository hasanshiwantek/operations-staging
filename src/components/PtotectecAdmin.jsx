
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const PtotectecAdmin = ({ children }) => {
  const { isAuthenticated, token , user } = useSelector((state) => state.auth);

if (!isAuthenticated || !token || (user?.role_id !== 1)) {
  return <Navigate to="/dashboard" replace />;
}

  return children;
};

export default PtotectecAdmin;
