import React from "react";
import { Navigate } from "react-router-dom";
import ReportsPage from "./ReportsPage";

export default function PrivateReports() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || user.role !== "developer") return <Navigate to="/login" />;

  return <ReportsPage />;
}
