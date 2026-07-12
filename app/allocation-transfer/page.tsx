"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/dashboard.scss";
import "../../styles/allocation-transfer.scss";

// Interfaces
interface DropdownAsset {
  id: string;
  name: string;
  asset_tag: string;
  current_status: string;
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

export default function AllocationTransfer() {
  const router = useRouter();

  // Auth States
  const [currentUser, setCurrentUser] = useState<{ fullName: string; role: string } | null>(null);

  // Dropdown options lists
  const [assets, setAssets] = useState<DropdownAsset[]>([]);
  const [employees, setEmployees] = useState<DropdownEmployee[]>([]);
  const [departments, setDepartments] = useState<DropdownDepartment[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected state
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [activeAllocation, setActiveAllocation] = useState<ActiveAllocation | null>(null);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [checkingAllocation, setCheckingAllocation] = useState(false);

  // Forms
  const [allocType, setAllocType] = useState<"employee" | "department">("employee");
  const [allocForm, setAllocForm] = useState({
    employeeId: "",
    departmentId: "",
    allocatedAt: new Date().toISOString().split("T")[0],
    expectedReturnDate: "",
    checkoutCondition: "GOOD",
    notes: ""
  });

  const [transferForm, setTransferForm] = useState({
    toEmployeeId: "",
    toDepartmentId: "",
    reason: ""
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

  // Fetch initial dropdown setup
  useEffect(() => {
    const fetchSetup = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/allocation-transfer?dropdowns=true");
        if (!res.ok) throw new Error("Failed to load checkout options");
        const data = await res.json();
        setAssets(data.assets || []);
        setEmployees(data.employees || []);
        setDepartments(data.departments || []);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSetup();
  }, []);

  // Check allocation when asset selection changes
  useEffect(() => {
    if (!selectedAssetId) {
      setActiveAllocation(null);
      setHistoryList([]);
      return;
    }

    const checkStatus = async () => {
      try {
        setCheckingAllocation(true);
        const res = await fetch(`/api/allocation-transfer?assetId=${selectedAssetId}`);
        if (!res.ok) throw new Error("Failed to query status");
        const data = await res.json();
        setActiveAllocation(data.activeAllocation);
        setHistoryList(data.history || []);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setCheckingAllocation(false);
      }
    };
    checkStatus();
  }, [selectedAssetId]);

  const handleLogout = () => {
    document.cookie = "accessToken=; Max-Age=0; path=/";
    toast.success("Logged out successfully");
    setTimeout(() => {
      router.push("/login");
    }, 1000);
  };

  // Submit standard new allocation check-out
  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== "ADMIN" && currentUser?.role !== "ASSET_MANAGER") {
      toast.error("Only Asset Managers and Admins can checkout allocations.");
      return;
    }

    try {
      const payload = {
        assetId: selectedAssetId,
        employeeId: allocType === "employee" ? allocForm.employeeId : undefined,
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

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Checkout failed");
      }

      toast.success("Asset checked out / allocated successfully!");
      // Reset forms and trigger check
      setAllocForm({
        employeeId: "",
        departmentId: "",
        allocatedAt: new Date().toISOString().split("T")[0],
        expectedReturnDate: "",
        checkoutCondition: "GOOD",
        notes: ""
      });
      // refresh asset status in dropdown list
      const updatedAssetsRes = await fetch("/api/allocation-transfer?dropdowns=true");
      if (updatedAssetsRes.ok) {
        const data = await updatedAssetsRes.json();
        setAssets(data.assets || []);
      }
      setSelectedAssetId("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Submit transfer request
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        assetId: selectedAssetId,
        toEmployeeId: allocType === "employee" ? transferForm.toEmployeeId : undefined,
        toDepartmentId: allocType === "department" ? transferForm.toDepartmentId : undefined,
        reason: transferForm.reason
      };

      const res = await fetch("/api/allocation-transfer/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit transfer request");
      }

      toast.success("Transfer request submitted successfully!");
      setTransferForm({
        toEmployeeId: "",
        toDepartmentId: "",
        reason: ""
      });
      setSelectedAssetId("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

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
          <Link href="/allocation-transfer" className="menu-item active">
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
          <Link href="/reports" className="menu-item">
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
            <input type="text" placeholder="Lookup asset tags or allocation numbers..." disabled />
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
        <div className="allocation-content">
          {loading ? (
            <div style={{ color: "#64748b" }}>Loading allocation profiles...</div>
          ) : (
            <div className="allocation-card">
              <header className="card-header">
                <h2>Asset Allocation & Transfer</h2>
                <p>Register standard allocation assignments or file transfer requests between holders.</p>
              </header>

              {/* Asset Selection */}
              <div className="form-group">
                <label>Choose Asset</label>
                <select
                  className="select-input"
                  value={selectedAssetId}
                  onChange={e => setSelectedAssetId(e.target.value)}
                >
                  <option value="">-- Choose Asset --</option>
                  {assets.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.asset_tag} — {item.name} ({item.current_status})
                    </option>
                  ))}
                </select>
              </div>

              {checkingAllocation ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Verifying asset allocation status...</div>
              ) : (
                selectedAssetId && (
                  <>
                    {/* CASE A: Asset is ALREADY allocated (Double allocation warning + Transfer Request Form) */}
                    {activeAllocation ? (
                      <>
                        {/* Red warning box alert */}
                        <div className="allocation-warning-block">
                          <span className="warning-title">Already Allocated</span>
                          <span>
                            This asset is currently allocated to{" "}
                            <strong>
                              {activeAllocation.employee_name || activeAllocation.department_name}
                            </strong>
                            . Direct re-allocation is blocked. Submit a transfer request below.
                          </span>
                        </div>

                        {/* Transfer Request Form */}
                        <form onSubmit={handleTransferSubmit}>
                          <div style={{ margin: "16px 0", borderBottom: "1px solid #162238", paddingBottom: "10px" }}>
                            <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "#ffffff" }}>Transfer Request Form</span>
                          </div>

                          <div className="form-grid">
                            <div className="form-group">
                              <label>From (Current Holder)</label>
                              <input 
                                type="text" 
                                className="text-input" 
                                disabled 
                                value={activeAllocation.employee_name || activeAllocation.department_name || ""}
                              />
                            </div>
                            <div className="form-group">
                              <label>To (Target Recipient)</label>
                              {allocType === "employee" ? (
                                <select 
                                  className="select-input" required
                                  value={transferForm.toEmployeeId}
                                  onChange={e => setTransferForm({ ...transferForm, toEmployeeId: e.target.value })}
                                >
                                  <option value="">Select Employee...</option>
                                  {employees.filter(e => e.full_name !== activeAllocation.employee_name).map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                  ))}
                                </select>
                              ) : (
                                <select
                                  className="select-input" required
                                  value={transferForm.toDepartmentId}
                                  onChange={e => setTransferForm({ ...transferForm, toDepartmentId: e.target.value })}
                                >
                                  <option value="">Select Department...</option>
                                  {departments.filter(d => d.name !== activeAllocation.department_name).map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>

                          {/* Toggle Destination Assignment Type */}
                          <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#94a3b8", cursor: "pointer" }}>
                              <input 
                                type="radio" name="transferType" checked={allocType === "employee"} 
                                onChange={() => { setAllocType("employee"); setTransferForm({ ...transferForm, toDepartmentId: "" }); }} 
                              />
                              To Employee
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#94a3b8", cursor: "pointer" }}>
                              <input 
                                type="radio" name="transferType" checked={allocType === "department"} 
                                onChange={() => { setAllocType("department"); setTransferForm({ ...transferForm, toEmployeeId: "" }); }} 
                              />
                              To Department
                            </label>
                          </div>

                          <div className="form-group">
                            <label>Transfer Reason</label>
                            <textarea 
                              className="textarea-input" required
                              placeholder="Describe the reason for reallocating this asset..."
                              value={transferForm.reason}
                              onChange={e => setTransferForm({ ...transferForm, reason: e.target.value })}
                            />
                          </div>

                          <button type="submit" className="add-action-btn" style={{ width: "100%", justifyContent: "center" }}>
                            Submit Transfer Request
                          </button>
                        </form>
                      </>
                    ) : (
                      /* CASE B: Asset is Available (Standard Checkout Allocation Form) */
                      <form onSubmit={handleAllocateSubmit}>
                        <div style={{ margin: "16px 0", borderBottom: "1px solid #162238", paddingBottom: "10px" }}>
                          <span style={{ fontSize: "0.95rem", fontWeight: "600", color: "#ffffff" }}>Checkout Allocation Form</span>
                        </div>

                        {/* Assignment Target Type */}
                        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#94a3b8", cursor: "pointer" }}>
                            <input type="radio" name="allocType" checked={allocType === "employee"} onChange={() => setAllocType("employee")} />
                            Allocate to Employee
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#94a3b8", cursor: "pointer" }}>
                            <input type="radio" name="allocType" checked={allocType === "department"} onChange={() => setAllocType("department")} />
                            Allocate to Department
                          </label>
                        </div>

                        <div className="form-grid">
                          <div className="form-group">
                            <label>Recipient</label>
                            {allocType === "employee" ? (
                              <select 
                                className="select-input" required
                                value={allocForm.employeeId}
                                onChange={e => setAllocForm({ ...allocForm, employeeId: e.target.value })}
                              >
                                <option value="">Select Employee...</option>
                                {employees.map(emp => (
                                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                ))}
                              </select>
                            ) : (
                              <select 
                                className="select-input" required
                                value={allocForm.departmentId}
                                onChange={e => setAllocForm({ ...allocForm, departmentId: e.target.value })}
                              >
                                <option value="">Select Department...</option>
                                {departments.map(dept => (
                                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                          
                          <div className="form-group">
                            <label>Checkout Date</label>
                            <input 
                              type="date" className="text-input" required
                              value={allocForm.allocatedAt}
                              onChange={e => setAllocForm({ ...allocForm, allocatedAt: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="form-grid">
                          <div className="form-group">
                            <label>Expected Return Date (Optional)</label>
                            <input 
                              type="date" className="text-input"
                              value={allocForm.expectedReturnDate}
                              onChange={e => setAllocForm({ ...allocForm, expectedReturnDate: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label>Check-out Condition</label>
                            <select 
                              className="select-input"
                              value={allocForm.checkoutCondition}
                              onChange={e => setAllocForm({ ...allocForm, checkoutCondition: e.target.value })}
                            >
                              <option value="NEW">New</option>
                              <option value="GOOD">Good</option>
                              <option value="FAIR">Fair</option>
                              <option value="POOR">Poor / Damaged</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Allocation Notes</label>
                          <textarea 
                            className="textarea-input"
                            placeholder="Add any specific comments or setup notes..."
                            value={allocForm.notes}
                            onChange={e => setAllocForm({ ...allocForm, notes: e.target.value })}
                          />
                        </div>

                        <button type="submit" className="add-action-btn" style={{ width: "100%", justifyContent: "center" }}>
                          Allocate Asset
                        </button>
                      </form>
                    )}

                    {/* Bottom: Allocation History Timeline list */}
                    <div className="allocation-history-timeline">
                      <h3>Allocation History</h3>
                      <div className="history-list">
                        {historyList.length === 0 ? (
                          <div className="empty-history">No previous allocation records found for this asset.</div>
                        ) : (
                          historyList.map(item => (
                            <div className="history-item" key={item.id}>
                              <div className="bullet"></div>
                              <div className="text">
                                <strong>{formatDate(item.allocated_at)}</strong> —{" "}
                                {item.returned_at ? (
                                  <span>
                                    Returned by{" "}
                                    <strong>{item.employee_name || item.department_name}</strong>{" "}
                                    (condition: {item.checkout_condition.toLowerCase()})
                                  </span>
                                ) : (
                                  <span>
                                    Allocated to{" "}
                                    <strong>{item.employee_name || item.department_name}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
