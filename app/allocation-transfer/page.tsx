"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/dashboard.scss";
import "../../styles/allocation-transfer.scss";
import { authService } from "../../lib/services/authService";

// ── Interfaces ─────────────────────────────────────────────────────────────
interface DropdownAsset {
  id: string;
  name: string;
  asset_tag: string;
  current_status: string;
  serial_number?: string;
}

interface DropdownEmployee {
  id: string;
  full_name: string;
}

interface DropdownDepartment {
  id: string;
  name: string;
}

interface ActiveAllocation {
  id: string;
  employee_id: string | null;
  employee_name: string | null;
  department_id: string | null;
  department_name: string | null;
  allocated_at: string;
  expected_return_date: string | null;
  checkout_condition: string;
  notes: string;
}

interface HistoryItem {
  id: string;
  employee_name: string | null;
  department_name: string | null;
  allocated_at: string;
  returned_at: string | null;
  status: string;
  checkout_condition: string;
  notes: string;
}

// ── Sidebar Nav ────────────────────────────────────────────────────────────
const NAV = [
  { href: "/dashboard",           label: "Dashboard",             icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>) },
  { href: "/organization-setup",  label: "Organization Setup",    icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>) },
  { href: "/assets",              label: "Assets",                icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>) },
  { href: "/allocation-transfer", label: "Allocation & Transfer", icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>) },
  { href: "/resource-booking",    label: "Resource Booking",      icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>) },
  { href: "/maintenance",         label: "Maintenance",           icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>) },
  { href: "/audit",               label: "Audit",                 icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>) },
  { href: "/reports",             label: "Reports",               icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>) },
  { href: "/notifications",       label: "Notifications",         icon: (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>) },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function statusClass(s: string) {
  if (s === "AVAILABLE") return "available";
  if (s === "ALLOCATED" || s === "CHECKED_OUT") return "allocated";
  return "other";
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AllocationTransfer() {
  const router = useRouter();

  // ── Auth ─────────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<{ fullName: string; role: string } | null>(null);

  // ── Dropdown data ─────────────────────────────────────────────────────────
  const [assets, setAssets]           = useState<DropdownAsset[]>([]);
  const [employees, setEmployees]     = useState<DropdownEmployee[]>([]);
  const [departments, setDepartments] = useState<DropdownDepartment[]>([]);
  const [loading, setLoading]         = useState(true);

  // ── Selected asset ────────────────────────────────────────────────────────
  const [selectedAssetId, setSelectedAssetId]       = useState("");
  const [activeAllocation, setActiveAllocation]     = useState<ActiveAllocation | null>(null);
  const [historyList, setHistoryList]               = useState<HistoryItem[]>([]);
  const [checkingAllocation, setCheckingAllocation] = useState(false);

  // ── Forms ─────────────────────────────────────────────────────────────────
  const [allocType, setAllocType] = useState<"employee" | "department">("employee");
  const [allocForm, setAllocForm] = useState({
    employeeId: "", departmentId: "",
    allocatedAt: new Date().toISOString().split("T")[0],
    expectedReturnDate: "", checkoutCondition: "GOOD", notes: ""
  });
  const [transferForm, setTransferForm] = useState({
    toEmployeeId: "", toDepartmentId: "", reason: ""
  });
  const [submitting, setSubmitting] = useState(false);

  // ── QR Scanner ───────────────────────────────────────────────────────────
  const [showQr, setShowQr]   = useState(false);
  const qrRef                 = useRef<any>(null);
  const qrRunning             = useRef(false);

  // ── Stop QR scanner ──────────────────────────────────────────────────────
  const stopQr = useCallback(async () => {
    if (qrRef.current && qrRunning.current) {
      try { await qrRef.current.stop(); } catch { /* ignore */ }
      qrRunning.current = false;
    }
    qrRef.current = null;
  }, []);

  // ── Start QR scanner ─────────────────────────────────────────────────────
  const startQr = useCallback(() => {
    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("qr-reader-alloc");
        qrRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decoded: string) => {
            qrRunning.current = false;
            await scanner.stop().catch(() => {});
            qrRef.current = null;
            setShowQr(false);

            // Parse scanned QR: assetflow://lookup/AF-0001
            const parts = decoded.split("/");
            const tag = parts[parts.length - 1];
            const found = assets.find(a => a.asset_tag === tag);
            if (found) {
              setSelectedAssetId(found.id);
              toast.success(`Asset ${tag} identified ✓`);
            } else {
              toast.error(`No asset found with tag: ${tag}`);
            }
          },
          () => {}
        );
        qrRunning.current = true;
      } catch (err: any) {
        toast.error("Camera access failed: " + err.message);
        setShowQr(false);
      }
    }, 300);
  }, [assets]);

  // ── QR modal lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    if (showQr) { startQr(); }
    else        { stopQr(); }
    return () => { stopQr(); };
  }, [showQr]);

  // ── JWT decode ────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const cookies = document.cookie.split(";");
      const authCookie = cookies.find(c => c.trim().startsWith("accessToken="));
      if (authCookie) {
        const token = authCookie.split("=")[1];
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(decodeURIComponent(
          window.atob(base64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
        ));
        if (payload) setCurrentUser({ fullName: payload.full_name || "User", role: payload.role || "EMPLOYEE" });
      }
    } catch { /* no-op */ }
  }, []);

  // ── Load dropdowns ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/allocation-transfer?dropdowns=true");
        if (!res.ok) throw new Error("Failed to load options");
        const data = await res.json();
        setAssets(data.assets || []);
        setEmployees(data.employees || []);
        setDepartments(data.departments || []);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Check allocation on asset change ──────────────────────────────────────
  useEffect(() => {
    if (!selectedAssetId) { setActiveAllocation(null); setHistoryList([]); return; }
    (async () => {
      try {
        setCheckingAllocation(true);
        const res = await fetch(`/api/allocation-transfer?assetId=${selectedAssetId}`);
        if (!res.ok) throw new Error("Failed to check allocation status");
        const data = await res.json();
        setActiveAllocation(data.activeAllocation);
        setHistoryList(data.history || []);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setCheckingAllocation(false);
      }
    })();
  }, [selectedAssetId]);

  const handleLogout = async () => {
    await authService.logout();
    toast.success("Logged out");
    setTimeout(() => router.push("/login"), 900);
  };

  // ── Refresh assets after action ───────────────────────────────────────────
  const refreshAssets = async () => {
    const r = await fetch("/api/allocation-transfer?dropdowns=true");
    if (r.ok) { const d = await r.json(); setAssets(d.assets || []); }
  };

  // ── Allocate submit ───────────────────────────────────────────────────────
  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!["ADMIN", "ASSET_MANAGER"].includes(currentUser?.role || "")) {
      toast.error("Only Asset Managers and Admins can allocate assets.");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        assetId: selectedAssetId,
        employeeId:   allocType === "employee"   ? allocForm.employeeId   : undefined,
        departmentId: allocType === "department" ? allocForm.departmentId : undefined,
        allocatedAt: allocForm.allocatedAt,
        expectedReturnDate: allocForm.expectedReturnDate || undefined,
        checkoutCondition: allocForm.checkoutCondition,
        notes: allocForm.notes
      };
      const res = await fetch("/api/allocation-transfer/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Allocation failed"); }
      toast.success("Asset allocated successfully!");
      setAllocForm({ employeeId: "", departmentId: "", allocatedAt: new Date().toISOString().split("T")[0], expectedReturnDate: "", checkoutCondition: "GOOD", notes: "" });
      setSelectedAssetId("");
      await refreshAssets();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Transfer submit ───────────────────────────────────────────────────────
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        assetId: selectedAssetId,
        toEmployeeId:   allocType === "employee"   ? transferForm.toEmployeeId   : undefined,
        toDepartmentId: allocType === "department" ? transferForm.toDepartmentId : undefined,
        reason: transferForm.reason
      };
      const res = await fetch("/api/allocation-transfer/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Transfer failed"); }
      toast.success("Transfer request submitted!");
      setTransferForm({ toEmployeeId: "", toDepartmentId: "", reason: "" });
      setSelectedAssetId("");
      await refreshAssets();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Selected asset details ────────────────────────────────────────────────
  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="dashboard-container">
      <ToastContainer position="top-right" autoClose={2500} theme="dark" />

      {/* ── QR Scanner Modal ── */}
      {showQr && (
        <div className="qr-scanner-overlay" onClick={() => setShowQr(false)}>
          <div className="qr-scanner-modal" onClick={e => e.stopPropagation()}>
            <div className="qr-modal-header">
              <h3>📷 Scan Asset QR Code</h3>
              <button className="qr-close-btn" onClick={() => setShowQr(false)}>✕</button>
            </div>
            <div id="qr-reader-alloc" />
            <p className="qr-hint">Point camera at the QR label on the asset to identify it instantly.</p>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M16 8h.01"/><path d="M12 8H8v8h4c2.2 0 4-1.8 4-4s-1.8-4-4-4z"/>
            </svg>
          </div>
          <span className="sidebar-logo-text logo-text">AssetFlow</span>
        </div>

        <nav className="sidebar-menu">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className={`menu-item${n.href === "/allocation-transfer" ? " active" : ""}`}>
              {n.icon}<span>{n.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{currentUser?.fullName ? currentUser.fullName.split(" ").map(x => x[0]).join("").toUpperCase().slice(0,2) : "US"}</div>
          <div className="user-info">
            <span className="user-name">{currentUser?.fullName || "Loading..."}</span>
            <span className="user-role">{currentUser?.role || ""}</span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-search">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="text" placeholder="Search assets or employees..." disabled />
          </div>
          <div className="header-actions">
            <button className="logout-btn" onClick={handleLogout}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Logout
            </button>
          </div>
        </header>

        {/* ── Two-column body ── */}
        {loading ? (
          <div style={{ padding: "40px", display: "flex", justifyContent: "center" }}>
            <div className="loading-pulse">Loading allocation data...</div>
          </div>
        ) : (
          <div className="alloc-layout">

            {/* ── LEFT PANEL: Form ── */}
            <div className="alloc-panel-left">
              <div className="alloc-panel-header">
                <h2>
                  <span className="panel-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                    </svg>
                  </span>
                  Allocation &amp; Transfer
                </h2>
                <p>Assign assets to employees/departments or submit a transfer request.</p>
              </div>

              <div className="alloc-panel-body">
                {/* Asset picker + QR button */}
                <div className="asset-picker-row">
                  <div className="asset-picker-select-wrap">
                    <label>Choose Asset</label>
                    <select
                      className="alloc-field"
                      value={selectedAssetId}
                      onChange={e => setSelectedAssetId(e.target.value)}
                      style={{ background: "#080e1c", border: "1px solid #162238", color: "#fff", borderRadius: "8px", padding: "10px 12px", fontSize: "0.88rem", outline: "none", width: "100%", appearance: "none" }}
                    >
                      <option value="">— Select an asset —</option>
                      {assets.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.asset_tag} — {a.name} ({a.current_status})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="qr-scan-btn"
                    title="Scan QR code to identify asset"
                    onClick={() => setShowQr(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                    </svg>
                    <span className="qr-btn-label">SCAN</span>
                  </button>
                </div>

                {/* Verifying... */}
                {checkingAllocation && (
                  <div className="loading-pulse">Checking allocation status...</div>
                )}

                {/* Forms appear when an asset is selected */}
                {selectedAssetId && !checkingAllocation && (
                  <>
                    {/* CASE A: Already allocated → show transfer form */}
                    {activeAllocation ? (
                      <>
                        <div className="alloc-warning-banner" style={{ animation: "warningFadeIn 0.3s ease" }}>
                          <span className="warn-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            </svg>
                          </span>
                          <div className="warn-body">
                            <div className="warn-title">Already Allocated</div>
                            <div className="warn-text">
                              Currently with <strong>{activeAllocation.employee_name || activeAllocation.department_name}</strong> since {formatDate(activeAllocation.allocated_at)}. Submit a transfer request to reassign.
                            </div>
                          </div>
                        </div>

                        <div className="section-divider"><span>Transfer Request</span></div>

                        {/* Target type toggle */}
                        <div className="alloc-type-toggle">
                          <label className={allocType === "employee" ? "active" : ""}>
                            <input type="radio" name="tt" checked={allocType === "employee"} onChange={() => { setAllocType("employee"); setTransferForm(f => ({ ...f, toDepartmentId: "" })); }}/>
                            👤 To Employee
                          </label>
                          <label className={allocType === "department" ? "active" : ""}>
                            <input type="radio" name="tt" checked={allocType === "department"} onChange={() => { setAllocType("department"); setTransferForm(f => ({ ...f, toEmployeeId: "" })); }}/>
                            🏢 To Department
                          </label>
                        </div>

                        <form onSubmit={handleTransfer}>
                          <div className="alloc-form-grid">
                            <div className="alloc-field">
                              <label>From (Current Holder)</label>
                              <input type="text" disabled value={activeAllocation.employee_name || activeAllocation.department_name || "—"} />
                            </div>
                            <div className="alloc-field">
                              <label>Transfer To</label>
                              {allocType === "employee" ? (
                                <select required value={transferForm.toEmployeeId}
                                  onChange={e => setTransferForm(f => ({ ...f, toEmployeeId: e.target.value }))}>
                                  <option value="">Select employee...</option>
                                  {employees.filter(e => e.full_name !== activeAllocation.employee_name).map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                  ))}
                                </select>
                              ) : (
                                <select required value={transferForm.toDepartmentId}
                                  onChange={e => setTransferForm(f => ({ ...f, toDepartmentId: e.target.value }))}>
                                  <option value="">Select department...</option>
                                  {departments.filter(d => d.name !== activeAllocation.department_name).map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>

                          <div className="alloc-field">
                            <label>Transfer Reason</label>
                            <textarea required placeholder="Reason for reassigning this asset..."
                              value={transferForm.reason}
                              onChange={e => setTransferForm(f => ({ ...f, reason: e.target.value }))} />
                          </div>

                          <button type="submit" className="alloc-submit-btn" disabled={submitting}>
                            {submitting ? "Submitting..." : "↗ Submit Transfer Request"}
                          </button>
                        </form>
                      </>
                    ) : (
                      /* CASE B: Available → standard allocation form */
                      <>
                        <div className="section-divider"><span>Checkout Allocation</span></div>

                        {/* Alloc type toggle */}
                        <div className="alloc-type-toggle">
                          <label className={allocType === "employee" ? "active" : ""}>
                            <input type="radio" name="at" checked={allocType === "employee"} onChange={() => { setAllocType("employee"); setAllocForm(f => ({ ...f, departmentId: "" })); }}/>
                            👤 To Employee
                          </label>
                          <label className={allocType === "department" ? "active" : ""}>
                            <input type="radio" name="at" checked={allocType === "department"} onChange={() => { setAllocType("department"); setAllocForm(f => ({ ...f, employeeId: "" })); }}/>
                            🏢 To Department
                          </label>
                        </div>

                        <form onSubmit={handleAllocate}>
                          <div className="alloc-form-grid">
                            <div className="alloc-field">
                              <label>Recipient</label>
                              {allocType === "employee" ? (
                                <select required value={allocForm.employeeId}
                                  onChange={e => setAllocForm(f => ({ ...f, employeeId: e.target.value }))}>
                                  <option value="">Select employee...</option>
                                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                                </select>
                              ) : (
                                <select required value={allocForm.departmentId}
                                  onChange={e => setAllocForm(f => ({ ...f, departmentId: e.target.value }))}>
                                  <option value="">Select department...</option>
                                  {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                                </select>
                              )}
                            </div>
                            <div className="alloc-field">
                              <label>Checkout Date</label>
                              <input type="date" required value={allocForm.allocatedAt}
                                onChange={e => setAllocForm(f => ({ ...f, allocatedAt: e.target.value }))} />
                            </div>
                          </div>

                          <div className="alloc-form-grid">
                            <div className="alloc-field">
                              <label>Expected Return (Optional)</label>
                              <input type="date" value={allocForm.expectedReturnDate}
                                onChange={e => setAllocForm(f => ({ ...f, expectedReturnDate: e.target.value }))} />
                            </div>
                            <div className="alloc-field">
                              <label>Condition at Checkout</label>
                              <select value={allocForm.checkoutCondition}
                                onChange={e => setAllocForm(f => ({ ...f, checkoutCondition: e.target.value }))}>
                                <option value="NEW">New</option>
                                <option value="GOOD">Good</option>
                                <option value="FAIR">Fair</option>
                                <option value="POOR">Poor / Damaged</option>
                              </select>
                            </div>
                          </div>

                          <div className="alloc-field">
                            <label>Allocation Notes</label>
                            <textarea placeholder="Add setup notes or specific comments..."
                              value={allocForm.notes}
                              onChange={e => setAllocForm(f => ({ ...f, notes: e.target.value }))} />
                          </div>

                          <button type="submit" className="alloc-submit-btn" disabled={submitting}>
                            {submitting ? "Allocating..." : "✓ Allocate Asset"}
                          </button>
                        </form>
                      </>
                    )}
                  </>
                )}

                {!selectedAssetId && !loading && (
                  <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.85rem", padding: "32px 0" }}>
                    Select an asset above or scan its QR label to get started.
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT PANEL: Status + History ── */}
            <div className="alloc-panel-right">

              {/* Asset status card */}
              {selectedAsset ? (
                <div className="asset-status-card">
                  <div className="status-info">
                    <div className="status-label">Selected Asset</div>
                    <div className="status-name">{selectedAsset.name}</div>
                    <div className="status-tag">{selectedAsset.asset_tag}{selectedAsset.serial_number ? ` · ${selectedAsset.serial_number}` : ""}</div>
                  </div>
                  <div className={`status-badge ${statusClass(selectedAsset.current_status)}`}>
                    {selectedAsset.current_status}
                  </div>
                </div>
              ) : (
                <div className="asset-status-card" style={{ justifyContent: "center", opacity: 0.45 }}>
                  <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>No asset selected</div>
                </div>
              )}

              {/* History panel */}
              <div className="history-panel">
                <div className="history-panel-header">
                  <h3>📋 Allocation History</h3>
                </div>
                <div className="history-panel-body">
                  {!selectedAssetId ? (
                    <div className="history-placeholder">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                      </svg>
                      <p>Select an asset to see its full allocation history.</p>
                    </div>
                  ) : checkingAllocation ? (
                    <div className="loading-pulse">Loading history...</div>
                  ) : historyList.length === 0 ? (
                    <div className="history-empty">No allocation records found for this asset.</div>
                  ) : (
                    historyList.map((item, i) => (
                      <div className="timeline-item" key={item.id}>
                        <div className={`tl-dot ${item.returned_at ? "returned" : ""}`} />
                        <div className="tl-body">
                          <div className="tl-date">{formatDate(item.allocated_at)}</div>
                          <div className="tl-title">
                            {item.returned_at ? "Returned from" : "Allocated to"} <strong>{item.employee_name || item.department_name || "—"}</strong>
                          </div>
                          <div className="tl-meta">
                            Condition: {item.checkout_condition?.toLowerCase() || "—"}
                            {item.returned_at && <> · Returned: {formatDate(item.returned_at)}</>}
                            {item.notes && <> · {item.notes}</>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
