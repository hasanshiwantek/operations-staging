import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { userActivityLogs } from "../store/usersSlice";

const UserLogs = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { fetchLoading, error, userLogs } = useSelector((state) => state.users);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const userLogsData = userLogs?.data || [];

  // Pagination data from API
  const currentApiPage = userLogs?.meta?.current_page ?? currentPage;
  const lastPage = userLogs?.meta?.last_page ?? 1;
  const total = userLogs?.meta?.total ?? 0;
  const apiPerPage = userLogs?.meta?.per_page ?? perPage;

  // Calculate "from" and "to" because API doesn't return them
  const from = total > 0 ? (currentApiPage - 1) * apiPerPage + 1 : 0;

  const to = total > 0 ? Math.min(currentApiPage * apiPerPage, total) : 0;

  useEffect(() => {
    dispatch(
      userActivityLogs({
        page: currentPage,
        per_page: perPage,
      }),
    );
  }, [dispatch, currentPage, perPage]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handlePageChange = (page) => {
    if (page < 1 || page > lastPage || fetchLoading) {
      return;
    }

    setCurrentPage(page);
  };

  const handlePerPageChange = (e) => {
    setPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Generate page numbers
  const getPageNumbers = () => {
    const pages = [];

    for (let i = 1; i <= lastPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <div className="p-6">
      {/* Back Button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-medium transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
        <h1 className="text-xl font-semibold">User Logs</h1>

        {/* Per Page */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Show</label>

          <select
            value={perPage}
            onChange={handlePerPageChange}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>

          <span className="text-sm text-gray-600">per page</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border text-left">User Name</th>

              <th className="p-3 border text-left">Detail</th>

              <th className="p-3 border text-left">Date</th>
            </tr>
          </thead>

          <tbody>
            {fetchLoading ? (
              <tr>
                <td colSpan={3} className="p-6 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </td>
              </tr>
            ) : userLogsData.length ? (
              userLogsData.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  {/* User */}
                  <td className="p-3 border">
                    <div className="font-medium text-gray-800">
                      {log.user_name}
                    </div>
                  </td>

                  {/* Detail */}
                  <td className="p-3 border">
                    <div className="text-gray-800">{log.description}</div>

                    <div className="mt-1 text-xs text-gray-500">
                      {log.module} · {log.action}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="p-3 border whitespace-nowrap">
                    <div className="text-gray-800">
                      {new Date(log.created_at).toLocaleDateString()}
                    </div>

                    <div className="text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-4 text-center border">
                  No active logs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!fetchLoading && userLogsData.length > 0 && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-4">
          {/* Showing */}
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{from}</span> to{" "}
            <span className="font-medium">{to}</span> of{" "}
            <span className="font-medium">{total}</span> logs
          </div>

          {/* Pagination Buttons */}
          <div className="flex items-center gap-1">
            {/* Previous */}
            <button
              type="button"
              onClick={() => handlePageChange(currentApiPage - 1)}
              disabled={currentApiPage === 1 || fetchLoading}
              className="px-3 py-2 border rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {/* Pages */}
            {getPageNumbers().map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => handlePageChange(page)}
                disabled={fetchLoading}
                className={`px-3 py-2 border rounded-md text-sm ${
                  currentApiPage === page
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}

            {/* Next */}
            <button
              type="button"
              onClick={() => handlePageChange(currentApiPage + 1)}
              disabled={currentApiPage === lastPage || fetchLoading}
              className="px-3 py-2 border rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserLogs;
