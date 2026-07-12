"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/dashboard.scss";
import "../../styles/audit.scss";
import { authService } from "../../lib/services/authService";

// Interfaces
interface AuditCycle {
  id: string;
  audit_number: string;
  title: string;
  description: string;
  scope_type: string;
  start_date: string;
  end_date: string;
  status: string;
  total_assets: number;
  verified_assets: number;
  missing_assets: number;
  damaged_assets: number;
  pending_assets: number;
}

interface Auditor {
  id: string;
  auditor_name: string;
  is_lead_auditor: boolean;
}

interface AuditItem {
  id: string;
  asset_id: string;
  asset_tag: string;
  asset_name: string;
  expected_location_name: string;
  verification_status: string;
  verification_notes: string | null;
}

interface DropdownUser {
  id: string;
  full_name: string;
  role: string;
}

interface DropdownDept {
  id: string;
  name: string;
}

interface DropdownLocation {
  id: string;
  name: string;
}

interface DropdownCategory {
  id: string;
  name: string;
}

export default function Audit() {
  const router = useRouter();

  // Auth States
  const [currentUser, setCurrentUser] = useState<{ fullName: string; role: string } | null>(null);

  // Setup options (drop lists)
  const [cycles, setCycles] = useState<AuditCycle[]>([]);
  const [users, setUsers] = useState<DropdownUser[]>([]);
  const [departments, setDepartments] = useState<DropdownDept[]>([]);
  const [locations, setLocations] = useState<DropdownLocation[]>([]);
  const [categories, setCategories] = useState<DropdownCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected State
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [selectedCycle, setSelectedCycle] = useState<AuditCycle | null>(null);
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [checklist, setChecklist] = useState<AuditItem[]>([]);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [rowNotes, setRowNotes] = useState<Record<string, string>>({});
  const [loadingCycle, setLoadingCycle] = useState(false);
  const [filterTab, setFilterTab] = useState<"PENDING" | "VERIFIED" | "FLAGGED" | "ALL">("ALL");

  // Create Cycle Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    scopeType: "ORGANIZATION" as "ORGANIZATION" | "DEPARTMENT" | "LOCATION" | "CATEGORY",
    departmentId: "",
    locationId: "",
    categoryId: "",
    startDate: "",
    endDate: "",
    auditorIds: [] as string[]
  });

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

  // Fetch cycles list & dropdown options
  const fetchCyclesList = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/audit");
      if (!res.ok) throw new Error("Failed to load cycles");
      const data = await res.json();
      setCycles(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCyclesList();

    const fetchSetup = async () => {
      try {
        const res = await fetch("/api/audit?dropdowns=true");
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
          setDepartments(data.departments || []);
          setLocations(data.locations || []);
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.error("Failed to load audit setup parameters", err);
      }
    };
    fetchSetup();
  }, []);

  // Fetch cycle details on selection
  const fetchCycleDetails = async () => {
    if (!selectedCycleId) {
      setSelectedCycle(null);
      setAuditors([]);
      setChecklist([]);
      setDiscrepancies([]);
      setRowNotes({});
      return;
    }

    try {
      setLoadingCycle(true);
      const res = await fetch(`/api/audit?cycleId=${selectedCycleId}`);
      if (!res.ok) throw new Error("Failed to load details");
      const data = await res.json();
      setSelectedCycle(data.cycle);
      setAuditors(data.auditors || []);
      setChecklist(data.items || []);
      setDiscrepancies(data.discrepancies || []);

      // Always default to ALL so every asset is visible immediately
      setFilterTab("ALL");

      // Prepopulate notes state
      const initialNotes: Record<string, string> = {};
      (data.items || []).forEach((item: AuditItem) => {
        initialNotes[item.id] = item.verification_notes || "";
      });
      setRowNotes(initialNotes);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingCycle(false);
    }
  };

  useEffect(() => {
    fetchCycleDetails();
  }, [selectedCycleId]);

  const handleLogout = async () => {
    await authService.logout();
    toast.success("Logged out successfully");
    setTimeout(() => {
      router.push("/login");
    }, 1000);
  };

  // Submit standard verify item check status
  const handleVerify = async (itemId: string, status: "VERIFIED" | "MISSING" | "DAMAGED") => {
    if (selectedCycle?.status === "CLOSED") {
      toast.error("Closed audit cycles cannot be updated.");
      return;
    }

    const notes = rowNotes[itemId] || "";

    try {
      const res = await fetch("/api/audit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY",
          itemId,
          status,
          notes
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to log verification");
      }

      toast.success("Verification logged successfully!");
      fetchCycleDetails();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Resolve logged discrepancy
  const handleResolveDiscrepancy = async (discrepancyId: string, resolution: string) => {
    if (!resolution) return;
    const notes = prompt("Enter resolution notes / action details (Optional):");
    if (notes === null) return; // user cancelled

    try {
      const res = await fetch("/api/audit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESOLVE_DISCREPANCY",
          discrepancyId,
          resolution,
          notes
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to resolve discrepancy");
      }

      toast.success("Discrepancy resolved successfully!");
      fetchCycleDetails();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Submit close cycle request
  const handleCloseCycle = async () => {
    if (!selectedCycleId) return;
    const confirmClose = window.confirm("Are you sure you want to close this audit cycle? This action locks verification records and synchronizes affected asset directory statuses.");
    if (!confirmClose) return;

    try {
      const res = await fetch("/api/audit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CLOSE",
          cycleId: selectedCycleId,
          notes: "Audit closed after completing checklist verification."
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to close cycle");
      }

      toast.success("Audit cycle closed and asset directory synced!");
      fetchCyclesList();
      fetchCycleDetails();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Submit create cycle request
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create cycle");
      }

      toast.success("Audit cycle created successfully!");
      setShowCreateModal(false);
      // reset
      setCreateForm({
        title: "",
        description: "",
        scopeType: "ORGANIZATION",
        departmentId: "",
        locationId: "",
        categoryId: "",
        startDate: "",
        endDate: "",
        auditorIds: []
      });
      fetchCyclesList();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAuditorChange = (userId: string, checked: boolean) => {
    if (checked) {
      setCreateForm({ ...createForm, auditorIds: [...createForm.auditorIds, userId] });
    } else {
      setCreateForm({ ...createForm, auditorIds: createForm.auditorIds.filter(id => id !== userId) });
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };


  const flaggedCount = checklist.filter(item =>
    ["MISSING", "DAMAGED", "NOT_ACCESSIBLE"].includes(item.verification_status)
  ).length;

  const isClosed = selectedCycle?.status === "CLOSED";
  const canManage = currentUser?.role === "ADMIN" || currentUser?.role === "ASSET_MANAGER";

  // Filter checklist rows based on active tab
  const filteredChecklist = checklist.filter(item => {
    if (filterTab === "PENDING")  return item.verification_status === "PENDING";
    if (filterTab === "VERIFIED") return item.verification_status === "VERIFIED";
    if (filterTab === "FLAGGED")  return ["MISSING", "DAMAGED", "NOT_ACCESSIBLE"].includes(item.verification_status);
    return true; // ALL
  });

  const countPending  = checklist.filter(i => i.verification_status === "PENDING").length;
  const countVerified = checklist.filter(i => i.verification_status === "VERIFIED").length;
  const countFlagged  = checklist.filter(i => ["MISSING","DAMAGED","NOT_ACCESSIBLE"].includes(i.verification_status)).length;
  const countAll      = checklist.length;
  const pct = countAll > 0 ? Math.round(((countVerified + countFlagged) / countAll) * 100) : 0;

  const getStatusBadgeClass = (status: string) => {
    if (status === "IN_PROGRESS") return "status-in-progress";
    if (status === "CLOSED")      return "status-closed";
    if (status === "SCHEDULED")   return "status-scheduled";
    return "status-draft";
  };

  const getTypeBadgeClass = (type: string) => {
    if (type === "MISSING")        return "missing";
    if (type === "DAMAGED")        return "damaged";
    if (type === "NOT_ACCESSIBLE") return "not-accessible";
    return "missing";
  };

  const getRowClass = (status: string) => {
    if (status === "VERIFIED") return "row-verified";
    if (status === "MISSING")  return "row-missing";
    if (status === "DAMAGED")  return "row-damaged";
    return "";
  };

  return (
    <div className="dashboard-container">
      <ToastContainer position="top-right" autoClose={2500} theme="dark" />

      {/* â”€â”€ Sidebar â”€â”€ */}
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
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
            <span>Dashboard</span>
          </Link>
          <Link href="/organization-setup" className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            <span>Organization Setup</span>
          </Link>
          <Link href="/assets" className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            <span>Assets</span>
          </Link>
          <Link href="/allocation-transfer" className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            <span>Allocation &amp; Transfer</span>
          </Link>
          <Link href="/resource-booking" className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span>Resource Booking</span>
          </Link>
          <Link href="/maintenance" className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
            <span>Maintenance</span>
          </Link>
          <Link href="/audit" className="menu-item active">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            <span>Audit</span>
          </Link>
          <Link href="/reports" className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span>Reports</span>
          </Link>
          <Link href="/notifications" className="menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
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

      {/* â”€â”€ Main Panel â”€â”€ */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-search">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search cycles by ID or auditor..." disabled />
          </div>
          <div className="header-actions">
            <button className="logout-btn" onClick={handleLogout}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Logout
            </button>
          </div>
        </header>

        <div className="audit-content">

          {/* â”€â”€ Page Header â”€â”€ */}
          <div className="audit-page-header">
            <div className="page-title">
              <h1>Asset Verification Audits</h1>
              <p>Execute scheduled verification checklists and reconcile discrepancy reports.</p>
            </div>
            {canManage && (
              <button className="add-action-btn" onClick={() => setShowCreateModal(true)}>
                + Create Cycle
              </button>
            )}
          </div>

          {/* â”€â”€ Cycle Selector â”€â”€ */}
          <div className="cycle-selector-card">
            <label>Select Audit Cycle</label>
            {loading ? (
              <div style={{ color: "#64748b", fontSize: "0.85rem" }}>Loading cycles...</div>
            ) : (
              <select
                className="select-input"
                style={{ maxWidth: "480px" }}
                value={selectedCycleId}
                onChange={e => setSelectedCycleId(e.target.value)}
              >
                <option value="">-- Select a cycle to view or manage --</option>
                {cycles.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.audit_number} - {item.title} ({item.status})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* â”€â”€ Cycle Detail View â”€â”€ */}
          {selectedCycleId ? (
            loadingCycle ? (
              <div style={{ color: "#64748b", textAlign: "center", padding: "48px" }}>Loading checklist...</div>
            ) : selectedCycle ? (
              <>
                {/* â”€â”€ Cycle Summary Card â”€â”€ */}
                <div className="cycle-summary-card">
                  <div className="cycle-summary-header">
                    <div>
                      <h3>{selectedCycle.title}
                        <span style={{ marginLeft: "10px", fontSize: "0.8rem", color: "#64748b", fontWeight: "400" }}>
                          ({selectedCycle.audit_number})
                        </span>
                      </h3>
                      <p className="cycle-meta">
                        Scope: <strong>{selectedCycle.scope_type}</strong> from {formatDate(selectedCycle.start_date)} to {formatDate(selectedCycle.end_date)}
                      </p>
                      <div className="meta-auditors">
                        Auditors: {auditors.length === 0 ? "None assigned" : auditors.map(a => a.auditor_name + (a.is_lead_auditor ? " (Lead)" : "")).join(", ")}
                      </div>
                    </div>
                    <span className={`cycle-status-badge ${getStatusBadgeClass(selectedCycle.status)}`}>
                      {selectedCycle.status === "IN_PROGRESS" ? "In Progress" :
                       selectedCycle.status === "CLOSED" ? "Closed" :
                       selectedCycle.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="audit-progress">
                    <div className="progress-labels">
                      <span>Verification Progress</span>
                      <span className="progress-count">{countVerified + countFlagged} / {countAll} processed ({pct}%)</span>
                    </div>
                    <div className="progress-bar-track">
                      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="progress-pills">
                      <span className="pill-stat stat-verified"><span className="pill-num">{countVerified}</span> Verified</span>
                      <span className="pill-stat stat-missing"><span className="pill-num">{selectedCycle.missing_assets}</span> Missing</span>
                      <span className="pill-stat stat-damaged"><span className="pill-num">{selectedCycle.damaged_assets}</span> Damaged</span>
                      <span className="pill-stat stat-pending"><span className="pill-num">{countPending}</span> Pending</span>
                    </div>
                  </div>
                </div>

                {/* --- Closed Cycle Banner --- */}
                {isClosed && (
                  <div className="closed-audit-banner">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span><strong>Read-only view.</strong> This audit cycle is closed. Verification records are locked. Browse history below.</span>
                  </div>
                )}

                {/* --- Filter Tabs --- */}
                <div className="filter-tabs">
                  {(["PENDING", "VERIFIED", "FLAGGED", "ALL"] as const).map(tab => {
                    const counts: Record<string, number> = { PENDING: countPending, VERIFIED: countVerified, FLAGGED: countFlagged, ALL: countAll };
                    const labels: Record<string, string> = { PENDING: "Pending", VERIFIED: "Verified", FLAGGED: "Flagged", ALL: "All" };
                    return (
                      <button
                        key={tab}
                        type="button"
                        className={`tab-btn ${filterTab === tab ? "active" : ""}`}
                        onClick={() => setFilterTab(tab)}
                      >
                        {labels[tab]}
                        <span className="tab-count">{counts[tab]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* --- Checklist Table --- */}
                <div className="table-card">
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Asset</th>
                          <th>Expected Location</th>
                          <th>Inspection Notes</th>
                          <th style={{ textAlign: "right", minWidth: "230px" }}>Verification</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredChecklist.length === 0 ? (
                          <tr>
                            <td colSpan={4}>
                              <div className="empty-state">
                                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <h4>No assets in this view</h4>
                                <p>{filterTab === "ALL" ? "No assets are in the audit checklist." : `No assets are currently marked as ${filterTab.toLowerCase()}.`}</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredChecklist.map(item => (
                            <tr key={item.id} className={getRowClass(item.verification_status)}>
                              <td>
                                <div className="row-title">
                                  <span className="asset-tag-badge">{item.asset_tag}</span>
                                  {item.asset_name}
                                </div>
                              </td>
                              <td>{item.expected_location_name || "N/A"}</td>
                              <td style={{ width: "30%" }}>
                                <input
                                  className="notes-input"
                                  type="text"
                                  placeholder={isClosed ? (item.verification_notes || "No notes recorded") : "Add inspection notes..."}
                                  value={rowNotes[item.id] || ""}
                                  onChange={e => setRowNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                                  disabled={isClosed}
                                />
                              </td>
                              <td>
                                <div className="verification-pill-group" style={{ justifyContent: "flex-end" }}>
                                  <button
                                    type="button"
                                    className={`verify-pill-btn status-verified ${item.verification_status === "VERIFIED" ? "active" : ""}`}
                                    onClick={() => !isClosed && handleVerify(item.id, "VERIFIED")}
                                    disabled={isClosed}
                                    title="Mark as physically present and OK"
                                  >
                                    Verified
                                  </button>
                                  <button
                                    type="button"
                                    className={`verify-pill-btn status-missing ${item.verification_status === "MISSING" ? "active" : ""}`}
                                    onClick={() => !isClosed && handleVerify(item.id, "MISSING")}
                                    disabled={isClosed}
                                    title="Mark as not found — asset will be locked from allocation"
                                  >
                                    Missing
                                  </button>
                                  <button
                                    type="button"
                                    className={`verify-pill-btn status-damaged ${item.verification_status === "DAMAGED" ? "active" : ""}`}
                                    onClick={() => !isClosed && handleVerify(item.id, "DAMAGED")}
                                    disabled={isClosed}
                                    title="Mark as physically damaged — asset will go to maintenance"
                                  >
                                    Damaged
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* --- Flagged Alert Banner --- */}
                {flaggedCount > 0 && (
                  <div className="discrepancy-banner">
                    <div className="alert-text">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: "18px", height: "18px" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>
                        {flaggedCount} {flaggedCount === 1 ? "asset" : "assets"} flagged - discrepancy report generated automatically.
                        {!isClosed && " These assets are immediately locked from new allocation."}
                      </span>
                    </div>
                  </div>
                )}

                {/* --- Discrepancy Reconciliation Table --- */}
                {discrepancies.length > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    <div className="discrepancy-section-header">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Discrepancy Reconciliation Report
                      {discrepancies.filter(d => d.status === "OPEN").length > 0 ? (
                        <span className="open-count">{discrepancies.filter(d => d.status === "OPEN").length} Open</span>
                      ) : (
                        <span className="closed-badge">All Resolved</span>
                      )}
                    </div>
                    <div className="table-card">
                      <div className="table-responsive">
                        <table>
                          <thead>
                            <tr>
                              <th>Asset</th>
                              <th>Issue Type</th>
                              <th>Reported Details</th>
                              <th>Reported On</th>
                              <th>Status / Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {discrepancies.map(disc => (
                              <tr key={disc.id} className={disc.discrepancy_type === "MISSING" ? "row-missing" : "row-damaged"}>
                                <td className="row-title">
                                  <span className="asset-tag-badge">{disc.asset_tag}</span>
                                  {disc.asset_name}
                                </td>
                                <td>
                                  <span className={`type-badge ${getTypeBadgeClass(disc.discrepancy_type)}`}>
                                    {disc.discrepancy_type}
                                  </span>
                                </td>
                                <td style={{ maxWidth: "200px" }}>
                                  <div style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: "1.4" }}>
                                    {disc.description}
                                  </div>
                                </td>
                                <td style={{ fontSize: "0.8rem", color: "#64748b", whiteSpace: "nowrap" }}>
                                  {formatDate(disc.reported_at)}
                                </td>
                                <td>
                                  {disc.status === "RESOLVED" ? (
                                    <div>
                                      <span className="resolution-badge resolved">✓ {disc.resolution.replace(/_/g, " ")}</span>
                                      {disc.resolution_notes && (
                                        <div style={{ fontSize: "0.73rem", color: "#64748b", marginTop: "4px" }}>{disc.resolution_notes}</div>
                                      )}
                                    </div>
                                  ) : isClosed ? (
                                    <span className="resolution-badge unresolved">X Unresolved at Close</span>
                                  ) : (
                                    <select
                                      className="cell-select"
                                      defaultValue=""
                                      onChange={e => e.target.value && handleResolveDiscrepancy(disc.id, e.target.value)}
                                    >
                                      <option value="">Resolve...</option>
                                      <option value="MARKED_LOST">Mark as Lost</option>
                                      <option value="SENT_TO_MAINTENANCE">Send to Maintenance</option>
                                      <option value="RELOCATED">Asset Relocated</option>
                                      <option value="RECORD_CORRECTED">Correct Record</option>
                                      <option value="NO_ACTION_REQUIRED">No Action Required</option>
                                    </select>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* --- Close Cycle Button --- */}
                {!isClosed && canManage && (
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", paddingBottom: "8px" }}>
                    <button type="button" className="add-action-btn" onClick={handleCloseCycle}>
                      Close Audit Cycle
                    </button>
                    {countPending > 0 && (
                      <span style={{ fontSize: "0.8rem", color: "#fbbf24" }}>
                        ! {countPending} assets still pending — closing will lock all records as-is.
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : null
          ) : (
            <div style={{ textAlign: "center", padding: "60px 24px", border: "1px dashed #162238", borderRadius: "10px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} style={{ opacity: 0.2, marginBottom: "12px" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p style={{ color: "#64748b", margin: "0" }}>Select an audit cycle above to begin verification or view history.</p>
            </div>
          )}
        </div>
      </main>

      {/* ——— Modal: Create Audit Cycle ——— */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "550px" }}>
            <header className="modal-header">
              <h3>Create Audit Cycle</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>X</button>
            </header>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Audit Title</label>
                  <input type="text" required className="select-input" style={{ width: "100%", background: "#090f1d" }}
                    placeholder="e.g. Q3 Engineering Dept Audit"
                    value={createForm.title}
                    onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea className="textarea-input" style={{ width: "100%", height: "60px", background: "#090f1d" }}
                    placeholder="Provide details about the cycle scope..."
                    value={createForm.description}
                    onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="form-group">
                    <label>Scope Type</label>
                    <select className="cell-select" style={{ padding: "10px" }}
                      value={createForm.scopeType}
                      onChange={e => setCreateForm({ ...createForm, scopeType: e.target.value as any })}
                    >
                      <option value="ORGANIZATION">Organization Wide</option>
                      <option value="DEPARTMENT">Department Specific</option>
                      <option value="LOCATION">Location Specific</option>
                      <option value="CATEGORY">Category Specific</option>
                    </select>
                  </div>

                  {createForm.scopeType === "DEPARTMENT" && (
                    <div className="form-group">
                      <label>Department</label>
                      <select className="cell-select" required style={{ padding: "10px" }}
                        value={createForm.departmentId}
                        onChange={e => setCreateForm({ ...createForm, departmentId: e.target.value })}
                      >
                        <option value="">Select Department...</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  )}
                  {createForm.scopeType === "LOCATION" && (
                    <div className="form-group">
                      <label>Location</label>
                      <select className="cell-select" required style={{ padding: "10px" }}
                        value={createForm.locationId}
                        onChange={e => setCreateForm({ ...createForm, locationId: e.target.value })}
                      >
                        <option value="">Select Location...</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                  )}
                  {createForm.scopeType === "CATEGORY" && (
                    <div className="form-group">
                      <label>Category</label>
                      <select className="cell-select" required style={{ padding: "10px" }}
                        value={createForm.categoryId}
                        onChange={e => setCreateForm({ ...createForm, categoryId: e.target.value })}
                      >
                        <option value="">Select Category...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" required className="text-input" style={{ background: "#090f1d" }}
                      value={createForm.startDate}
                      onChange={e => setCreateForm({ ...createForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input type="date" required className="text-input" style={{ background: "#090f1d" }}
                      value={createForm.endDate}
                      onChange={e => setCreateForm({ ...createForm, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ borderTop: "1px solid #162238", paddingTop: "12px", marginTop: "4px" }}>
                  <label>Assign Auditors</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", maxHeight: "120px", overflowY: "auto", marginTop: "8px" }}>
                    {users.map(u => (
                      <label key={u.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#94a3b8", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={createForm.auditorIds.includes(u.id)}
                          onChange={e => handleAuditorChange(u.id, e.target.checked)}
                        />
                        {u.full_name} <span style={{ color: "#64748b", fontSize: "0.75rem" }}>({u.role})</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <footer className="modal-footer" style={{ display: "flex", gap: "10px", justifyContent: "flex-end", borderTop: "1px solid #162238", padding: "16px 24px" }}>
                <button type="button" className="cancel-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="add-action-btn">Create Cycle</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
