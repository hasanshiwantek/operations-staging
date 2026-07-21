import React, { useEffect, useState } from "react";
import axios from "axios";

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    axios.get("http://127.0.0.1:5000/api/activity", {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => setLogs(res.data));
  }, []);

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Activity Log</h1>
      <table className="w-full bg-white rounded shadow">
        <thead>
          <tr>
            <th>User ID</th>
            <th>Role</th>
            <th>Action</th>
            <th>Status</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id}>
              <td>{l.user_id}</td>
              <td>{l.role}</td>
              <td>{l.action}</td>
              <td>{l.status}</td>
              <td>{l.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};
export default ActivityLog;
