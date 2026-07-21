import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Search, Filter, X } from "lucide-react";
import totalorders from "../assets/totalorders-icon.svg";
import ordervalue from "../assets/ordervalue-icon.svg";
import grossprofit from "../assets/grossprofit-icon.svg";
import StatsCard from "../components/StatsCard";
import OrderCard from "../components/OrderCard";
import UsersSection from "../components/UsersSection";
// import CreateUserModal from "../components/CreateUserModal";
import { fetchOrders, fetchOrdersAdmin, fetchUsers } from "../store/usersSlice";
import NotAllowed from "../components/notallowed/NotAllowed";
import Pagination from "../components/Pagination";
import { OrderCardSkeleton } from "../components/Utils";
import { toNumber } from "../utils/constant";
import { useNavigate } from "react-router-dom";
import OrderDetailModal from "../components/OrderDetailModal";
import OrderListTable from "../components/OrderListTable";
const tabs = [
  {
    label: "Dashboard",
    value: "dashboard",
  },
  {
    label: "View Sheet",
    value: "view-sheet",
  },
];
const staticDashboardData = {
  order_value: 235000,
  gross_profit: 42000,
  orders: [
    {
      order_id: 1001,
      brand: "Acme Gear",
      category: "Electronics",
      status: "Delivered",
      price: 12500,
      qty: 12,
      procured_by: "Sarah Wilson",
      order_date: "2024-10-01",
    },
    {
      order_id: 1002,
      brand: "Nova Foods",
      category: "Grocery",
      status: "Intransit",
      price: 8450,
      qty: 30,
      procured_by: "Mark Patel",
      order_date: "2024-10-05",
    },
    {
      order_id: 1003,
      brand: "Urban Threads",
      category: "Apparel",
      status: "Delayed",
      price: 5400,
      qty: 18,
      procured_by: "Olivia Chen",
      order_date: "2024-09-28",
    },
    {
      order_id: 1004,
      brand: "Zen Living",
      category: "Home",
      status: "Cancel",
      price: 2999,
      qty: 6,
      procured_by: "James Carter",
      order_date: "2024-09-20",
    },
    {
      order_id: 1005,
      brand: "Bright Labs",
      category: "Health",
      status: "Partial",
      price: 7600,
      qty: 10,
      procured_by: "Sarah Wilson",
      order_date: "2024-09-15",
    },
    {
      order_id: 1006,
      brand: "PixelPlay",
      category: "Gaming",
      status: "Refunded",
      price: 15600,
      qty: 8,
      procured_by: "Mark Patel",
      order_date: "2024-08-18",
    },
    {
      order_id: 1007,
      brand: "EcoDrive",
      category: "Automotive",
      status: "Delivered",
      price: 22000,
      qty: 4,
      procured_by: "Olivia Chen",
      order_date: "2024-08-10",
    },
    {
      order_id: 1008,
      brand: "Skyline Tech",
      category: "Electronics",
      status: "Delivered",
      price: 18999,
      qty: 7,
      procured_by: "James Carter",
      order_date: "2024-07-30",
    },
  ],
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const { users, Orders, userloading, orderloading, error: usersError, pending } = useSelector((state) => state.users);
  const { token, user: authUser } = useSelector((state) => state.auth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;
  const [selectedAgent, setSelectedAgent] = useState("All");
  const [selectedProcuredBy, setSelectedProcuredBy] = useState("All");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [hasFetchedUsers, setHasFetchedUsers] = useState(false);
  const { user, storeId } = useSelector((state) => state?.auth);

  const userAccess = user?.page_access?.page_name
    ? Array.isArray(user.page_access.page_name)
      ? user.page_access.page_name
      : Object.values(user.page_access.page_name) // object → array
    : [];

  const roleId = user?.role_id;
  // Backend se aaya hua raw data
  // Agar Orders = backend response
  const orderData = Orders?.map(order => ({
    order_id: order["Order#"],
    brand: order["Brands"],
    category: order["Category"],
    qty: Number(toNumber(order["Qty"])),
    price: Number(toNumber(order["Price"])),
    grossProfit: Number(toNumber(order["Gross Profit-4%"])),
    totalPrice: Number(toNumber(order["Total Price"])),
    status: order["Status"],
    procured_by: order["Procured By"],
    order_date: order["Order Date"],
    sales_agent: order["Sales Agent"],
  })) || [];
  const allStatuses = orderData.map(order => order.status);


  const salesAgents = [...new Set(orderData.map(o => o?.sales_agent).filter(Boolean))];
  // ["PPC", "Frank", "Emma", "Mike"]

  const procuredByList = [...new Set(orderData.map(o => o?.procured_by).filter(Boolean))];
  // ["Bill Dawson", "Mike"]
  const hasAccess = (page) => {
    // Super Admin / Admin
    if (roleId === 1 || roleId === 2) return true;

    return userAccess.includes(page);
  };

  const toggleUserModal = () => setShowUserModal(prev => !prev);


  // === Fetch Users Data (wait for token to be saved) ===
  useEffect(() => {
    // Simple delay and token check
    const timer = setTimeout(() => {
      // Check if token exists in Redux
      if (token && !hasFetchedUsers) {
        dispatch(fetchUsers()).then(() => {
          setHasFetchedUsers(true);
        }).catch(() => {
          setHasFetchedUsers(true); // Mark as fetched even on error
        });
      }
    }, 1500); // 1.5 second delay

    return () => clearTimeout(timer);
  }, [dispatch, token, hasFetchedUsers]);
  // === Fetch Dashboard Data ===
  useEffect(() => {
    if (authUser?.role_id === 1 || authUser?.role_id === 2) {
      dispatch(fetchOrdersAdmin(storeId?.sheet_id))
    }
    else {
      dispatch(fetchOrders())
    }
  }, [authUser?.role_id]);

  if (loading)
    return <p className="text-center mt-10 text-gray-500">Loading dashboard...</p>;
  if (!data)
    return <p className="text-center mt-10 text-red-500">Failed to load data.</p>;

  // === Filter logic ===
  const filteredOrders = orderData.filter(order => {
    const matchStatus =
      selectedFilter === "All" ||
      order.status?.toLowerCase().replace(/\s+/g, "") === selectedFilter.toLowerCase().replace(/\s+/g, "");

    const matchSearch = order?.order_id
      ?.toString()
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const orderDate = new Date(order.order_date);
    const matchDate =
      (!startDate || orderDate >= startDate) &&
      (!endDate || orderDate <= endDate);

    const matchAgent =
      selectedAgent === "All" || order.sales_agent === selectedAgent;

    const matchProcuredBy =
      selectedProcuredBy === "All" || order.procured_by === selectedProcuredBy;

    return matchStatus && matchSearch && matchDate && matchAgent && matchProcuredBy;
  });

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);


  // Filter users from Redux (API data only, no static fallback)
  const filteredUsers = useMemo(() => {
    const usersList = users && users.length > 0 ? users : [];
    // Remove the current user and filter by search query if provided
    const userfiltered = usersList.filter((user) => {
      if (user.id === authUser.id) return false;
      if (!userSearch) return true;
      // Searching by name, email, or username (case-insensitive)
      const query = userSearch.toLowerCase();
      return (
        (user.name && user.name.toLowerCase().includes(query)) ||
        (user.email && user.email.toLowerCase().includes(query))
      );
    });
    return userfiltered;
  }, [users, userSearch, authUser.id]);

  // === Stats ===
  // const totalOrders = orderData.length; // Total orders
  // const orderValue = orderData.reduce((sum, order) => sum + (order?.totalPrice || 0), 0); // Sum of price
  // const grossProfit = orderData.reduce((sum, order) => sum + ((order?.grossProfit || 0)), 0);
  // // const grossProfit = orderData.reduce((sum, order) => sum + ((order?.grossProfit || 0) * 0.2), 0);
  // // Example: assume 20% profit. Replace with real logic if you have
  // const deliveredCount = orderData.filter(
  //   o => o.status?.toLowerCase() === "completed" // match backend delivered
  // ).length;


  const totalOrders = filteredOrders.length;
  const orderValue = filteredOrders.reduce((sum, order) => sum + (order?.totalPrice || 0), 0);
  const grossProfit = filteredOrders.reduce((sum, order) => sum + (order?.grossProfit || 0), 0);
  const deliveredCount = filteredOrders.filter(
    o => o.status?.toLowerCase() === "delivered"
  ).length;

  return (
    <>

      {/* ==== Stats Cards ==== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: "Total orders", value: totalOrders, icon: totalorders, alt: "Total orders icon" },
          { label: "Order value", value: `$${orderValue.toLocaleString()}`, icon: ordervalue, alt: "Order value icon" },
          { label: "Gross profit", value: `$${grossProfit.toLocaleString()}`, icon: grossprofit, alt: "Gross profit icon" },
          { label: "Orders delivered", value: deliveredCount, icon: totalorders, alt: "Delivered orders icon" },
        ].map((stat, i) => (
          <StatsCard key={i} {...stat} />
        ))}
      </div>

      <div className="flex border-b mb-2">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2 ${activeTab === "dashboard"
            ? "border-b-2 border-blue-600 font-semibold"
            : "text-gray-500"
            }`}
        >
          Dashboard
        </button>

        <button
          onClick={() => setActiveTab("view-sheet")}
          className={`px-4 py-2 ${activeTab === "view-sheet"
            ? "border-b-2 border-blue-600 font-semibold"
            : "text-gray-500"
            }`}
        >
          View Sheet
        </button>
      </div>
      {activeTab === "dashboard" ? <>
        {/* ==== Orders Section ==== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" >
          {/* === Orders List === */}
          {/* <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6"> */}
          <div className={`${[1, 2].includes(roleId) ? "lg:col-span-2" : "lg:col-span-3"} bg-white rounded-2xl shadow-sm border border-gray-100 p-6`}>

            <div className="mb-4">
              <h2 className="font-semibold text-gray-800 text-lg">Orders</h2>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4 w-full">
              {["All", "Delivered", "Intransit"].map(
                (filter) => (
                  <button
                    key={filter}
                    className={`px-4 py-2 rounded-full text-sm font-medium ${selectedFilter === filter
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-700 border hover:bg-gray-100"
                      }`}
                    onClick={() => {
                      setSelectedFilter(filter);
                      setCurrentPage(1);
                    }}
                  >
                    {filter}
                  </button>
                )
              )}
              {/* Sales Agent Dropdown */}
              <select
                value={selectedAgent}
                onChange={(e) => {
                  setSelectedAgent(e.target.value);
                  setCurrentPage(1);
                  setSelectedProcuredBy("All");
                }}
                className="px-4 py-2 rounded-full text-sm font-medium bg-white text-gray-700 border shadow-sm hover:bg-gray-100 outline-none cursor-pointer"
              >
                <option value="All">All Agents</option>
                {salesAgents.map((agent) => (
                  <option key={agent} value={agent}>{agent}</option>
                ))}
              </select>

              {/* Procured By Dropdown */}
              <select
                value={selectedProcuredBy}
                onChange={(e) => {
                  setSelectedProcuredBy(e.target.value);
                  setSelectedAgent("All");
                  setCurrentPage(1);
                }}
                className="px-4 py-2 rounded-full text-sm font-medium bg-white text-gray-700 border shadow-sm hover:bg-gray-100 outline-none cursor-pointer"
              >
                <option value="All">All Procured By</option>
                {procuredByList.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              <button
                onClick={() => setShowDateFilter(true)}
                className="flex items-center gap-2 bg-white border px-4 py-2 rounded-full text-sm text-gray-700 shadow-sm hover:bg-gray-100"
              >
                <Filter size={16} /> Filter by date
              </button>
              <button
                onClick={() => {
                  setShowDateFilter(false);
                  setStartDate(null);
                  setEndDate(null);
                  setSearchQuery("");
                  setSelectedFilter("All");
                  setSelectedAgent("All");
                  setSelectedProcuredBy("All");
                  setCurrentPage(1);
                }}
                className="flex items-center gap-2 bg-white border px-4 py-2 rounded-full text-sm text-gray-700 shadow-sm hover:bg-gray-100"
              >
                Reset
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 border rounded-full px-4 py-2 bg-white shadow-sm w-full">
                <input
                  type="text"
                  placeholder="Enter Order ID..."
                  className="outline-none text-sm text-gray-700 flex-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search size={16} className="text-gray-400" />
              </div>
            </div>

            {/* Orders Grid */}
            {/* ==== Orders Grid (2 cards per row clean layout) ==== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {orderloading ? (
                Array.from({ length: 4 }).map((_, i) => <OrderCardSkeleton key={i} />)
              ) : hasAccess(selectedFilter) ? (
                currentOrders.length > 0 ? (
                  currentOrders.map(order => <OrderCard key={order.order_id} order={order} />)
                ) : (
                  <p className="col-span-full text-center text-gray-500">
                    No orders found for this filter.
                  </p>
                )
              ) : (
                <div className="col-span-full flex justify-center items-center h-40">
                  <NotAllowed />
                </div>
              )}
            </div>




            {/* Pagination */}
            <Pagination
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* === Users Section === */}
          {
            [1, 2].includes(roleId) && <div>
              <UsersSection
                users={filteredUsers}
                searchValue={userSearch}
                onSearchChange={setUserSearch}
                onCreateUserClick={toggleUserModal}
                loading={userloading || (!hasFetchedUsers && token)}
                error={usersError}
              />
            </div>
          }
        </div>

        {
          showDateFilter && (
            <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50">
              <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-lg relative">
                <button
                  onClick={() => setShowDateFilter(false)}
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>

                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                  Select Date Range
                </h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-sm text-gray-600 font-medium">
                      Start Date
                    </label>
                    <DatePicker
                      selected={startDate}
                      onChange={(date) => setStartDate(date)}
                      selectsStart
                      startDate={startDate}
                      endDate={endDate}
                      dateFormat="MM/dd/yyyy"
                      className="w-full mt-1 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholderText="Select start date"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-600 font-medium">
                      End Date
                    </label>
                    <DatePicker
                      selected={endDate}
                      onChange={(date) => setEndDate(date)}
                      selectsEnd
                      startDate={startDate}
                      endDate={endDate}
                      minDate={startDate}
                      dateFormat="MM/dd/yyyy"
                      className="w-full mt-1 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholderText="Select end date"
                    />
                  </div>

                  <div className="flex justify-between gap-3 mt-4">
                    <button
                      onClick={() => {
                        setStartDate(null);
                        setEndDate(null);
                        setShowDateFilter(false);
                      }}
                      className="w-1/2 border py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => setShowDateFilter(false)}
                      className="w-1/2 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }
      </> : <OrderListTable />}
      {/* {showUserModal && <CreateUserModal onClose={() => setShowUserModal(false)} />} */}
    </>
  );
};

export default Dashboard;
