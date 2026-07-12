"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/dashboard.scss";
import "../../styles/organization-setup.scss";

// Interfaces
interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  parent_department_id: string | null;
  parent_name: string | null;
  head_name: string | null;
  head_user_id: string | null;
  status: string;
}

interface CustomField {
  name: string;
  field_type: string;
  is_required: boolean;
}

interface Category {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
  customFields?: CustomField[];
}

interface Employee {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  department_id: string | null;
  department_name: string | null;
}

export default function OrganizationSetup() {
  const router = useRouter();
  
  // Auth & UI States
  const [currentUser, setCurrentUser] = useState<{ fullName: string; role: string } | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"departments" | "categories" | "employees">("departments");
  const [loading, setLoading] = useState(true);

  // Data States
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Modals States
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: "", code: "", description: "", parent_department_id: "" });

  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: "", code: "", description: "" });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Auth decoding check
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
            fullName: payload.full_name || "Admin User",
            role: payload.role || "EMPLOYEE"
          });
          if (payload.role === "ADMIN") {
            setAuthorized(true);
          } else {
            setAuthorized(false);
          }
        }
      } else {
        setAuthorized(false);
      }
    } catch (err) {
      console.error(err);
      setAuthorized(false);
    }
  }, []);

  // Fetch Page Data
  const fetchData = async () => {
    if (!authorized) return;
    try {
      setLoading(true);
      const [deptRes, catRes, empRes] = await Promise.all([
        fetch("/api/org-setup/departments"),
        fetch("/api/org-setup/categories"),
        fetch("/api/org-setup/employees")
      ]);

      if (deptRes.ok) setDepartments(await deptRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (empRes.ok) setEmployees(await empRes.json());
    } catch (err) {
      toast.error("Failed to load setup data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authorized]);

  const handleLogout = () => {
    document.cookie = "accessToken=; Max-Age=0; path=/";
    toast.success("Logged out successfully");
    setTimeout(() => {
      router.push("/login");
    }, 1000);
  };

  // ── Tab A: Department CRUD Operations ──
  const openAddDept = () => {
    setEditingDept(null);
    setDeptForm({ name: "", code: "", description: "", parent_department_id: "" });
    setShowDeptModal(true);
  };

  const openEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      code: dept.code,
      description: dept.description || "",
      parent_department_id: dept.parent_department_id || ""
    });
    setShowDeptModal(true);
  };

  const saveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingDept;
      const url = "/api/org-setup/departments";
      const method = isEdit ? "PUT" : "POST";
      const payload = isEdit 
        ? { id: editingDept.id, ...deptForm }
        : deptForm;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to save department");
      }

      toast.success(isEdit ? "Department updated" : "Department created");
      setShowDeptModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleDeptStatus = async (dept: Department) => {
    try {
      const newStatus = dept.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const res = await fetch("/api/org-setup/departments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dept, status: newStatus })
      });

      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Department is now ${newStatus.toLowerCase()}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const assignDeptHead = async (deptId: string, headId: string) => {
    try {
      const res = await fetch("/api/org-setup/departments/assign-head", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId: deptId, userId: headId })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to assign HOD");
      }

      toast.success("Department head updated");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ── Tab B: Category CRUD Operations ──
  const openAddCat = () => {
    setEditingCat(null);
    setCatForm({ name: "", code: "", description: "" });
    setCustomFields([]);
    setShowCatModal(true);
  };

  const openEditCat = (cat: Category) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name,
      code: cat.code,
      description: cat.description || ""
    });
    setCustomFields(cat.customFields || []);
    setShowCatModal(true);
  };

  const addCustomFieldRow = () => {
    setCustomFields([...customFields, { name: "", field_type: "TEXT", is_required: false }]);
  };

  const updateCustomField = (index: number, key: keyof CustomField, value: any) => {
    const fieldsCopy = [...customFields];
    fieldsCopy[index] = { ...fieldsCopy[index], [key]: value };
    setCustomFields(fieldsCopy);
  };

  const deleteCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const saveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingCat;
      const url = "/api/org-setup/categories";
      const method = isEdit ? "PUT" : "POST";
      const payload = isEdit 
        ? { id: editingCat.id, ...catForm, customFields }
        : { ...catForm, customFields };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to save category");
      }

      toast.success(isEdit ? "Category updated" : "Category created");
      setShowCatModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleCatStatus = async (cat: Category) => {
    try {
      const newStatus = cat.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const res = await fetch("/api/org-setup/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cat, status: newStatus })
      });

      if (!res.ok) throw new Error("Failed to toggle status");
      toast.success(`Category is now ${newStatus.toLowerCase()}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ── Tab C: Employee Directory Operations ──
  const updateEmpDept = async (empId: string, deptId: string) => {
    try {
      const res = await fetch("/api/org-setup/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: empId, departmentId: deptId || null })
      });

      if (!res.ok) throw new Error("Failed to assign department");
      toast.success("Employee department updated");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateEmpRole = async (empId: string, role: string) => {
    try {
      const res = await fetch("/api/org-setup/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: empId, role })
      });

      if (!res.ok) throw new Error("Failed to promote employee");
      toast.success(`Employee role set to ${role}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleEmpStatus = async (emp: Employee) => {
    try {
      const newStatus = emp.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      const res = await fetch("/api/org-setup/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: emp.id, status: newStatus })
      });

      if (!res.ok) throw new Error("Failed to update user status");
      toast.success(`Employee account is now ${newStatus.toLowerCase()}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Render Access Denied
  if (authorized === false) {
    return (
      <div style={{ background: "#070d19", color: "#ffffff", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <h1 style={{ color: "#ef4444", fontSize: "1.75rem", marginBottom: "8px" }}>Access Denied</h1>
        <p style={{ color: "#64748b", marginBottom: "20px" }}>Only system administrators can access the organization setup configuration.</p>
        <Link href="/dashboard" style={{ background: "#48e5a0", color: "#070d19", textDecoration: "none", padding: "10px 20px", borderRadius: "6px", fontWeight: "600" }}>
          Go to Dashboard
        </Link>
      </div>
    );
  }

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
          <Link href="/organization-setup" className="menu-item active">
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
          <div className="user-avatar">AD</div>
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
            <input type="text" placeholder="Search departments, categories, or employees..." />
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

        {/* Setup Content */}
        <div className="org-setup-content">
          
          {/* Tab buttons and action button */}
          <div className="tab-container">
            <div className="tab-buttons">
              <button className={`tab-btn ${activeTab === "departments" ? "active" : ""}`} onClick={() => setActiveTab("departments")}>
                Departments
              </button>
              <button className={`tab-btn ${activeTab === "categories" ? "active" : ""}`} onClick={() => setActiveTab("categories")}>
                Categories
              </button>
              <button className={`tab-btn ${activeTab === "employees" ? "active" : ""}`} onClick={() => setActiveTab("employees")}>
                Employee Directory
              </button>
            </div>

            {activeTab === "departments" && (
              <button className="add-action-btn" onClick={openAddDept}>
                + Add Department
              </button>
            )}

            {activeTab === "categories" && (
              <button className="add-action-btn" onClick={openAddCat}>
                + Add Category
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", color: "#64748b", padding: "40px" }}>Loading setup information...</div>
          ) : (
            <>
              {/* ── TAB A: Departments Table ── */}
              {activeTab === "departments" && (
                <div className="table-card">
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Department</th>
                          <th>Head of Dept</th>
                          <th>Parent Dept</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departments.map((dept) => (
                          <tr key={dept.id}>
                            <td className="row-title">{dept.name} ({dept.code})</td>
                            <td>
                              <select 
                                className="cell-select"
                                value={dept.head_user_id || ""}
                                onChange={(e) => assignDeptHead(dept.id, e.target.value)}
                              >
                                <option value="">--- Unassigned ---</option>
                                {employees.map(emp => (
                                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                ))}
                              </select>
                            </td>
                            <td>{dept.parent_name || "---"}</td>
                            <td>
                              <span 
                                className={`status-pill ${dept.status === "ACTIVE" ? "active" : "inactive"}`}
                                onClick={() => toggleDeptStatus(dept)}
                              >
                                {dept.status}
                              </span>
                            </td>
                            <td>
                              <button 
                                onClick={() => openEditDept(dept)}
                                style={{ background: "transparent", border: "1px solid #162238", color: "#48e5a0", cursor: "pointer", padding: "6px 12px", borderRadius: "4px", fontSize: "0.8rem" }}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── TAB B: Categories Table ── */}
              {activeTab === "categories" && (
                <div className="table-card">
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Category Name</th>
                          <th>Category Code</th>
                          <th>Custom Fields</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((cat) => (
                          <tr key={cat.id}>
                            <td className="row-title">{cat.name}</td>
                            <td>{cat.code}</td>
                            <td>
                              {cat.customFields && cat.customFields.length > 0 ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                  {cat.customFields.map((f, i) => (
                                    <span key={i} style={{ background: "#162238", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", color: "#94a3b8" }}>
                                      {f.name} ({f.field_type})
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: "#64748b" }}>None</span>
                              )}
                            </td>
                            <td>
                              <span 
                                className={`status-pill ${cat.status === "ACTIVE" ? "active" : "inactive"}`}
                                onClick={() => toggleCatStatus(cat)}
                              >
                                {cat.status}
                              </span>
                            </td>
                            <td>
                              <button 
                                onClick={() => openEditCat(cat)}
                                style={{ background: "transparent", border: "1px solid #162238", color: "#48e5a0", cursor: "pointer", padding: "6px 12px", borderRadius: "4px", fontSize: "0.8rem" }}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── TAB C: Employee Directory Table ── */}
              {activeTab === "employees" && (
                <div className="table-card">
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email Address</th>
                          <th>Department</th>
                          <th>System Role</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((emp) => (
                          <tr key={emp.id}>
                            <td className="row-title">{emp.full_name}</td>
                            <td>{emp.email}</td>
                            <td>
                              <select
                                className="cell-select"
                                value={emp.department_id || ""}
                                onChange={(e) => updateEmpDept(emp.id, e.target.value)}
                              >
                                <option value="">--- No Dept ---</option>
                                {departments.map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select
                                className="cell-select"
                                value={emp.role}
                                onChange={(e) => updateEmpRole(emp.id, e.target.value)}
                              >
                                <option value="EMPLOYEE">Employee</option>
                                <option value="DEPARTMENT_HEAD">Department Head</option>
                                <option value="ASSET_MANAGER">Asset Manager</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                            </td>
                            <td>
                              <span 
                                className={`status-pill ${emp.status === "ACTIVE" ? "active" : "inactive"}`}
                                onClick={() => toggleEmpStatus(emp)}
                              >
                                {emp.status === "ACTIVE" ? "ACTIVE" : "SUSPENDED"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── Departments Add/Edit Modal ── */}
      {showDeptModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <header className="modal-header">
              <h3>{editingDept ? "Edit Department" : "Add Department"}</h3>
              <button className="close-btn" onClick={() => setShowDeptModal(false)}>×</button>
            </header>
            <form onSubmit={saveDept}>
              <div className="modal-body">
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Department Name</label>
                  <input 
                    type="text" 
                    required
                    style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "10px", outline: "none", fontSize: "0.85rem" }}
                    value={deptForm.name} 
                    onChange={e => setDeptForm({...deptForm, name: e.target.value})} 
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Department Code</label>
                  <input 
                    type="text" 
                    required
                    style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "10px", outline: "none", fontSize: "0.85rem" }}
                    value={deptForm.code} 
                    onChange={e => setDeptForm({...deptForm, code: e.target.value})} 
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Description</label>
                  <textarea 
                    style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "10px", outline: "none", fontSize: "0.85rem", resize: "none", height: "80px" }}
                    value={deptForm.description} 
                    onChange={e => setDeptForm({...deptForm, description: e.target.value})} 
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Parent Department</label>
                  <select 
                    className="cell-select"
                    style={{ padding: "10px", width: "100%" }}
                    value={deptForm.parent_department_id} 
                    onChange={e => setDeptForm({...deptForm, parent_department_id: e.target.value})}
                  >
                    <option value="">--- None (Root Level) ---</option>
                    {departments.filter(d => !editingDept || d.id !== editingDept.id).map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <footer className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setShowDeptModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn">Save</button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* ── Categories Add/Edit Modal ── */}
      {showCatModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <header className="modal-header">
              <h3>{editingCat ? "Edit Category" : "Add Category"}</h3>
              <button className="close-btn" onClick={() => setShowCatModal(false)}>×</button>
            </header>
            <form onSubmit={saveCat}>
              <div className="modal-body">
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Category Name</label>
                  <input 
                    type="text" 
                    required
                    style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "10px", outline: "none", fontSize: "0.85rem" }}
                    value={catForm.name} 
                    onChange={e => setCatForm({...catForm, name: e.target.value})} 
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Category Code</label>
                  <input 
                    type="text" 
                    required
                    style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "10px", outline: "none", fontSize: "0.85rem" }}
                    value={catForm.code} 
                    onChange={e => setCatForm({...catForm, code: e.target.value})} 
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "#64748b" }}>Description</label>
                  <textarea 
                    style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "10px", outline: "none", fontSize: "0.85rem", resize: "none", height: "60px" }}
                    value={catForm.description} 
                    onChange={e => setCatForm({...catForm, description: e.target.value})} 
                  />
                </div>

                {/* Custom Fields Builder */}
                <div className="custom-fields-builder">
                  <header className="builder-header">
                    <span>Category Custom Fields</span>
                    <button type="button" className="add-field-btn" onClick={addCustomFieldRow}>
                      + Add Custom Field
                    </button>
                  </header>
                  {customFields.map((field, idx) => (
                    <div className="field-row" key={idx}>
                      <input 
                        type="text" 
                        placeholder="Field Name (e.g. RAM)" 
                        required
                        style={{ background: "#090f1d", border: "1px solid #162238", borderRadius: "6px", color: "#ffffff", padding: "8px", outline: "none", fontSize: "0.8rem" }}
                        value={field.name}
                        onChange={e => updateCustomField(idx, "name", e.target.value)}
                      />
                      <select 
                        className="cell-select"
                        value={field.field_type}
                        onChange={e => updateCustomField(idx, "field_type", e.target.value)}
                      >
                        <option value="TEXT">Text</option>
                        <option value="NUMBER">Number</option>
                        <option value="DATE">Date</option>
                      </select>
                      <button type="button" className="delete-field-btn" onClick={() => deleteCustomField(idx)}>
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <footer className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setShowCatModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn">Save</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
