"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/dashboard.scss";
import "../../styles/assets.scss";
import { authService } from "../../lib/services/authService";

// Interfaces
interface Asset {
  id: string;
  asset_tag: string;
  name: string;
  current_status: string;
  category_name: string;
  location_name: string;
  department_name: string;
}

interface DropdownCategory {
  id: string;
  name: string;
  code: string;
  customFields?: Array<{ id: string; name: string; field_type: string; is_required: boolean }>;
}

interface DropdownLocation {
  id: string;
  name: string;
}

interface DropdownDepartment {
  id: string;
  name: string;
}

interface AssetDetails {
  details: {
    id: string;
    asset_tag: string;
    name: string;
    description: string;
    serial_number: string;
    manufacturer: string;
    model_number: string;
    acquisition_date: string;
    acquisition_cost: string;
    warranty_start_date: string;
    warranty_end_date: string;
    expected_retirement_date: string;
    current_status: string;
    current_condition: string;
    is_shared_bookable: boolean;
    qr_code_value: string;
    category_name: string;
    location_name: string;
    department_name: string;
  };
  customFields: Array<{ custom_field_id: string; field_name: string; field_type: string; text_value: string; number_value: number; date_value: string }>;
  documents: Array<{ id: string; file_name: string; file_type: string; file_url: string; created_at: string }>;
  allocations: Array<{ id: string; employee_name: string; department_name: string; allocated_at: string; returned_at: string; status: string; return_condition: string }>;
  maintenance: Array<{ id: string; title: string; priority: string; technician_name: string; status: string; created_at: string; resolved_at: string }>;
  statusHistory: Array<{ id: string; from_status: string; to_status: string; notes: string; changed_by_name: string; created_at: string }>;
}

