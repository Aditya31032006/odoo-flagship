"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/dashboard.scss";
import "../../styles/resource-booking.scss";

// Interfaces
interface BookableResource {
  id: string;
  name: string;
  asset_tag: string;
  current_status: string;
}

interface DropdownDepartment {
  id: string;
  name: string;
}

interface BookingRecord {
  id: string;
  title: string;
  purpose: string;
  start_at: string;
  end_at: string;
  status: string;
  booked_by_name: string;
  department_name: string | null;
}

export default function ResourceBooking() {
  const router = useRouter();

  // Auth States
  const [currentUser, setCurrentUser] = useState<{ fullName: string; role: string } | null>(null);

  // Setup options
  const [resources, setResources] = useState<BookableResource[]>([]);
  const [departments, setDepartments] = useState<DropdownDepartment[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected state
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Booking Modal
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookForm, setBookForm] = useState({
    title: "",
    purpose: "",
    startHour: "09:00",
    endHour: "10:00",
    createdForType: "EMPLOYEE" as "EMPLOYEE" | "DEPARTMENT",
    createdForDepartmentId: "",
    reminderMinutesBefore: "30"
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
        const res = await fetch("/api/resource-booking?dropdowns=true");
        if (!res.ok) throw new Error("Failed to load bookable setups");
        const data = await res.json();
        setResources(data.assets || []);
        setDepartments(data.departments || []);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSetup();
  }, []);

  // Fetch bookings list for selected asset & day
  const fetchBookingsList = async () => {
    if (!selectedAssetId || !selectedDate) return;
    try {
      setLoadingBookings(true);
      const res = await fetch(`/api/resource-booking?assetId=${selectedAssetId}&date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to load booking schedule");
      const data = await res.json();
      setBookings(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchBookingsList();
  }, [selectedAssetId, selectedDate]);

  const handleLogout = () => {
    document.cookie = "accessToken=; Max-Age=0; path=/";
    toast.success("Logged out successfully");
    setTimeout(() => {
      router.push("/login");
    }, 1000);
  };

  // Submit slot booking
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Build ISO Date Time strings
      const startDateTime = `${selectedDate}T${bookForm.startHour}:00`;
      const endDateTime = `${selectedDate}T${bookForm.endHour}:00`;

      if (new Date(startDateTime) >= new Date(endDateTime)) {
        toast.error("Start time must be before end time");
        return;
      }

      const payload = {
        assetId: selectedAssetId,
        title: bookForm.title,
        purpose: bookForm.purpose,
        startAt: startDateTime,
        endAt: endDateTime,
        createdForType: bookForm.createdForType,
        createdForDepartmentId: bookForm.createdForType === "DEPARTMENT" ? bookForm.createdForDepartmentId : undefined,
        reminderMinutesBefore: parseInt(bookForm.reminderMinutesBefore, 10)
      };

      const res = await fetch("/api/resource-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Booking rejected");
      }

      toast.success("Slot booked successfully!");
      setShowBookModal(false);
      // Reset form
      setBookForm({
        title: "",
        purpose: "",
        startHour: "09:00",
        endHour: "10:00",
        createdForType: "EMPLOYEE",
        createdForDepartmentId: "",
        reminderMinutesBefore: "30"
      });
      fetchBookingsList();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Cancel Booking
  const handleCancelBooking = async (bookingId: string) => {
    const reason = prompt("Please enter the reason for cancelling this booking:");
    if (reason === null) return; // cancelled prompt

    try {
      const res = await fetch("/api/resource-booking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, reason: reason || "User request" })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to cancel reservation");
      }

      toast.success("Reservation cancelled successfully");
      fetchBookingsList();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Helper formatting values
  const getHourText = (dateStr: string) => {
    const d = new Date(dateStr);
    const hour = d.getHours();
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedHour} ${ampm}`;
  };

  const getHourNumber = (dateStr: string) => {
    return new Date(dateStr).getHours();
  };

  // Helper: check if a booking overlaps a specific hour slot (e.g. 9:00, 10:00, 11:00, 12:00, 1:00)
  const getBookingsForHour = (hour: number) => {
    return bookings.filter(b => {
      const startH = getHourNumber(b.start_at);
      const endH = getHourNumber(b.end_at);
      return startH <= hour && endH > hour;
    });
  };

  // Helper: check if a user is trying to input a conflicting time slot (mock validation visual conflict)
  const isTimeOverlapping = (shStr: string, ehStr: string) => {
    const sH = parseInt(shStr.split(":")[0], 10);
    const eH = parseInt(ehStr.split(":")[0], 10);

    return bookings.some(b => {
      const bSH = getHourNumber(b.start_at);
      const bEH = getHourNumber(b.end_at);
      return sH < bEH && eH > bSH;
    });
  };

  const showConflictOverlay = showBookModal && isTimeOverlapping(bookForm.startHour, bookForm.endHour);

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
          <Link href="/resource-booking" className="menu-item active">
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
            <input type="text" placeholder="Lookup calendar invites or bookings..." disabled />
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
        <div className="booking-content">
          {loading ? (
            <div style={{ color: "#64748b" }}>Loading bookable resources...</div>
          ) : (
            <div className="booking-card">
              <header className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2>Resource Booking</h2>
                  <p>Reserve bookable assets such as meeting rooms, vehicles, or equipment.</p>
                </div>
                {selectedAssetId && (
                  <button className="add-action-btn" onClick={() => setShowBookModal(true)}>
                    Book a slot
                  </button>
                )}
              </header>

              {/* Resource & Date Selection */}
              <div className="selection-row">
                <div className="form-group" style={{ marginBottom: "0" }}>
                  <label>Shared Resource</label>
                  <select
                    className="select-input"
                    value={selectedAssetId}
                    onChange={e => setSelectedAssetId(e.target.value)}
                  >
                    <option value="">-- Choose Bookable Asset --</option>
                    {resources.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.asset_tag} — {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: "0" }}>
                  <label>Booking Date</label>
                  <input
                    type="date"
                    className="text-input"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>

              {selectedAssetId ? (
                loadingBookings ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Fetching schedules...</div>
                ) : (
                  <>
                    {/* Hourly timeline calendar */}
                    <div className="calendar-timeline">
                      
                      {/* Hour slots: 9 AM to 1 PM (or 13:00) */}
                      {[9, 10, 11, 12, 13].map((hour) => {
                        const labelText = hour === 12 ? "12:00 PM" : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;
                        const slotBookings = getBookingsForHour(hour);

                        return (
                          <div className="timeline-hour-row" key={hour}>
                            <div className="hour-label">{labelText}</div>
                            <div className="hour-slots-container">
                              {slotBookings.length === 0 ? (
                                <span style={{ color: "#64748b", fontSize: "0.8rem", fontStyle: "italic" }}>No active bookings</span>
                              ) : (
                                slotBookings.map((b) => (
                                  <div className="booking-block-card" key={b.id}>
                                    <div className="booking-info">
                                      <span className="booking-title">{b.title} — {b.purpose}</span>
                                      <span className="booking-meta">
                                        Reserved by <strong>{b.booked_by_name}</strong> {b.department_name ? `(${b.department_name})` : ""} from {getHourText(b.start_at)} to {getHourText(b.end_at)}
                                      </span>
                                    </div>
                                    {currentUser && (
                                      <button className="cancel-booking-btn" onClick={() => handleCancelBooking(b.id)}>
                                        Cancel Booking
                                      </button>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )
              ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b", border: "1px dashed #162238", borderRadius: "8px" }}>
                  Please select a shared bookable asset to view its timeline schedule.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Booking Modal dialog ── */}
      {showBookModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "500px" }}>
            <header className="modal-header">
              <h3>Book a Slot</h3>
              <button className="close-btn" onClick={() => setShowBookModal(false)}>×</button>
            </header>
            <form onSubmit={handleBookingSubmit}>
              <div className="modal-body">
                
                <div className="form-group">
                  <label>Booking Title</label>
                  <input
                    type="text" required
                    className="select-input" style={{ width: "100%", background: "#090f1d" }}
                    placeholder="e.g. Procurement Team Sync"
                    value={bookForm.title}
                    onChange={e => setBookForm({ ...bookForm, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Purpose</label>
                  <input
                    type="text" required
                    className="select-input" style={{ width: "100%", background: "#090f1d" }}
                    placeholder="e.g. Project Review meeting"
                    value={bookForm.purpose}
                    onChange={e => setBookForm({ ...bookForm, purpose: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="form-group">
                    <label>Start Hour</label>
                    <select
                      className="cell-select" style={{ padding: "10px" }}
                      value={bookForm.startHour}
                      onChange={e => setBookForm({ ...bookForm, startHour: e.target.value })}
                    >
                      <option value="09:00">09:00 AM</option>
                      <option value="09:30">09:30 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="10:30">10:30 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="11:30">11:30 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="12:30">12:30 PM</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>End Hour</label>
                    <select
                      className="cell-select" style={{ padding: "10px" }}
                      value={bookForm.endHour}
                      onChange={e => setBookForm({ ...bookForm, endHour: e.target.value })}
                    >
                      <option value="09:30">09:30 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="10:30">10:30 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="11:30">11:30 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="12:30">12:30 PM</option>
                      <option value="13:00">01:00 PM</option>
                    </select>
                  </div>
                </div>

                {/* Overlap Warning Block (Mock indicator matching layout screenshot) */}
                {showConflictOverlay && (
                  <div className="booking-conflict-card" style={{ marginBottom: "16px" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Requested {bookForm.startHour} to {bookForm.endHour} - conflict - slot is unavailable</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#94a3b8", cursor: "pointer" }}>
                    <input
                      type="radio" name="bookType" checked={bookForm.createdForType === "EMPLOYEE"}
                      onChange={() => setBookForm({ ...bookForm, createdForType: "EMPLOYEE", createdForDepartmentId: "" })}
                    />
                    Book for Self
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#94a3b8", cursor: "pointer" }}>
                    <input
                      type="radio" name="bookType" checked={bookForm.createdForType === "DEPARTMENT"}
                      onChange={() => setBookForm({ ...bookForm, createdForType: "DEPARTMENT" })}
                    />
                    Book for Department
                  </label>
                </div>

                {bookForm.createdForType === "DEPARTMENT" && (
                  <div className="form-group">
                    <label>Department</label>
                    <select
                      className="cell-select" required style={{ padding: "10px" }}
                      value={bookForm.createdForDepartmentId}
                      onChange={e => setBookForm({ ...bookForm, createdForDepartmentId: e.target.value })}
                    >
                      <option value="">Select Department...</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                )}

              </div>
              <footer className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setShowBookModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={showConflictOverlay}>Book slot</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
