# Assest Flow: Enterprise Asset & Resource Management System

Assest Flow is a comprehensive, centralized platform designed to modernize and streamline how organizations manage their assets, resources, departments, and maintenance schedules. 

## 🎯 Purpose and Problem Statement

**The Problem:** In many growing organizations, managing physical assets, coordinating maintenance, auditing inventory, and handling resource bookings are siloed processes. Relying on spreadsheets or fragmented legacy software leads to misplaced assets, double-booked resources, missed maintenance schedules, and a lack of accountability.

**Our Solution:**  Assest Flow bridges these gaps by providing a unified, real-time dashboard that integrates all these operational facets. By bringing organization setup, asset lifecycle management, resource booking, and auditing under one roof, we empower administrators and employees to maintain a single source of truth for all physical and operational assets.

## 🚀 Advantages of Using Assest Flow

- **End-to-End Asset Lifecycle Tracking:** From procurement to allocation, transfer, and eventual retirement, every asset is tracked seamlessly.
- **QR Code Integration:** Built-in QR scanning allows ground staff to instantly verify, audit, or update asset statuses using their mobile devices.
- **Proactive Maintenance:** Schedule and track maintenance tasks to minimize equipment downtime and extend asset lifespans.
- **Conflict-Free Resource Booking:** A streamlined booking system ensures shared resources (like conference rooms or specialized equipment) are utilized efficiently without overlapping reservations.
- **Compliance & Accountability:** Detailed audit logs automatically record who did what and when, ensuring strict compliance and security.
- **Customizable Organization Hierarchy:** Flexibly model your real-world organizational structure (departments, locations, employees) directly in the system.

## ⚙️ Tech Stack

This project is built using a modern, robust, and scalable technology stack:

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Library:** [React 19](https://react.dev/)
- **Styling:**  [Sass](https://sass-lang.com/) for granular component styling.
- **UI Components & Utilities:** `react-toastify` for notifications, `html5-qrcode` for native barcode and QR code scanning.

### Backend & Database
- **API Engine:** Next.js Route Handlers (Serverless APIs)
- **Database:** [PostgreSQL](https://www.postgresql.org/) (interfaced natively via `pg` node-postgres).
- **Authentication & Security:** Custom JWT (`jsonwebtoken`) based authentication, password hashing with `bcryptjs`, and robust 2FA support.
- **Communication:** Email services powered by `nodemailer`.

## 🛠️ Key Functionalities

1. **Dashboard & Analytics:** Real-time metrics on asset statuses, upcoming maintenance, and recent allocations.
2. **Organization Setup:** Manage physical locations, departments, asset categories, and employee directories.
3. **Asset Management & Tracking:** Register new assets, generate QR codes, and monitor their condition.
4. **Allocation & Transfers:** Assign assets to specific employees or departments, and track intra-organizational transfers.
5. **Resource Booking:** Calendar-based or list-based booking system for shared organizational resources.
6. **Maintenance & Servicing:** Log repair requests, track maintenance costs, and manage service vendors.
7. **Audit & Compliance:** Conduct periodic physical audits and maintain immutable activity logs for security.
8. **Reporting Engine:** Generate and export comprehensive PDF/CSV reports on asset depreciation, usage, and maintenance costs.
9. **Authentication & Authorization:** Secure login (including Forgot/Reset Password flows), session management, and role-based access control.

## 🏁 Getting Started

First, ensure your PostgreSQL database is running and the `.env` variables are configured appropriately. 

Install the dependencies:

```bash
npm install
```

Initialize the database schema and seed data (if required):

```bash
node scripts/init-db.js
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application in action.
