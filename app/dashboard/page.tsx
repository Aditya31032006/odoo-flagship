"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/dashboard.scss";
import { authService } from "../../lib/services/authService";

interface DashboardKPIs {
  assets_available: string;
  assets_allocated: string;
  assets_reserved: string;
  assets_under_maintenance: string;
  assets_lost: string;
  assets_retired: string;
  assets_disposed: string;
  maintenance_today: string;
  active_bookings: string;
  pending_transfers: string;
  upcoming_returns: string;
  overdue_returns: string;
}

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  created_at: string;
  actor_name: string;
}

interface Allocation {
  id: string;
  asset_name: string;
  asset_tag: string;
  employee_name: string;
  expected_return_date: string;
  status: string;
}

interface Booking {
  id: string;
  asset_name: string;
  asset_tag: string;
  title: string;
  start_at: string;
  end_at: string;
}

export default function Dashboard() {
  const router = useRouter();
  
  // States
  const [user, setUser] = useState({ fullName: "Employee User", role: "EMPLOYEE" });
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [overdueReturns, setOverdueReturns] = useState<Allocation[]>([]);
  const [upcomingReturns, setUpcomingReturns] = useState<Allocation[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Parse Cookie User details
  useEffect(() => {
    const parseUserFromCookie = () => {
      try {
        const cookies = document.cookie.split(";");
        const authCookie = cookies.find(c => c.trim().startsWith("accessToken="));
        if (authCookie) {
          const token = authCookie.split("=")[1];
          const base64Url = token.split(".")[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(
            window
              .atob(base64)
              .split("")
              .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          );
          const payload = JSON.parse(jsonPayload);
          if (payload) {
            setUser({
              fullName: payload.full_name || "Employee User",
              role: payload.role || "EMPLOYEE"
            });
          }
        }
      } catch (err) {
        console.error("Failed to parse user session details:", err);
      }
    };

    parseUserFromCookie();
  }, []);

  // Fetch Dashboard Stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/dashboard");
        if (!res.ok) {
          throw new Error("Failed to load dashboard statistics");
        }
        const data = await res.json();
        setKpis(data.kpis);
        setActivities(data.activities || []);
        setOverdueReturns(data.overdueReturns || []);
        setUpcomingReturns(data.upcomingReturns || []);
        setActiveBookings(data.activeBookings || []);
      } catch (err: any) {
        toast.error(err.message || "An error occurred fetching stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Logout Handlers
  const handleLogout = async () => {
    await authService.logout();
    toast.success("Logged out successfully");
    setTimeout(() => {
      router.push("/login");
    }, 1000);
  };

  // Helper for formatting date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

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
          <Link href="/dashboard" className="menu-item active">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>Dashboard</span>
          </Link>
          <div className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Assets</span>
          </div>
          <div className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Allocation & Transfer</span>
          </div>
          <div className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Resource Booking</span>
          </div>
          <div className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Maintenance</span>
          </div>
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user.fullName ? user.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "US"}
          </div>
          <div className="user-info">
            <span className="user-name">{user.fullName}</span>
            <span className="user-role">{user.role}</span>
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
            <input type="text" placeholder="Search assets, activities, or audits..." />
          </div>

          <div className="header-actions">
            <button className="header-btn" title="Settings">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
            </button>
            <button className="logout-btn" onClick={handleLogout}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {loading ? (
            <div style={{ textAlign: "center", color: "#64748b", padding: "40px" }}>Loading statistics...</div>
          ) : (
            <>
              {/* ── KPI Cards ── */}
              <section className="kpi-grid">
                <div className="kpi-card">
                  <span className="kpi-title">Available Assets</span>
                  <span className="kpi-value">{kpis?.assets_available || "0"}</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-title">Allocated Assets</span>
                  <span className="kpi-value">{kpis?.assets_allocated || "0"}</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-title">Under Maintenance</span>
                  <span className="kpi-value">{kpis?.assets_under_maintenance || "0"}</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-title">Active Bookings</span>
                  <span className="kpi-value">{kpis?.active_bookings || "0"}</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-title">Pending Transfers</span>
                  <span className="kpi-value">{kpis?.pending_transfers || "0"}</span>
                </div>
              </section>

              {/* ── Main Dashboard Layout Grid ── */}
              <div className="panels-grid">
                {/* Left Column: Returns and Bookings */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  
                  {/* Overdue Alerts */}
                  {overdueReturns.length > 0 && (
                    <div className="overdue-alert">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{overdueReturns.length} asset(s) are overdue for return!</span>
                    </div>
                  )}

                  {/* Overdue Returns Panel */}
                  <div className="panel-card">
                    <div className="panel-header">
                      <h2 className="panel-title">Overdue Returns</h2>
                    </div>
                    <div className="panel-body">
                      {overdueReturns.length === 0 ? (
                        <div className="empty-state">No overdue returns currently.</div>
                      ) : (
                        <div className="data-list">
                          {overdueReturns.map((item) => (
                            <div className="list-item" key={item.id}>
                              <div className="item-left">
                                <span className="item-name">{item.asset_name}</span>
                                <span className="item-sub">{item.asset_tag} — {item.employee_name || "Department"}</span>
                              </div>
                              <div className="item-right">
                                <span className="item-status status-overdue">Overdue</span>
                                <span className="item-date">Expected: {formatDate(item.expected_return_date)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upcoming Returns Panel */}
                  <div className="panel-card">
                    <div className="panel-header">
                      <h2 className="panel-title">Upcoming Returns</h2>
                    </div>
                    <div className="panel-body">
                      {upcomingReturns.length === 0 ? (
                        <div className="empty-state">No upcoming returns scheduled.</div>
                      ) : (
                        <div className="data-list">
                          {upcomingReturns.map((item) => (
                            <div className="list-item" key={item.id}>
                              <div className="item-left">
                                <span className="item-name">{item.asset_name}</span>
                                <span className="item-sub">{item.asset_tag} — {item.employee_name || "Department"}</span>
                              </div>
                              <div className="item-right">
                                <span className="item-status status-active">Active</span>
                                <span className="item-date">Due: {formatDate(item.expected_return_date)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Bookings Panel */}
                  <div className="panel-card">
                    <div className="panel-header">
                      <h2 className="panel-title">Active Bookings</h2>
                    </div>
                    <div className="panel-body">
                      {activeBookings.length === 0 ? (
                        <div className="empty-state">No active resource bookings.</div>
                      ) : (
                        <div className="data-list">
                          {activeBookings.map((item) => (
                            <div className="list-item" key={item.id}>
                              <div className="item-left">
                                <span className="item-name">{item.title}</span>
                                <span className="item-sub">{item.asset_name} ({item.asset_tag})</span>
                              </div>
                              <div className="item-right">
                                <span className="item-date">{formatDate(item.start_at)} - {formatDate(item.end_at)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Right Column: Recent Activity Feed */}
                <div className="panel-card">
                  <div className="panel-header">
                    <h2 className="panel-title">Recent Activity</h2>
                  </div>
                  <div className="panel-body">
                    {activities.length === 0 ? (
                      <div className="empty-state">No recent activities logged.</div>
                    ) : (
                      <div className="activity-feed">
                        {activities.map((act) => (
                          <div className="feed-item" key={act.id}>
                            <div className="feed-marker"></div>
                            <div className="feed-body">
                              <span className="feed-desc">
                                <strong>{act.actor_name || "System"}</strong> {act.description}
                              </span>
                              <span className="feed-time">{formatDate(act.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
