"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/dashboard.scss";
import "../../styles/reports.scss";

// Interfaces
interface DepartmentAllocation {
  department_id: string;
  department_name: string;
  department_code: string;
  registered_assets: number;
  active_allocations: number;
  overdue_allocations: number;
  active_employees: number;
}

interface MaintenanceFrequency {
  asset_id: string;
  asset_tag: string;
  asset_name: string;
  total_maintenance_requests: number;
  total_maintenance_cost: string;
  last_maintenance_date: string | null;
  next_maintenance_due_date: string | null;
}

interface AssetUtilization {
  asset_id: string;
  asset_tag: string;
  asset_name: string;
  total_allocations: number;
  total_bookings: number;
  last_used_at: string | null;
}

interface IdleAsset {
  asset_id: string;
  asset_tag: string;
  asset_name: string;
  idle_days: number;
}

interface MaintenanceAlert {
  id: string;
  name: string;
  asset_tag: string;
  current_status: string;
  next_maintenance_due_date: string | null;
  expected_retirement_date: string | null;
  maintenance_days_remaining: number | null;
  retirement_days_remaining: number | null;
}

interface BookingHeatmap {
  asset_id: string;
  asset_tag: string;
  resource_name: string;
  day_of_week: number;
  day_name: string;
  start_hour: number;
  booking_count: number;
}

