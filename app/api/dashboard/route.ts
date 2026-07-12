import { NextResponse } from "next/server";
import { query } from "../../../lib/db";

export async function GET(req: Request) {
  try {
    // 1. Fetch dashboard KPIs
    const kpisResult = await query("SELECT * FROM dashboard_kpis LIMIT 1");
    const kpis = kpisResult.rows[0] || {
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

    const activityResult = await query(`
      SELECT a.*, u.full_name as actor_name 
      FROM activity_logs a
      LEFT JOIN users u ON a.actor_user_id = u.id
      ORDER BY a.created_at DESC 
      LIMIT 6
    `);
    const activities = activityResult.rows;

    // 3. Fetch overdue allocations
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
    const overdueReturns = overdueResult.rows;

    // 4. Fetch upcoming return allocations
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
    const upcomingReturns = upcomingResult.rows;

    // 5. Fetch active bookings
    const bookingsResult = await query(`
      SELECT rb.*, a.name as asset_name, a.asset_tag, u.full_name as booked_by_name
      FROM resource_bookings rb
      JOIN assets a ON rb.asset_id = a.id
      LEFT JOIN users u ON rb.booked_by = u.id
      WHERE rb.status IN ('UPCOMING', 'ONGOING')
      ORDER BY rb.start_at ASC
      LIMIT 5
    `);
    const activeBookings = bookingsResult.rows;

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
