"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/dashboard.scss";
import "../../styles/maintenance.scss";

// Interfaces
interface DropdownAsset {
  id: string;
  name: string;
  asset_tag: string;
}

interface DropdownEmployee {
  id: string;
  full_name: string;
  role: string;
}

interface MaintenanceRequest {
  id: string;
  request_number: string;
  asset_id: string;
  asset_name: string;
  asset_tag: string;
  raised_by_name: string;
  technician_name: string | null;
  issue_title: string;
  issue_description: string;
  priority: string;
  status: string;
  requested_service_date: string | null;
  rejection_reason: string | null;
  assigned_technician_id: string | null;
  work_performed: string | null;
  maintenance_cost: string | null;
  resolution_notes: string | null;
  condition_after: string | null;
}

export default function Maintenance() {
  const router = useRouter();

  // Auth States
  const [currentUser, setCurrentUser] = useState<{ fullName: string; role: string } | null>(null);

  // Kanban & Dropdown Options
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [assets, setAssets] = useState<DropdownAsset[]>([]);
  const [employees, setEmployees] = useState<DropdownEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  // Raise Request Modal
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [raiseForm, setRaiseForm] = useState({
    assetId: "",
    issueTitle: "",
    issueDescription: "",
    priority: "MEDIUM",
    requestedServiceDate: ""
  });

  // Details & Action Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState<MaintenanceRequest | null>(null);

  // Transition parameters
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedTechId, setSelectedTechId] = useState("");
  const [resolveForm, setResolveForm] = useState({
    notes: "",
    workPerformed: "",
    cost: "",
    conditionAfter: "GOOD",
    nextDueDate: ""
  });
  const [submittingTransition, setSubmittingTransition] = useState(false);

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
        const res = await fetch("/api/maintenance?dropdowns=true");
        if (res.ok) {
          const data = await res.json();
          setAssets(data.assets || []);
          setEmployees(data.employees || []);
        }
      } catch (err) {
        console.error("Failed to load setup dropdowns", err);
      }
    };
    fetchSetup();
  }, []);

  // Fetch Kanban requests list
  const fetchRequestsList = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/maintenance");
      if (!res.ok) throw new Error("Failed to retrieve requests");
      const data = await res.json();
      setRequests(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestsList();
  }, []);

  const handleLogout = () => {
    document.cookie = "accessToken=; Max-Age=0; path=/";
    toast.success("Logged out successfully");
    setTimeout(() => {
      router.push("/login");
    }, 1000);
  };

  // Submit standard raise request
  const handleRaiseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(raiseForm)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit request");
      }

      toast.success("Maintenance request submitted successfully!");
      setShowRaiseModal(false);
      setRaiseForm({
        assetId: "",
        issueTitle: "",
        issueDescription: "",
        priority: "MEDIUM",
        requestedServiceDate: ""
      });
      fetchRequestsList();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Action transitions execution
  const executeTransition = async (action: "APPROVE" | "REJECT" | "ASSIGN" | "START" | "RESOLVE") => {
    if (!selectedReq) return;
    try {
      setSubmittingTransition(true);
      const payload: Record<string, any> = {
        id: selectedReq.id,
        action
      };

      if (action === "REJECT") {
        if (!rejectionReason) {
          toast.error("Please provide a rejection reason.");
          return;
        }
        payload.reason = rejectionReason;
      }

      if (action === "ASSIGN") {
        if (!selectedTechId) {
          toast.error("Please select a technician.");
          return;
        }
        payload.technicianId = selectedTechId;
      }

      if (action === "RESOLVE") {
        if (!resolveForm.workPerformed || !resolveForm.cost) {
          toast.error("Work description and cost are required.");
          return;
        }
        payload.notes = resolveForm.notes;
        payload.workPerformed = resolveForm.workPerformed;
        payload.cost = resolveForm.cost;
        payload.conditionAfter = resolveForm.conditionAfter;
        payload.nextDueDate = resolveForm.nextDueDate || undefined;
      }

      const res = await fetch("/api/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Action transition failed");
      }

      toast.success(`Action ${action.toLowerCase()} processed successfully!`);
      setShowDetailModal(false);
      setRejectionReason("");
      setSelectedTechId("");
      setResolveForm({
        notes: "",
        workPerformed: "",
        cost: "",
        conditionAfter: "GOOD",
        nextDueDate: ""
      });
      fetchRequestsList();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingTransition(false);
    }
  };

  // Kanban groupings helper
  const getGroupedRequests = (statusName: string) => {
    return requests.filter(r => r.status === statusName);
  };

  const openCardDetails = (req: MaintenanceRequest) => {
    setSelectedReq(req);
    setRejectionReason("");
    setSelectedTechId(req.assigned_technician_id || "");
    setResolveForm({
      notes: req.resolution_notes || "",
      workPerformed: req.work_performed || "",
      cost: req.maintenance_cost || "",
      conditionAfter: req.condition_after || "GOOD",
      nextDueDate: ""
    });
    setShowDetailModal(true);
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
          <Link href="/maintenance" className="menu-item active">
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
            <input type="text" placeholder="Search maintenance log request numbers..." disabled />
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
        <div className="maintenance-content">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", color: "#ffffff", fontWeight: "600" }}>Maintenance Board</h2>
              <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "2px" }}>Structured approval workflow and status tracking for service issues.</p>
            </div>
            <button className="add-action-btn" onClick={() => setShowRaiseModal(true)}>
              + Raise Request
            </button>
          </div>

          {loading ? (
            <div style={{ color: "#64748b", textAlign: "center", padding: "40px" }}>Loading issues board...</div>
          ) : (
            <>
              {/* Kanban Grid */}
              <div className="kanban-board">
                
                {/* Column 1: Pending */}
                <div className="kanban-column">
                  <header className="column-header">
                    <span>Pending</span>
                    <span className="count">{getGroupedRequests("PENDING").length}</span>
                  </header>
                  <div className="column-cards-list">
                    {getGroupedRequests("PENDING").map(req => (
                      <div className="kanban-card" key={req.id} onClick={() => openCardDetails(req)}>
                        <div className="card-header-row">
                          <span className="card-tag">{req.asset_tag}</span>
                          <span className={`priority-indicator ${req.priority.toLowerCase()}`}>{req.priority}</span>
                        </div>
                        <span className="card-title">{req.asset_name}</span>
                        <p className="card-desc">{req.issue_title}</p>
                        <div className="card-meta">
                          <span>By: {req.raised_by_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2: Approved */}
                <div className="kanban-column">
                  <header className="column-header">
                    <span>Approved</span>
                    <span className="count">{getGroupedRequests("APPROVED").length}</span>
                  </header>
                  <div className="column-cards-list">
                    {getGroupedRequests("APPROVED").map(req => (
                      <div className="kanban-card" key={req.id} onClick={() => openCardDetails(req)}>
                        <div className="card-header-row">
                          <span className="card-tag">{req.asset_tag}</span>
                          <span className={`priority-indicator ${req.priority.toLowerCase()}`}>{req.priority}</span>
                        </div>
                        <span className="card-title">{req.asset_name}</span>
                        <p className="card-desc">{req.issue_title}</p>
                        <div className="card-meta">
                          <span>Approved</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 3: Technician Assigned */}
                <div className="kanban-column">
                  <header className="column-header">
                    <span>Technician Assigned</span>
                    <span className="count">{getGroupedRequests("TECHNICIAN_ASSIGNED").length}</span>
                  </header>
                  <div className="column-cards-list">
                    {getGroupedRequests("TECHNICIAN_ASSIGNED").map(req => (
                      <div className="kanban-card" key={req.id} onClick={() => openCardDetails(req)}>
                        <div className="card-header-row">
                          <span className="card-tag">{req.asset_tag}</span>
                          <span className={`priority-indicator ${req.priority.toLowerCase()}`}>{req.priority}</span>
                        </div>
                        <span className="card-title">{req.asset_name}</span>
                        <p className="card-desc">{req.issue_title}</p>
                        <div className="card-meta">
                          <span>Tech: {req.technician_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 4: In Progress */}
                <div className="kanban-column">
                  <header className="column-header">
                    <span>In Progress</span>
                    <span className="count">{getGroupedRequests("IN_PROGRESS").length}</span>
                  </header>
                  <div className="column-cards-list">
                    {getGroupedRequests("IN_PROGRESS").map(req => (
                      <div className="kanban-card" key={req.id} onClick={() => openCardDetails(req)}>
                        <div className="card-header-row">
                          <span className="card-tag">{req.asset_tag}</span>
                          <span className={`priority-indicator ${req.priority.toLowerCase()}`}>{req.priority}</span>
                        </div>
                        <span className="card-title">{req.asset_name}</span>
                        <p className="card-desc">{req.issue_title}</p>
                        <div className="card-meta">
                          <span>In Repair</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 5: Resolved */}
                <div className="kanban-column">
                  <header className="column-header">
                    <span>Resolved</span>
                    <span className="count">{getGroupedRequests("RESOLVED").length}</span>
                  </header>
                  <div className="column-cards-list">
                    {getGroupedRequests("RESOLVED").map(req => (
                      <div className="kanban-card resolved" key={req.id} onClick={() => openCardDetails(req)}>
                        <div className="card-header-row">
                          <span className="card-tag" style={{ color: "#4ade80" }}>{req.asset_tag}</span>
                        </div>
                        <span className="card-title" style={{ color: "#4ade80" }}>{req.asset_name}</span>
                        <p className="card-desc" style={{ color: "#94a3b8" }}>{req.issue_title}</p>
                        <div className="card-meta">
                          <span style={{ color: "#4ade80" }}>Resolved</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Helper note at the bottom */}
              <div className="kanban-footer-note">
                Approving a card moves the asset to <strong>under maintenance</strong>, resolving returns it to <strong>available</strong>.
              </div>
            </>
          )}
        </div>
      </main>

      {/* ── Modal: Raise Request ── */}
      {showRaiseModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "500px" }}>
            <header className="modal-header">
              <h3>Raise Maintenance Request</h3>
              <button className="close-btn" onClick={() => setShowRaiseModal(false)}>×</button>
            </header>
            <form onSubmit={handleRaiseSubmit}>
              <div className="modal-body">
                
                <div className="form-group">
                  <label>Asset</label>
                  <select
                    className="select-input" required style={{ width: "100%", background: "#090f1d" }}
                    value={raiseForm.assetId}
                    onChange={e => setRaiseForm({ ...raiseForm, assetId: e.target.value })}
                  >
                    <option value="">-- Select Asset --</option>
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>{a.asset_tag} — {a.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Issue Title</label>
                  <input
                    type="text" required
                    className="select-input" style={{ width: "100%", background: "#090f1d" }}
                    placeholder="e.g. Projector bulb not turning on"
                    value={raiseForm.issueTitle}
                    onChange={e => setRaiseForm({ ...raiseForm, issueTitle: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Issue Description</label>
                  <textarea
                    required
                    className="textarea-input" style={{ width: "100%", height: "80px", background: "#090f1d" }}
                    placeholder="Provide details about the malfunction..."
                    value={raiseForm.issueDescription}
                    onChange={e => setRaiseForm({ ...raiseForm, issueDescription: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      className="cell-select" style={{ padding: "10px" }}
                      value={raiseForm.priority}
                      onChange={e => setRaiseForm({ ...raiseForm, priority: e.target.value })}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Requested Service Date</label>
                    <input
                      type="date" required
                      className="text-input" style={{ background: "#090f1d" }}
                      value={raiseForm.requestedServiceDate}
                      onChange={e => setRaiseForm({ ...raiseForm, requestedServiceDate: e.target.value })}
                    />
                  </div>
                </div>

              </div>
              <footer className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setShowRaiseModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn">Raise Request</button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Card Actions & Status Progression ── */}
      {showDetailModal && selectedReq && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "550px" }}>
            <header className="modal-header">
              <div>
                <h3 style={{ fontSize: "1.1rem", color: "#48e5a0" }}>{selectedReq.request_number}</h3>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "2px" }}>{selectedReq.asset_tag} — {selectedReq.asset_name}</p>
              </div>
              <button className="close-btn" onClick={() => setShowDetailModal(false)}>×</button>
            </header>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              
              <div style={{ background: "#090f1d", border: "1px solid #162238", padding: "14px", borderRadius: "8px" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase" }}>Issue Details</span>
                <h4 style={{ color: "#ffffff", fontSize: "0.9rem", marginTop: "4px" }}>{selectedReq.issue_title}</h4>
                <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "6px" }}>{selectedReq.issue_description}</p>
                <div style={{ display: "flex", gap: "20px", marginTop: "10px", fontSize: "0.75rem", color: "#64748b" }}>
                  <span>Priority: <strong style={{ color: "#ffffff" }}>{selectedReq.priority}</strong></span>
                  <span>Reported By: <strong style={{ color: "#ffffff" }}>{selectedReq.raised_by_name}</strong></span>
                  {selectedReq.requested_service_date && (
                    <span>Service Date: <strong style={{ color: "#ffffff" }}>{formatDate(selectedReq.requested_service_date)}</strong></span>
                  )}
                </div>
              </div>

              {/* ── ACTIONS DEPENDING ON STATUS ── */}
              {selectedReq.status === "PENDING" && (currentUser?.role === "ADMIN" || currentUser?.role === "ASSET_MANAGER") && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid #162238", paddingTop: "14px" }}>
                  <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600" }}>Review Request</span>
                  <div className="form-group">
                    <label>Rejection Reason (If rejecting)</label>
                    <textarea
                      className="textarea-input" style={{ height: "60px", background: "#090f1d" }}
                      placeholder="Specify reason if rejecting request..."
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button type="button" className="cancel-btn" style={{ flexGrow: 1, borderColor: "#ef4444", color: "#ef4444" }} onClick={() => executeTransition("REJECT")}>
                      Reject Request
                    </button>
                    <button type="button" className="submit-btn" style={{ flexGrow: 1 }} onClick={() => executeTransition("APPROVE")}>
                      Approve Request
                    </button>
                  </div>
                </div>
              )}

              {selectedReq.status === "APPROVED" && (currentUser?.role === "ADMIN" || currentUser?.role === "ASSET_MANAGER") && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid #162238", paddingTop: "14px" }}>
                  <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600" }}>Assign Technician</span>
                  <div className="form-group">
                    <label>Technician</label>
                    <select
                      className="cell-select" style={{ padding: "10px" }}
                      value={selectedTechId}
                      onChange={e => setSelectedTechId(e.target.value)}
                    >
                      <option value="">-- Choose Technician --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.role})</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" className="submit-btn" style={{ width: "100%" }} onClick={() => executeTransition("ASSIGN")}>
                    Assign Technician
                  </button>
                </div>
              )}

              {selectedReq.status === "TECHNICIAN_ASSIGNED" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid #162238", paddingTop: "14px" }}>
                  <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600" }}>Work Assignment</span>
                  <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Technician <strong>{selectedReq.technician_name}</strong> has been assigned to resolve this issue.</p>
                  <button type="button" className="submit-btn" style={{ width: "100%" }} onClick={() => executeTransition("START")}>
                    Start Repair Work
                  </button>
                </div>
              )}

              {selectedReq.status === "IN_PROGRESS" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid #162238", paddingTop: "14px" }}>
                  <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600" }}>Resolve Repairs</span>
                  
                  <div className="form-group">
                    <label>Work Performed *</label>
                    <textarea
                      required className="textarea-input" style={{ height: "60px", background: "#090f1d" }}
                      placeholder="Describe what was repaired..."
                      value={resolveForm.workPerformed}
                      onChange={e => setResolveForm({ ...resolveForm, workPerformed: e.target.value })}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div className="form-group">
                      <label>Maintenance Cost ($) *</label>
                      <input
                        type="number" step="0.01" required
                        className="select-input" style={{ background: "#090f1d" }}
                        placeholder="Cost of parts/labor"
                        value={resolveForm.cost}
                        onChange={e => setResolveForm({ ...resolveForm, cost: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Final Condition</label>
                      <select
                        className="cell-select" style={{ padding: "10px" }}
                        value={resolveForm.conditionAfter}
                        onChange={e => setResolveForm({ ...resolveForm, conditionAfter: e.target.value })}
                      >
                        <option value="GOOD">Good</option>
                        <option value="FAIR">Fair</option>
                        <option value="POOR">Poor</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Next Maintenance Due Date (Optional)</label>
                    <input
                      type="date"
                      className="text-input" style={{ background: "#090f1d" }}
                      value={resolveForm.nextDueDate}
                      onChange={e => setResolveForm({ ...resolveForm, nextDueDate: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Technician Notes</label>
                    <textarea
                      className="textarea-input" style={{ height: "50px", background: "#090f1d" }}
                      placeholder="Resolution notes..."
                      value={resolveForm.notes}
                      onChange={e => setResolveForm({ ...resolveForm, notes: e.target.value })}
                    />
                  </div>

                  <button type="button" className="submit-btn" style={{ width: "100%" }} onClick={() => executeTransition("RESOLVE")}>
                    Resolve Request
                  </button>
                </div>
              )}

              {selectedReq.status === "RESOLVED" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px solid #162238", paddingTop: "14px" }}>
                  <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600" }}>Resolution Summary</span>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Work Performed</label>
                      <span style={{ color: "#ffffff", fontSize: "0.85rem" }}>{selectedReq.work_performed}</span>
                    </div>
                    <div className="detail-item">
                      <label>Maintenance Cost</label>
                      <span style={{ color: "#ffffff", fontSize: "0.85rem" }}>${selectedReq.maintenance_cost}</span>
                    </div>
                    <div className="detail-item">
                      <label>Resolution Notes</label>
                      <span style={{ color: "#ffffff", fontSize: "0.85rem" }}>{selectedReq.resolution_notes || "None"}</span>
                    </div>
                    <div className="detail-item">
                      <label>Condition</label>
                      <span style={{ color: "#ffffff", fontSize: "0.85rem" }}>{selectedReq.condition_after}</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
            <footer className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowDetailModal(false)}>Close Window</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