export default function Assets() {
  const router = useRouter();

  // Auth States
  const [currentUser, setCurrentUser] = useState<{ fullName: string; role: string } | null>(null);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  // Table Data & Options
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<DropdownCategory[]>([]);
  const [locations, setLocations] = useState<DropdownLocation[]>([]);
  const [departments, setDepartments] = useState<DropdownDepartment[]>([]);
  const [loading, setLoading] = useState(true);

  // Register Asset Modal State
  const [showRegModal, setShowRegModal] = useState(false);
  const [regForm, setRegForm] = useState({
    name: "",
    description: "",
    category_id: "",
    serial_number: "",
    manufacturer: "",
    model_number: "",
    acquisition_date: "",
    acquisition_cost: "",
    warranty_start_date: "",
    warranty_end_date: "",
    expected_retirement_date: "",
    current_condition: "NEW",
    department_id: "",
    location_id: "",
    is_shared_bookable: false
  });
  const [regCustomFields, setRegCustomFields] = useState<Record<string, any>>({});
  const [regDocuments, setRegDocuments] = useState<Array<{ fileName: string; fileUrl: string; fileType: string }>>([]);

  // Detailed Modal State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [assetDetails, setAssetDetails] = useState<AssetDetails | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<"info" | "allocations" | "maintenance" | "lifecycle">("info");
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Decode User JWT
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

  // Fetch Dropdowns (Setup context)
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const res = await fetch("/api/assets?dropdowns=true");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
          setLocations(data.locations || []);
          setDepartments(data.departments || []);
        }
      } catch (err) {
        console.error("Failed to load setup dropdown options", err);
      }
    };
    fetchDropdowns();
  }, []);

  // Fetch Assets List
  const fetchAssetsList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (categoryFilter) params.append("categoryId", categoryFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (departmentFilter) params.append("departmentId", departmentFilter);

      const res = await fetch(`/api/assets?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to retrieve directory list");
      const data = await res.json();
      setAssets(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetsList();
  }, [search, categoryFilter, statusFilter, departmentFilter]);

  const handleLogout = async () => {
    await authService.logout();
    toast.success("Logged out successfully");
    setTimeout(() => {
      router.push("/login");
    }, 1000);
  };

  // ── Register Asset Modal Logic ──
  const openRegisterModal = () => {
    if (currentUser?.role !== "ADMIN" && currentUser?.role !== "ASSET_MANAGER") {
      toast.error("Only Asset Managers and Admins can register new assets.");
      return;
    }
    setRegForm({
      name: "",
      description: "",
      category_id: "",
      serial_number: "",
      manufacturer: "",
      model_number: "",
      acquisition_date: "",
      acquisition_cost: "",
      warranty_start_date: "",
      warranty_end_date: "",
      expected_retirement_date: "",
      current_condition: "NEW",
      department_id: "",
      location_id: "",
      is_shared_bookable: false
    });
    setRegCustomFields({});
    setRegDocuments([]);
    setShowRegModal(true);
  };

  const selectedCategoryObj = categories.find(c => c.id === regForm.category_id);

  const handleCustomFieldChange = (fieldId: string, val: any) => {
    setRegCustomFields({ ...regCustomFields, [fieldId]: val });
  };

  const addRegDocumentPlaceholder = () => {
    setRegDocuments([
      ...regDocuments,
      { fileName: "Warranty Card.pdf", fileUrl: "https://assetflow.com/docs/warranty.pdf", fileType: "PDF" }
    ]);
  };

  const saveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Map custom fields to correct backend payload format
      const customFieldPayload = Object.keys(regCustomFields).map(id => {
        const fieldObj = selectedCategoryObj?.customFields?.find(f => f.id === id);
        return {
          id: parseInt(id, 10),
          value: regCustomFields[id],
          fieldType: fieldObj?.field_type || "TEXT"
        };
      });

      const payload = {
        ...regForm,
        customFields: customFieldPayload,
        documents: regDocuments
      };

      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to register asset");
      }

      toast.success("New asset registered successfully!");
      setShowRegModal(false);
      fetchAssetsList();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ── Asset Details & History Modal Logic ──
  const openAssetDetails = async (assetId: string) => {
    try {
      setSelectedAssetId(assetId);
      setDetailsLoading(true);
      setShowDetailModal(true);
      setDetailActiveTab("info");

      const res = await fetch(`/api/assets/${assetId}`);
      if (!res.ok) throw new Error("Failed to load asset profile details");
      const data = await res.json();
      setAssetDetails(data);
    } catch (err: any) {
      toast.error(err.message);
      setShowDetailModal(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "---";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
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
          <Link href="/assets" className="menu-item active">
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
            <input 
              type="text" 
              placeholder="Search by tag, serial, or QR code.." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
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

        {/* Directory Content */}
        <div className="assets-content">
          
          {/* Controls: Filters + Add Button */}
          <section className="assets-controls">
            <div className="search-row">
              <span style={{ fontSize: "1.1rem", fontWeight: "600", color: "#ffffff" }}>Asset Directory</span>
              {(currentUser?.role === "ADMIN" || currentUser?.role === "ASSET_MANAGER") && (
                <button className="add-action-btn" onClick={openRegisterModal}>
                  + Register Asset
                </button>
              )}
            </div>
            <div className="filters-row">
              {/* Category Filter */}
              <select 
                className="filter-select"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select 
                className="filter-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="ALLOCATED">Allocated</option>
                <option value="RESERVED">Reserved</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="LOST">Lost</option>
                <option value="RETIRED">Retired</option>
                <option value="DISPOSED">Disposed</option>
              </select>

              {/* Department Filter */}
              <select 
                className="filter-select"
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {(categoryFilter || statusFilter || departmentFilter) && (
                <button 
                  className="clear-filters-btn"
                  onClick={() => {
                    setCategoryFilter("");
                    setStatusFilter("");
                    setDepartmentFilter("");
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </section>

          {loading ? (
            <div style={{ textAlign: "center", color: "#64748b", padding: "40px" }}>Retrieving registered assets...</div>
          ) : (
            <div className="assets-table-card">
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Tag</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "#64748b", padding: "24px" }}>
                          No assets found matching filters.
                        </td>
                      </tr>
                    ) : (
                      assets.map((item) => (
                        <tr key={item.id} onClick={() => openAssetDetails(item.id)}>
                          <td className="row-title" style={{ color: "#48e5a0" }}>{item.asset_tag}</td>
                          <td>{item.name}</td>
                          <td>{item.category_name}</td>
                          <td>
                            <span className={`status-pill ${item.current_status === "AVAILABLE" ? "active" : "inactive"}`}>
                              {item.current_status}
                            </span>
                          </td>
                          <td>{item.location_name || "Warehouse"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Register Asset Modal ── */}
      {showRegModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "600px" }}>
            <header className="modal-header">
              <h3>Register New Asset</h3>
              <button className="close-btn" onClick={() => setShowRegModal(false)}>×</button>
            </header>
            <form onSubmit={saveAsset}>
              <div className="modal-body">
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Asset Name</label>
                    <input 
                      type="text" required
                      style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "10px", outline: "none", fontSize: "0.85rem" }}
                      value={regForm.name} 
                      onChange={e => setRegForm({...regForm, name: e.target.value})} 
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Asset Category</label>
                    <select 
                      className="cell-select" required style={{ padding: "10px" }}
                      value={regForm.category_id}
                      onChange={e => {
                        setRegForm({...regForm, category_id: e.target.value});
                        setRegCustomFields({}); // reset
                      }}
                    >
                      <option value="">-- Choose Category --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Serial Number</label>
                    <input 
                      type="text" required
                      style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "10px", outline: "none", fontSize: "0.85rem" }}
                      value={regForm.serial_number} 
                      onChange={e => setRegForm({...regForm, serial_number: e.target.value})} 
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Manufacturer</label>
                    <input 
                      type="text" required
                      style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "10px", outline: "none", fontSize: "0.85rem" }}
                      value={regForm.manufacturer} 
                      onChange={e => setRegForm({...regForm, manufacturer: e.target.value})} 
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Model Number</label>
                    <input 
                      type="text" required
                      style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "10px", outline: "none", fontSize: "0.85rem" }}
                      value={regForm.model_number} 
                      onChange={e => setRegForm({...regForm, model_number: e.target.value})} 
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Acquisition Cost ($)</label>
                    <input 
                      type="number" step="0.01" required
                      style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "10px", outline: "none", fontSize: "0.85rem" }}
                      value={regForm.acquisition_cost} 
                      onChange={e => setRegForm({...regForm, acquisition_cost: e.target.value})} 
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Acquisition Date</label>
                    <input 
                      type="date" required
                      style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "10px", outline: "none", fontSize: "0.85rem" }}
                      value={regForm.acquisition_date} 
                      onChange={e => setRegForm({...regForm, acquisition_date: e.target.value})} 
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Current Location</label>
                    <select 
                      className="cell-select" style={{ padding: "10px" }}
                      value={regForm.location_id}
                      onChange={e => setRegForm({...regForm, location_id: e.target.value})}
                    >
                      <option value="">-- Choose Location --</option>
                      {locations.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Warranty Start Date</label>
                    <input 
                      type="date"
                      style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "10px", outline: "none", fontSize: "0.85rem" }}
                      value={regForm.warranty_start_date} 
                      onChange={e => setRegForm({...regForm, warranty_start_date: e.target.value})} 
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Warranty End Date</label>
                    <input 
                      type="date"
                      style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "10px", outline: "none", fontSize: "0.85rem" }}
                      value={regForm.warranty_end_date} 
                      onChange={e => setRegForm({...regForm, warranty_end_date: e.target.value})} 
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Department Owner</label>
                    <select 
                      className="cell-select" style={{ padding: "10px" }}
                      value={regForm.department_id}
                      onChange={e => setRegForm({...regForm, department_id: e.target.value})}
                    >
                      <option value="">-- Choose Department --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", height: "100%", paddingTop: "20px" }}>
                    <input 
                      type="checkbox" id="shared-book"
                      checked={regForm.is_shared_bookable}
                      onChange={e => setRegForm({...regForm, is_shared_bookable: e.target.checked})}
                    />
                    <label htmlFor="shared-book" style={{ fontSize: "0.85rem", color: "#ffffff", cursor: "pointer" }}>Mark Shared / Bookable Resource</label>
                  </div>
                </div>

                {/* Category dynamic custom fields */}
                {selectedCategoryObj?.customFields && selectedCategoryObj.customFields.length > 0 && (
                  <div className="custom-fields-builder" style={{ marginTop: "12px" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#64748b" }}>Category-Specific Custom Fields</span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      {selectedCategoryObj.customFields.map((field) => (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }} key={field.id}>
                          <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{field.name} {field.is_required && "*"}</label>
                          {field.field_type === "DATE" ? (
                            <input 
                              type="date" required={field.is_required}
                              style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "8px", outline: "none", fontSize: "0.85rem" }}
                              value={regCustomFields[field.id] || ""}
                              onChange={e => handleCustomFieldChange(field.id, e.target.value)}
                            />
                          ) : field.field_type === "NUMBER" ? (
                            <input 
                              type="number" required={field.is_required}
                              style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "8px", outline: "none", fontSize: "0.85rem" }}
                              value={regCustomFields[field.id] || ""}
                              onChange={e => handleCustomFieldChange(field.id, e.target.value)}
                            />
                          ) : (
                            <input 
                              type="text" required={field.is_required}
                              style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "8px", outline: "none", fontSize: "0.85rem" }}
                              value={regCustomFields[field.id] || ""}
                              onChange={e => handleCustomFieldChange(field.id, e.target.value)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Documents Placeholder list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid #162238", paddingTop: "12px", marginTop: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "600" }}>Supporting Documents & Photos</span>
                    <button type="button" style={{ background: "transparent", border: "none", color: "#48e5a0", fontSize: "0.8rem", cursor: "pointer" }} onClick={addRegDocumentPlaceholder}>
                      + Upload Document
                    </button>
                  </div>
                  {regDocuments.map((doc, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", background: "#090f1d", padding: "8px 12px", borderRadius: "6px", fontSize: "0.8rem", border: "1px solid #162238" }}>
                      <span>📄 {doc.fileName}</span>
                      <span style={{ color: "#64748b" }}>{doc.fileType}</span>
                    </div>
                  ))}
                </div>

              </div>
              <footer className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setShowRegModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn">Save Asset</button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* ── Wide Detailed Asset Profile Modal ── */}
      {showDetailModal && (
        <div className="modal-overlay">
          <div className="modal-card detail-modal-card">
            <header className="modal-header">
              <div>
                <h3 style={{ fontSize: "1.2rem", color: "#48e5a0" }}>{assetDetails?.details.asset_tag || "Loading.."}</h3>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "2px" }}>{assetDetails?.details.name}</p>
              </div>
              <button className="close-btn" onClick={() => setShowDetailModal(false)}>×</button>
            </header>

            {/* Modal Tabs */}
            <div className="modal-tab-menu">
              <span className={`tab-item ${detailActiveTab === "info" ? "active" : ""}`} onClick={() => setDetailActiveTab("info")}>Profile & Fields</span>
              <span className={`tab-item ${detailActiveTab === "allocations" ? "active" : ""}`} onClick={() => setDetailActiveTab("allocations")}>Allocation Logs</span>
              <span className={`tab-item ${detailActiveTab === "maintenance" ? "active" : ""}`} onClick={() => setDetailActiveTab("maintenance")}>Maintenance</span>
              <span className={`tab-item ${detailActiveTab === "lifecycle" ? "active" : ""}`} onClick={() => setDetailActiveTab("lifecycle")}>Lifecycle History</span>
            </div>

            <div className="modal-body" style={{ padding: "24px" }}>
              {detailsLoading ? (
                <div style={{ textAlign: "center", color: "#64748b", padding: "40px" }}>Fetching asset histories...</div>
              ) : (
                <>
                  {/* TAB 1: General Info & Custom Fields */}
                  {detailActiveTab === "info" && assetDetails && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <label>Manufacturer & Model</label>
                          <span>{assetDetails.details.manufacturer} — {assetDetails.details.model_number}</span>
                        </div>
                        <div className="detail-item">
                          <label>Serial Number</label>
                          <span>{assetDetails.details.serial_number}</span>
                        </div>
                        <div className="detail-item">
                          <label>Current Status</label>
                          <span>{assetDetails.details.current_status}</span>
                        </div>
                        <div className="detail-item">
                          <label>Current Condition</label>
                          <span>{assetDetails.details.current_condition}</span>
                        </div>
                        <div className="detail-item">
                          <label>Cost & Acquisition Date</label>
                          <span>${assetDetails.details.acquisition_cost} on {formatDate(assetDetails.details.acquisition_date)}</span>
                        </div>
                        <div className="detail-item">
                          <label>Warranty Range</label>
                          <span>{formatDate(assetDetails.details.warranty_start_date)} - {formatDate(assetDetails.details.warranty_end_date)}</span>
                        </div>
                        <div className="detail-item">
                          <label>Assigned Department</label>
                          <span>{assetDetails.details.department_name || "Global / Unassigned"}</span>
                        </div>
                        <div className="detail-item">
                          <label>Current Location</label>
                          <span>{assetDetails.details.location_name || "Warehouse"}</span>
                        </div>
                      </div>

                      {/* Dynamic Fields values */}
                      {assetDetails.customFields && assetDetails.customFields.length > 0 && (
                        <div style={{ borderTop: "1px solid #162238", paddingTop: "16px", marginTop: "10px" }}>
                          <h4 style={{ fontSize: "0.85rem", fontWeight: "600", color: "#64748b", marginBottom: "12px", textTransform: "uppercase" }}>Category Specifications</h4>
                          <div className="detail-grid">
                            {assetDetails.customFields.map((f, i) => (
                              <div className="detail-item" key={i}>
                                <label>{f.field_name}</label>
                                <span>{f.text_value || "---"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Documents Section */}
                      <div style={{ borderTop: "1px solid #162238", paddingTop: "16px", marginTop: "10px" }}>
                        <h4 style={{ fontSize: "0.85rem", fontWeight: "600", color: "#64748b", marginBottom: "12px", textTransform: "uppercase" }}>Attached Documents</h4>
                        {assetDetails.documents.length === 0 ? (
                          <div style={{ fontSize: "0.85rem", color: "#64748b" }}>No files uploaded.</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {assetDetails.documents.map((doc, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", background: "#090f1d", padding: "8px 12px", borderRadius: "6px", fontSize: "0.8rem", border: "1px solid #162238" }}>
                                <span style={{ color: "#48e5a0" }}>📄 {doc.file_name}</span>
                                <span style={{ color: "#64748b" }}>Uploaded: {formatDate(doc.created_at)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* QR Lookup Section */}
                      <div className="qr-code-section">
                        <div className="qr-code-box">QR Code Lookup</div>
                        <div className="qr-info">
                          <h4>QR Scan Value</h4>
                          <p style={{ fontFamily: "monospace", color: "#48e5a0" }}>{assetDetails.details.qr_code_value}</p>
                          <p>Scanning directly routes the lookup process to this asset profile detail modal.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Allocation Logs */}
                  {detailActiveTab === "allocations" && assetDetails && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {assetDetails.allocations.length === 0 ? (
                        <div className="empty-state">No allocation logs found for this asset.</div>
                      ) : (
                        <div className="table-card" style={{ border: "none" }}>
                          <table>
                            <thead>
                              <tr>
                                <th>Holder</th>
                                <th>Allocated On</th>
                                <th>Returned On</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {assetDetails.allocations.map((log) => (
                                <tr key={log.id}>
                                  <td className="row-title">{log.employee_name || "Department / Global"}</td>
                                  <td>{formatDate(log.allocated_at)}</td>
                                  <td>{formatDate(log.returned_at)}</td>
                                  <td>{log.status}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: Maintenance Requests */}
                  {detailActiveTab === "maintenance" && assetDetails && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {assetDetails.maintenance.length === 0 ? (
                        <div className="empty-state">No maintenance request history found.</div>
                      ) : (
                        <div className="table-card" style={{ border: "none" }}>
                          <table>
                            <thead>
                              <tr>
                                <th>Title / Issue</th>
                                <th>Priority</th>
                                <th>Technician</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {assetDetails.maintenance.map((req) => (
                                <tr key={req.id}>
                                  <td className="row-title">{req.title || "Hardware service"}</td>
                                  <td>{req.priority}</td>
                                  <td>{req.technician_name || "Unassigned"}</td>
                                  <td>{req.status}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: Status Lifecycle History */}
                  {detailActiveTab === "lifecycle" && assetDetails && (
                    <div className="lifecycle-timeline">
                      {assetDetails.statusHistory.length === 0 ? (
                        <div className="empty-state">No status history found.</div>
                      ) : (
                        assetDetails.statusHistory.map((history) => (
                          <div className="timeline-item" key={history.id}>
                            <div className="timeline-dot status-active"></div>
                            <div className="timeline-content">
                              <div className="timeline-title">
                                {history.to_status} <span>by {history.changed_by_name || "System"}</span>
                              </div>
                              <div className="timeline-desc">
                                Changed status from <strong>{history.from_status}</strong> to <strong>{history.to_status}</strong>
                              </div>
                              {history.notes && <div className="timeline-notes">"{history.notes}"</div>}
                              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                                {formatDate(history.created_at)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <footer className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowDetailModal(false)}>Close Detail View</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
