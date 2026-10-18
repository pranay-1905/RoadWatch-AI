# 🛣️ RoadWatch AI — Smart Municipal Pothole Detection & E-Tendering Platform

[![Live Frontend](https://img.shields.io/badge/Vercel-Live%20App-black?logo=vercel)](https://road-watch-ai-psi.vercel.app)
[![Live Backend](https://img.shields.io/badge/Render-API%20Online-46E3B7?logo=render)](https://roadwatch-ai-15g9.onrender.com/api/health)
[![Database](https://img.shields.io/badge/Supabase-PostgreSQL%20Cloud-3ECF8E?logo=supabase)](https://supabase.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express%20REST-339933?logo=node.js)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An end-to-end Smart Municipal Infrastructure and Road Maintenance System developed for **Nagpur Municipal Corporation (NMC)**. 

RoadWatch AI integrates **Edge IoT Sensors (Raspberry Pi 3B+)**, **AI Computer Vision**, an **Automated E-Tendering Engine**, a **Contractor Bidding & Resolution Workspace**, and a **Public Citizen Grievance Portal** compliant with **IRC:SP:98-2020** bituminous pavement norms.

---

## 🌐 Live Deployments

- **🚀 Live Web Application (Vercel):** [https://road-watch-ai-psi.vercel.app](https://road-watch-ai-psi.vercel.app)
- **⚡ Live REST API Service (Render):** [https://roadwatch-ai-15g9.onrender.com/api/health](https://roadwatch-ai-15g9.onrender.com/api/health)
- **🛰️ Cloud Database & Storage:** Supabase PostgreSQL & Cloud Buckets
- **📦 GitHub Repository:** [https://github.com/pranay-1905/RoadWatch-AI](https://github.com/pranay-1905/RoadWatch-AI)

---

## 🌟 Key Features

### 🏛️ 1. Municipal Authority (MNC) Command Center
- **Executive KPI Dashboard:** Real-time metrics for total potholes, critical severity hazards, active contractor tenders, and verified completed repairs.
- **Interactive Spatial GPS Route Map:** Built on Leaflet.js with live vehicle telemetry playback scrubber, route simulation, and coordinate geotagging.
- **Road Damage Inventory Register:** Comprehensive catalog of audited road defects with multi-criteria filters (Severity, Status, SLA Urgency) and CSV export for Microsoft Excel.
- **Official NMC Audit Dossier & PDF Print Engine:** Pixel-perfect printable inspection certificates and municipal work dossiers formatted per Indian Road Congress norms (`IRC:SP:98-2020`).
- **Contractor & Vendor Master Registry:** Vendor rating, accreditation class (PWD Class-1 / Class-2), active work limits, SLA audit scores, and financial disbursement tracking.

### 👷 2. Contractor & Vendor Resolution Portal
- **Live Tender Marketplace:** Browse open tenders dispatched by municipal engineers, inspect defect dimensions, and submit competitive quotation bids.
- **Active Contracts Workspace:** Track assigned resurfacing milestones, target completion dates, and SLA countdowns.
- **Geotagged Photo Evidence Submission:** High-tech HUD viewfinder simulation for uploading hot-mix asphalt compaction proofs, vibratory roller finishes, and perimeter seal geotags.
- **Payouts & Milestone Invoicing:** Track approved quality audits and automated voucher releases.

### 📢 3. Citizen Grievance & Public Reporting Portal
- **1-Click Public Complaint Lodging:** Citizens can report potholes with photo uploads, GPS coordinates, landmarks, and severity levels.
- **Live Lifecycle Tracking:** 5-stage real-time grievance tracking (`REPORTED` ➔ `VERIFIED` ➔ `TENDER_ISSUED` ➔ `IN_REPAIR` ➔ `RESOLVED`).
- **Offline Fallback Storage:** Caches citizen complaints locally in browser `localStorage` if cellular network connectivity drops.

### ⚡ 4. Operations Center Suite
- **SLA Tracker Matrix:** Live tracking of resolution windows (Critical: 24h, High: 48h, Medium: 72h) with automated overdue alerts.
- **Contractor Scorecards & Leaderboards:** Performance ranking based on speed, turnaround time, and quality verification rate.
- **Monsoon Weather Risk Analytics:** Real-time precipitation rating and road hazard enlargement index.
- **Field Engineer Offline Queue:** Queues road segment audits offline and auto-syncs when online.
- **Floating AI Assistant Chatbot:** Natural language assistant to filter rain-risk defects and bulk-dispatch emergency tenders.

---

## 🏗️ System Architecture

```
                                  ┌────────────────────────┐
                                  │   Raspberry Pi 3B+     │
                                  │   Edge Patrol Vehicle  │
                                  │ (Camera + GPS + IMU)   │
                                  └───────────┬────────────┘
                                              │ Wi-Fi Sync (REST)
                                              ▼
┌────────────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│     Citizen Portal     │       │   Express API Server   │       │   Supabase Cloud DB    │
│  (Mobile Web / Forms)  ├──────►│      (Render.com)      ├──────►│   (PostgreSQL + RLS)   │
└────────────────────────┘       └────────────┬───────────┘       └────────────────────────┘
                                              ▲
┌────────────────────────┐                    │ JSON Data /
│  MNC Admin & Vendor    │                    │ REST Endpoints
│   React Dashboard      ├────────────────────┘
│  (Vercel Production)   │
└────────────────────────┘
```

---

## 📁 Repository Structure

```
pothole_react_dashboard/
├── frontend/                     # React 19 + Vite Web Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/            # Split-screen role login & portals
│   │   │   ├── citizen/         # Public grievance reporting form
│   │   │   ├── layout/          # Sidebar, TopHeader, AI Chatbot
│   │   │   ├── mnc/             # KPI Cards, LiveMap, IncidentFeed, DamageInventory, AnalyticsView
│   │   │   ├── operations/      # SLA Tracker, Vendor Scorecards, Weather Risk
│   │   │   └── vendor/          # Contractor Marketplace, Bidding, Photo Submission
│   │   ├── data/                # Initial Nagpur Zone 4 survey & auth fixtures
│   │   ├── services/            # Frontend API client (VITE_API_BASE_URL dynamic resolver)
│   │   ├── styles/              # Modular Vanilla CSS System
│   │   │   ├── App.css          # Master stylesheet index
│   │   │   ├── layout.css       # Design tokens, typography, header, sidebar
│   │   │   ├── auth.css         # Split login screen styles
│   │   │   ├── vendor.css       # Contractor portal & bidding cards
│   │   │   ├── modal.css        # Inspection HUD & geotag modals
│   │   │   ├── vendorMaster.css # Contractor directory styles
│   │   │   ├── citizen.css      # Citizen grievance portal styling
│   │   │   ├── operations.css   # Operations suite & SLA matrix styles
│   │   │   ├── responsive.css   # Mobile & tablet media query breakpoints
│   │   │   └── print.css        # Official NMC audit dossier print styling
│   │   ├── App.jsx              # Application root state & routing
│   │   └── main.jsx             # React entry point
│   ├── vercel.json              # Vercel SPA client-side routing rewrites
│   └── package.json             # Frontend dependencies (React, Leaflet, Chart.js)
│
├── backend/                      # Node.js + Express REST API Server
│   ├── src/
│   │   ├── config/              # Supabase Client & Multer photo upload
│   │   ├── controllers/         # Potholes, Tenders, Vendors, Citizen controllers
│   │   ├── routes/              # Express API route declarations
│   │   └── middlewares/         # Global error handler & request validation
│   ├── schema.sql               # PostgreSQL schema & RLS security policies
│   ├── server.js                # Express application entry point
│   └── package.json             # Backend dependencies (Express, Multer, Supabase-js)
│
├── edge_pi/                      # IoT Hardware Edge Scripts
│   ├── edge_pi_sync.py          # Offline SQLite caching & automated cloud sync
│   └── hardware_pin_diagram.png # GPIO pinout diagram for Camera + GPS + MPU-6050
│
├── .gitignore                   # Multi-tier ignore rules (protects .env & secrets)
└── README.md                    # Project documentation
```

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19, Vite 8 |
| **Styling** | Modular Vanilla CSS (9 Specialized Stylesheets, Off-White Municipal Theme) |
| **Maps & Visualization** | Leaflet.js, React-Leaflet, Chart.js, React-Chartjs-2 |
| **Icons & Typography** | Lucide-React, Inter Font Family |
| **Backend Framework** | Node.js, Express.js |
| **Database & Cloud Storage** | Supabase (PostgreSQL 15, Row Level Security, Object Storage) |
| **File Uploads** | Multer, Multipart Form-Data |
| **Deployment & Hosting** | Vercel (Frontend SPA), Render (Backend Web Service) |
| **IoT Edge Hardware** | Raspberry Pi 3B+, Pi Camera v2, NEO-6M GPS, MPU-6050 IMU |

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm or yarn
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/pranay-1905/RoadWatch-AI.git
cd RoadWatch-AI
```

### 2. Configure Backend
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder:
```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-or-anon-key
UPLOAD_DIR=./uploads
```

Start the backend server:
```bash
npm start
```
*Backend runs on `http://localhost:5000` (Health check: `http://localhost:5000/api/health`).*

---

### 3. Configure Frontend
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🔑 Demo Credentials

| Role | Username / Email | Password | Access Area |
| :--- | :--- | :--- | :--- |
| **MNC Municipal Executive** | `admin@nmc.gov.in` | `admin123` | Full Municipal Command Center |
| **Road Contractor / Vendor** | `vendor@apex.com` | `vendor123` | Bidding & Proof Submission Portal |
| **Public Citizen** | *1-Click Access* | *No Auth* | Public Grievance Form & Tracking |

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Server status & Supabase connectivity check |
| `GET` | `/api/potholes` | Fetch road defects with optional filters |
| `POST`| `/api/potholes/sync-edge` | Ingest edge batch telemetry from Raspberry Pi |
| `GET` | `/api/tenders` | List open municipal tenders & bidding state |
| `POST`| `/api/tenders` | Issue a new resurfacing e-tender |
| `POST`| `/api/tenders/:id/bid` | Submit contractor quotation bid |
| `GET` | `/api/citizen/reports` | Retrieve citizen grievances |
| `POST`| `/api/citizen/report` | Submit citizen report with multi-photo evidence |
| `GET` | `/api/citizen/track/:id` | Real-time status tracking by Tracking ID |

---

## 📜 Indian Road Congress Compliance

RoadWatch AI adheres to standard municipal specifications:
- **IRC:SP:98-2020:** Guidelines for maintenance, resurfacing, and patch repair of bituminous pavements.
- **SLA Escalation Protocol:**
  - `CRITICAL` (>10cm depth, heavy traffic): 24-hour repair window
  - `HIGH` (Rainfall prone, arterial): 48-hour repair window
  - `MEDIUM` / `LOW` (Residential): 72-hour repair window

---

## 👨‍💻 Author

**Pranay Chikankar**
- GitHub: [@pranay-1905](https://github.com/pranay-1905)
- Project Repository: [RoadWatch-AI](https://github.com/pranay-1905/RoadWatch-AI)

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
