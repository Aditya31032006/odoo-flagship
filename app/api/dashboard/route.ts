import { NextResponse } from "next/server";
import { query } from "../../../lib/db";

export async function GET(req: Request) {
  try {
    // 1. Identify logged in user details via headers
    const headerUserId = req.headers.get("x-user-id");
    
    let role = "EMPLOYEE";
    let departmentId = null;
    let userId = null;

    if (headerUserId) {
      const userRes = await query("SELECT id, role, department_id FROM users WHERE id = $1", [headerUserId]);
      if (userRes.rows.length > 0) {
        const userObj = userRes.rows[0];
        role = userObj.role || "EMPLOYEE";
        departmentId = userObj.department_id;
        userId = userObj.id;
      }
    }

    let kpis = {
      assets_available: "0",
      assets_allocated: "0",
      assets_reserved: "0",
      assets_under_maintenance: "0",
      assets_lost: "0",
      assets_retired: "0",
      assets_disposed: "0",
      maintenance_today: "0",
      active_bookings: "0",
      pending_transfers: "0",
      upcoming_returns: "0",
      overdue_returns: "0"
    };

    let activities: any[] = [];
    let overdueReturns: any[] = [];
    let upcomingReturns: any[] = [];
    let activeBookings: any[] = [];

    if (role === "ADMIN" || role === "ASSET_MANAGER") {
      // --- Admin / Asset Manager: Org-wide data ---
      const kpisResult = await query("SELECT * FROM dashboard_kpis LIMIT 1");
      if (kpisResult.rows.length > 0) {
        kpis = kpisResult.rows[0];
      }

      const activityResult = await query(`
        SELECT a.*, u.full_name as actor_name 
        FROM activity_logs a
        LEFT JOIN users u ON a.actor_user_id = u.id
        ORDER BY a.created_at DESC 
        LIMIT 6
      `);
      activities = activityResult.rows;

      const overdueResult = await query(`
        SELECT aa.*, a.name as asset_name, a.asset_tag, u.full_name as employee_name
        FROM asset_allocations aa
        JOIN assets a ON aa.asset_id = a.id
        LEFT JOIN users u ON aa.employee_id = u.id
        WHERE aa.status IN ('ACTIVE', 'RETURN_REQUESTED', 'TRANSFER_REQUESTED')
          AND aa.expected_return_date < CURRENT_DATE
        ORDER BY aa.expected_return_date ASC
        LIMIT 5
      `);
      overdueReturns = overdueResult.rows;

      const upcomingResult = await query(`
        SELECT aa.*, a.name as asset_name, a.asset_tag, u.full_name as employee_name
        FROM asset_allocations aa
        JOIN assets a ON aa.asset_id = a.id
        LEFT JOIN users u ON aa.employee_id = u.id
        WHERE aa.status = 'ACTIVE'
          AND aa.expected_return_date >= CURRENT_DATE
        ORDER BY aa.expected_return_date ASC
        LIMIT 5
      `);
      upcomingReturns = upcomingResult.rows;

      const bookingsResult = await query(`
        SELECT rb.*, a.name as asset_name, a.asset_tag, u.full_name as booked_by_name
        FROM resource_bookings rb
        JOIN assets a ON rb.asset_id = a.id
        LEFT JOIN users u ON rb.booked_by = u.id
        WHERE rb.status IN ('UPCOMING', 'ONGOING')
        ORDER BY rb.start_at ASC
        LIMIT 5
      `);
      activeBookings = bookingsResult.rows;

    } else if (role === "DEPARTMENT_HEAD" && departmentId) {
      // --- Department Head: Department-specific data ---
      const availCount = await query("SELECT COUNT(*) FROM assets WHERE current_status = 'AVAILABLE' AND department_id = $1", [departmentId]);
      const allocCount = await query("SELECT COUNT(*) FROM assets WHERE current_status = 'ALLOCATED' AND department_id = $1", [departmentId]);
      const maintCount = await query("SELECT COUNT(*) FROM assets WHERE current_status = 'UNDER_MAINTENANCE' AND department_id = $1", [departmentId]);
      const bookingsCount = await query(`
        SELECT COUNT(rb.id) 
        FROM resource_bookings rb 
        JOIN assets a ON rb.asset_id = a.id 
        WHERE rb.status IN ('UPCOMING', 'ONGOING') AND a.department_id = $1`, [departmentId]);
      const transfersCount = await query(`
        SELECT COUNT(atr.id) 
        FROM asset_transfer_requests atr 
        JOIN asset_allocations aa ON atr.allocation_id = aa.id 
        WHERE atr.status = 'REQUESTED' AND (aa.department_id = $1 OR atr.to_department_id = $1)`, [departmentId]);

      kpis = {
        ...kpis,
        assets_available: availCount.rows[0].count,
        assets_allocated: allocCount.rows[0].count,
        assets_under_maintenance: maintCount.rows[0].count,
        active_bookings: bookingsCount.rows[0].count,
        pending_transfers: transfersCount.rows[0].count
      };

      const activityResult = await query(`
        SELECT a.*, u.full_name as actor_name 
        FROM activity_logs a
        LEFT JOIN users u ON a.actor_user_id = u.id
        WHERE u.department_id = $1
        ORDER BY a.created_at DESC 
        LIMIT 6
      `, [departmentId]);
      activities = activityResult.rows;

      const overdueResult = await query(`
        SELECT aa.*, a.name as asset_name, a.asset_tag, u.full_name as employee_name
        FROM asset_allocations aa
        JOIN assets a ON aa.asset_id = a.id
        LEFT JOIN users u ON aa.employee_id = u.id
        WHERE aa.status IN ('ACTIVE', 'RETURN_REQUESTED', 'TRANSFER_REQUESTED')
          AND aa.expected_return_date < CURRENT_DATE
          AND (aa.department_id = $1 OR u.department_id = $1)
        ORDER BY aa.expected_return_date ASC
        LIMIT 5
      `, [departmentId]);
      overdueReturns = overdueResult.rows;

      const upcomingResult = await query(`
        SELECT aa.*, a.name as asset_name, a.asset_tag, u.full_name as employee_name
        FROM asset_allocations aa
        JOIN assets a ON aa.asset_id = a.id
        LEFT JOIN users u ON aa.employee_id = u.id
        WHERE aa.status = 'ACTIVE'
          AND aa.expected_return_date >= CURRENT_DATE
          AND (aa.department_id = $1 OR u.department_id = $1)
        ORDER BY aa.expected_return_date ASC
        LIMIT 5
      `, [departmentId]);
      upcomingReturns = upcomingResult.rows;

      const bookingsResult = await query(`
        SELECT rb.*, a.name as asset_name, a.asset_tag, u.full_name as booked_by_name
        FROM resource_bookings rb
        JOIN assets a ON rb.asset_id = a.id
        LEFT JOIN users u ON rb.booked_by = u.id
        WHERE rb.status IN ('UPCOMING', 'ONGOING')
          AND (a.department_id = $1 OR rb.created_for_department_id = $1)
        ORDER BY rb.start_at ASC
        LIMIT 5
      `, [departmentId]);
      activeBookings = bookingsResult.rows;

    } else {
      // --- Employee: Personal/Individual data ---
      const availCount = await query("SELECT COUNT(*) FROM assets WHERE current_status = 'AVAILABLE'");
      const allocCount = await query(`
        SELECT COUNT(*) FROM asset_allocations 
        WHERE employee_id = $1 AND status IN ('ACTIVE', 'RETURN_REQUESTED', 'TRANSFER_REQUESTED')`, [userId]);
      const bookingsCount = await query(`
        SELECT COUNT(*) FROM resource_bookings 
        WHERE booked_by = $1 AND status IN ('UPCOMING', 'ONGOING')`, [userId]);
      const transfersCount = await query(`
        SELECT COUNT(*) FROM asset_transfer_requests 
        WHERE requested_by = $1 AND status = 'REQUESTED'`, [userId]);

      kpis = {
        ...kpis,
        assets_available: availCount.rows[0].count,
        assets_allocated: allocCount.rows[0].count,
        active_bookings: bookingsCount.rows[0].count,
        pending_transfers: transfersCount.rows[0].count
      };

      const activityResult = await query(`
        SELECT a.*, u.full_name as actor_name 
        FROM activity_logs a
        LEFT JOIN users u ON a.actor_user_id = u.id
        WHERE a.actor_user_id = $1
        ORDER BY a.created_at DESC 
        LIMIT 6
      `, [userId]);
      activities = activityResult.rows;

      const overdueResult = await query(`
        SELECT aa.*, a.name as asset_name, a.asset_tag, u.full_name as employee_name
        FROM asset_allocations aa
        JOIN assets a ON aa.asset_id = a.id
        LEFT JOIN users u ON aa.employee_id = u.id
        WHERE aa.status IN ('ACTIVE', 'RETURN_REQUESTED', 'TRANSFER_REQUESTED')
          AND aa.expected_return_date < CURRENT_DATE
          AND aa.employee_id = $1
        ORDER BY aa.expected_return_date ASC
        LIMIT 5
      `, [userId]);
      overdueReturns = overdueResult.rows;

      const upcomingResult = await query(`
        SELECT aa.*, a.name as asset_name, a.asset_tag, u.full_name as employee_name
        FROM asset_allocations aa
        JOIN assets a ON aa.asset_id = a.id
        LEFT JOIN users u ON aa.employee_id = u.id
        WHERE aa.status = 'ACTIVE'
          AND aa.expected_return_date >= CURRENT_DATE
          AND aa.employee_id = $1
        ORDER BY aa.expected_return_date ASC
        LIMIT 5
      `, [userId]);
      upcomingReturns = upcomingResult.rows;

      const bookingsResult = await query(`
        SELECT rb.*, a.name as asset_name, a.asset_tag, u.full_name as booked_by_name
        FROM resource_bookings rb
        JOIN assets a ON rb.asset_id = a.id
        LEFT JOIN users u ON rb.booked_by = u.id
        WHERE rb.status IN ('UPCOMING', 'ONGOING')
          AND rb.booked_by = $1
        ORDER BY rb.start_at ASC
        LIMIT 5
      `, [userId]);
      activeBookings = bookingsResult.rows;
    }

    return NextResponse.json({
      kpis,
      activities,
      overdueReturns,
      upcomingReturns,
      activeBookings
    }, { status: 200 });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ message: "Internal server error", details: error.message }, { status: 500 });
  }
}
