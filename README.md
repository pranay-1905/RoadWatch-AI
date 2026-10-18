# RoadWatch AI — Nagpur Municipal Corporation (NMC)

Smart Edge Defect Detection, E-Tendering, SLA Tracking, and Contractor Management System.

---

## 📁 Project Architecture

```
pothole_react_dashboard/
├── frontend/             # React + Vite Dashboard (Port 5173)
│   ├── src/              # Components (MNC Admin, Vendor, Citizen, Operations)
│   ├── public/           # Static assets
│   ├── .env              # Supabase Cloud Keys
│   └── package.json      # Frontend dependencies
│
├── backend/              # Node.js + Express API Server (Port 5000)
│   ├── src/
│   │   ├── config/       # Supabase client & Multer photo upload config
│   │   ├── controllers/  # Edge sync, SLA, Tenders, Vendor scoring, Citizen
│   │   ├── routes/       # REST API Endpoints (/api/potholes, /api/tenders, etc.)
│   │   └── middlewares/  # Error handler & validation
│   ├── uploads/          # Disk storage for road photos & contractor repair proof
│   ├── server.js         # Express server entry point
│   ├── .env              # Backend environment variables
│   └── package.json      # Backend dependencies
│
├── edge_pi/              # Raspberry Pi 3B+ Edge Vehicle Scripts
│   ├── edge_pi_sync.py   # Offline SQLite caching & automated cloud sync
│   └── hardware_pin_diagram.png # GPIO wiring guide for Camera + GPS + MPU-6050
│
├── supabase_schema.sql   # PostgreSQL Database Schema & sample Nagpur data
└── package.json          # Root runner scripts
```

---

## 🚀 Quick Start Guide

### 1. Run the Frontend (React Dashboard)
```bash
# Option A: From root directory
npm run dev:frontend

# Option B: From frontend folder
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

### 2. Run the Backend (Node.js Express Server)
```bash
# Option A: From root directory
npm run dev:backend

# Option B: From backend folder
cd backend
npm start
```
API running at **`http://localhost:5000`** (Health check: `http://localhost:5000/api/health`).

---

### 3. Edge Vehicle (Raspberry Pi 3B+)
```bash
cd edge_pi
python3 edge_pi_sync.py
```
Records potholes into local SQLite while driving offline, and pushes to Supabase when connected to Wi-Fi.