export default function Reports() {
  const router = useRouter();

  // Auth States
  const [currentUser, setCurrentUser] = useState<{ fullName: string; role: string } | null>(null);

  // Metrics Data
  const [departmentUtilization, setDepartmentUtilization] = useState<DepartmentAllocation[]>([]);
  const [maintenanceAnalysis, setMaintenanceAnalysis] = useState<MaintenanceFrequency[]>([]);
  const [mostUsedAssets, setMostUsedAssets] = useState<AssetUtilization[]>([]);
  const [idleAssets, setIdleAssets] = useState<IdleAsset[]>([]);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [heatmapData, setHeatmapData] = useState<BookingHeatmap[]>([]);
  const [loading, setLoading] = useState(true);

  // Export State
  const [exportType, setExportType] = useState<"UTILIZATION" | "IDLE" | "MAINTENANCE" | "ALERTS" | "HEATMAP">("UTILIZATION");
  const [exportFormat, setExportFormat] = useState<"CSV" | "JSON">("CSV");
  const [exporting, setExporting] = useState(false);

  // Decode User JWT from Cookie
  useEffect(() => {
    try {
      const cookies = document.cookie.split(";");
      const authCookie = cookies.find(c => c.trim().startsWith("accessToken="));
      if (authCookie) {
        const token = authCookie.split("=")[1];
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          window.atob(base64)
            .split("")
            .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const payload = JSON.parse(jsonPayload);
        if (payload) {
          setCurrentUser({
            fullName: payload.full_name || "Employee User",
            role: payload.role || "EMPLOYEE"
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Fetch report data
  const fetchReportData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/reports");
      if (!res.ok) throw new Error("Failed to load reports metrics");
      const data = await res.json();
      setDepartmentUtilization(data.departmentUtilization || []);
      setMaintenanceAnalysis(data.maintenanceAnalysis || []);
      setMostUsedAssets(data.mostUsedAssets || []);
      setIdleAssets(data.idleAssets || []);
      setAlerts(data.alerts || []);
      setHeatmapData(data.bookingHeatmap || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const handleLogout = () => {
    document.cookie = "accessToken=; Max-Age=0; path=/";
    toast.success("Logged out successfully");
    setTimeout(() => {
      router.push("/login");
    }, 1000);
  };

  // Process Report Export Logs Download File
  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setExporting(true);
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: exportType,
          format: exportFormat
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Export compilation failed");
      }

      const data = await res.json();

      // Trigger client-side browser file download blob
      const mimeType = exportFormat === "JSON" ? "application/json" : "text/csv";
      const blob = new Blob([data.fileContent], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", data.filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      toast.success("Report file exported successfully!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  // Safe percentage helper for CSS bar graphs
  const getMaxAllocationValue = () => {
    const vals = departmentUtilization.map(d => d.active_allocations);
    return vals.length > 0 ? Math.max(...vals, 1) : 1;
  };

  const maxAllocation = getMaxAllocationValue();

  return (
    <div className="dashboard-container">
      <ToastContainer position="top-right" autoClose={2000} theme="dark" />

      {/* ── Left Sidebar Navigation ── */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M16 8h.01" />
              <path d="M12 8H8v8h4c2.2 0 4-1.8 4-4s-1.8-4-4-4z" />
            </svg>
          </div>
          <span className="sidebar-logo-text logo-text">AssetFlow</span>
        </div>

        <nav className="sidebar-menu">
          <Link href="/dashboard" className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>Dashboard</span>
          </Link>
          <Link href="/organization-setup" className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>Organization Setup</span>
          </Link>
          <Link href="/assets" className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Assets</span>
          </Link>
          <Link href="/allocation-transfer" className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Allocation & Transfer</span>
          </Link>
          <Link href="/resource-booking" className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Resource Booking</span>
          </Link>
          <Link href="/maintenance" className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            <span>Maintenance</span>
          </Link>
          <Link href="/audit" className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Audit</span>
          </Link>
          <Link href="/reports" className="menu-item active">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Reports</span>
          </Link>
          <Link href="/notifications" className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>Notifications</span>
          </Link>
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">
            {currentUser?.fullName ? currentUser.fullName.split(" ").map(n => n[0]).join("").toUpperCase() : "US"}
          </div>
          <div className="user-info">
            <span className="user-name">{currentUser?.fullName}</span>
            <span className="user-role">{currentUser?.role}</span>
          </div>
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <main className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-search">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search analytics filters..." disabled />
          </div>

          <div className="header-actions">
            <button className="logout-btn" onClick={handleLogout}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="reports-content">
          <div>
            <h2 style={{ fontSize: "1.25rem", color: "#ffffff", fontWeight: "600" }}>Reports & Analytics</h2>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "2px" }}>Analytical charts and lifecycle indicators for asset management intelligence.</p>
          </div>

          {loading ? (
            <div style={{ color: "#64748b", textAlign: "center", padding: "40px" }}>Compiling reports metrics...</div>
          ) : (
            <>
              {/* ── Row 1: Charts ── */}
              <div className="charts-grid">
                
                {/* Column A: Utilization Bar Chart */}
                <div className="chart-card">
                  <span className="chart-title">Utilization by department</span>
                  <div className="chart-layout">
                    <div className="y-axis">
                      <span>{maxAllocation}</span>
                      <span>{Math.round(maxAllocation / 2)}</span>
                      <span>0</span>
                    </div>
                    <div className="bar-chart-container" style={{ paddingLeft: "10px", paddingRight: "10px" }}>
                      {departmentUtilization.length === 0 ? (
                        <span style={{ color: "#64748b", fontSize: "0.8rem", margin: "auto" }}>No data found</span>
                      ) : (
                        departmentUtilization.map(d => {
                          const pct = Math.max(Math.min((d.active_allocations / maxAllocation) * 100, 100), 10);
                          return (
                            <div className="bar-column" key={d.department_id} style={{ position: "relative" }}>
                              <div
                                className="bar-fill"
                                style={{ height: `${pct}%` }}
                                data-value={d.active_allocations}
                              />
                              <span className="bar-label">{d.department_name}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Column B: Maintenance Frequency SVG Trendline */}
                <div className="chart-card">
                  <span className="chart-title">Maintenance Frequency</span>
                  <div className="chart-layout">
                    <div className="y-axis">
                      {(() => {
                        const maxReq = maintenanceAnalysis.length > 0 ? Math.max(...maintenanceAnalysis.map(x => x.total_maintenance_requests), 1) : 1;
                        return (
                          <>
                            <span>{maxReq}</span>
                            <span>{Math.round(maxReq / 2)}</span>
                            <span>0</span>
                          </>
                        );
                      })()}
                    </div>
                    <div className="bar-chart-container" style={{ paddingLeft: "10px", paddingRight: "10px" }}>
                      {maintenanceAnalysis.length === 0 ? (
                        <span style={{ color: "#64748b", fontSize: "0.8rem", margin: "auto" }}>No maintenance requests filed</span>
                      ) : (
                        maintenanceAnalysis.map(d => {
                          const maxReq = Math.max(...maintenanceAnalysis.map(x => x.total_maintenance_requests), 1);
                          const pct = Math.max(Math.min((d.total_maintenance_requests / maxReq) * 100, 100), 10);
                          return (
                            <div className="bar-column" key={d.asset_id} style={{ position: "relative" }}>
                              <div
                                className="bar-fill"
                                style={{ height: `${pct}%`, backgroundColor: "#f59e0b" }}
                                data-value={d.total_maintenance_requests}
                                title={`${d.total_maintenance_requests} requests`}
                              />
                              <span className="bar-label">{d.asset_tag}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* ── Row 2: Listings ── */}
              <div className="listings-grid">
                
                {/* Column A: Most used assets */}
                <div className="list-card">
                  <span className="list-title">Most used assets</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {mostUsedAssets.length === 0 ? (
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>No allocations found</span>
                    ) : (
                      mostUsedAssets.map(item => (
                        <div className="list-item" key={item.asset_id}>
                          <span>
                            <strong style={{ color: "#48e5a0", fontFamily: "monospace", marginRight: "10px" }}>{item.asset_tag}</strong>
                            {item.asset_name}
                          </span>
                          <span className="item-value">{parseInt(String(item.total_allocations || 0)) + parseInt(String(item.total_bookings || 0))} uses</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column B: Idle assets */}
                <div className="list-card">
                  <span className="list-title">Idle assets</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {idleAssets.length === 0 ? (
                      <span style={{ color: "#64748b", fontSize: "0.8rem" }}>No idle assets found</span>
                    ) : (
                      idleAssets.map(item => (
                        <div className="list-item" key={item.asset_id}>
                          <span>
                            <strong style={{ color: "#48e5a0", fontFamily: "monospace", marginRight: "10px" }}>{item.asset_tag}</strong>
                            {item.asset_name}
                          </span>
                          <span className="item-value" style={{ color: "#fbbf24" }}>unused {item.idle_days || 0}+ days</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* ── Row 3: Resource Booking Heatmap ── */}
              <div className="chart-card" style={{ marginTop: "24px" }}>
                <span className="chart-title">Resource Booking Peak Usage (Heatmap)</span>
                <div style={{ display: "grid", gridTemplateColumns: "50px repeat(7, 1fr)", gap: "4px", marginTop: "16px", overflowX: "auto" }}>
                  {/* Empty top-left cell */}
                  <div></div>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                    <div key={day} style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.8rem", fontWeight: "600", paddingBottom: "8px" }}>{day}</div>
                  ))}
                  
                  {/* Hours (e.g. 8 to 18) */}
                  {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(hour => {
                    return (
                      <React.Fragment key={hour}>
                        <div style={{ color: "#94a3b8", fontSize: "0.8rem", textAlign: "right", paddingRight: "8px", alignSelf: "center" }}>{hour}:00</div>
                        {[1, 2, 3, 4, 5, 6, 7].map(dayIndex => {
                          const cellData = heatmapData.find(h => parseInt(h.day_of_week as any) === dayIndex && parseInt(h.start_hour as any) === hour);
                          const count = cellData ? parseInt(cellData.booking_count as any) : 0;
                          
                          // Determine color intensity based on count
                          let bg = "#1e293b"; // idle
                          if (count > 0 && count <= 2) bg = "#3b82f6"; // light blue
                          else if (count > 2 && count <= 5) bg = "#2563eb"; // med blue
                          else if (count > 5) bg = "#1d4ed8"; // dark blue

                          return (
                            <div key={`${dayIndex}-${hour}`} style={{ backgroundColor: bg, height: "30px", borderRadius: "4px", border: "1px solid rgba(255,255,255,0.05)", position: "relative" }} title={`${count} bookings`}>
                               {count > 0 && <span style={{position:"absolute", top:"50%", left:"50%", transform:"translate(-50%, -50%)", fontSize:"10px", color:"#fff", fontWeight: "bold"}}>{count}</span>}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* ── Row 4: Alerts due for maintenance / retirement ── */}
              <div className="alerts-card">
                <span className="card-title">Assets due for maintenance / nearing retirement</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {alerts.length === 0 ? (
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>All assets are inside secure lifecycle limits</span>
                  ) : (
                    alerts.map(item => {
                      const isMaint = item.next_maintenance_due_date && (!item.expected_retirement_date || item.maintenance_days_remaining! < 30);
                      return (
                        <div className="alert-row" key={item.id}>
                          <span className={`tag-alert ${isMaint ? "maintenance" : "retirement"}`}>
                            {isMaint ? "maint due" : "retire near"}
                          </span>
                          <span>
                            <strong>{item.asset_tag}</strong> — {item.name} is {isMaint ? `due in ${item.maintenance_days_remaining} days` : "nearing expected retirement limits"}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── Action Panel: Export Report ── */}
              <div className="card-layer" style={{ padding: "20px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", border: "1px solid #162238" }}>
                <div>
                  <h4 style={{ color: "#ffffff", fontSize: "0.95rem" }}>Export Operational Records</h4>
                  <p style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "2px" }}>Export compiled asset directories and compliance spreadsheets.</p>
                </div>
                <form onSubmit={handleExport} style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    className="cell-select" style={{ padding: "10px", width: "180px" }}
                    value={exportType}
                    onChange={e => setExportType(e.target.value as any)}
                  >
                    <option value="UTILIZATION">Utilization Summary</option>
                    <option value="IDLE">Idle Assets List</option>
                    <option value="MAINTENANCE">Maintenance log History</option>
                    <option value="ALERTS">Retirement & Service Alerts</option>
                    <option value="HEATMAP">Resource Booking Heatmap</option>
                  </select>
                  <select
                    className="cell-select" style={{ padding: "10px", width: "100px" }}
                    value={exportFormat}
                    onChange={e => setExportFormat(e.target.value as any)}
                  >
                    <option value="CSV">CSV Format</option>
                    <option value="JSON">JSON Format</option>
                  </select>
                  <button type="submit" className="add-action-btn" disabled={exporting}>
                    {exporting ? "Compiling..." : "Export report"}
                  </button>
                </form>
              </div>

            </>
          )}
        </div>
      </main>
    </div>
  );
}
