"""
RoadWatch AI - Raspberry Pi 3B+ Edge Database & Cloud Sync Service
Runs on Raspberry Pi OS. 
- Records detections into local SQLite Queue (offline fault tolerance).
- Checks for Wi-Fi / Internet connectivity every 15 seconds.
- Automatically flushes and uploads pending detections & defect photos to 
  API Gateway (POST /api/potholes/sync) on Render, which saves to Supabase Cloud.
"""

import os
import time
import socket
import sqlite3
import requests
import json

# ---------------------------------------------------------------------------
# CONFIGURATION (Per System Block Diagram)
# ---------------------------------------------------------------------------
VEHICLE_ID = os.environ.get("VEHICLE_ID", "V1")  # Survey Patrol Vehicle ID ('V1', 'V2', etc.)
SQLITE_DB_PATH = "/home/pi/roadwatch/potholes.db"
LOCAL_IMAGES_DIR = "/home/pi/roadwatch/images"

# API Gateway on Render (Primary route per Block Diagram module 2)
API_GATEWAY_URL = os.environ.get("API_GATEWAY_URL", "https://roadwatch-ai-15g9.onrender.com/api/potholes/sync")

# Direct Supabase Fallback (if API Gateway is unreachable)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://yifwluotgmnuhyfwwdki.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

os.makedirs(LOCAL_IMAGES_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# 1. INITIALIZE LOCAL SQLITE DATABASE (Crash-Proof, Zero Network Needed)
# ---------------------------------------------------------------------------
def init_local_db():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS local_potholes (
            id TEXT PRIMARY KEY,
            road_name TEXT,
            ward TEXT,
            lat REAL,
            lng REAL,
            severity TEXT,
            confidence REAL DEFAULT 0.88,
            peak_dev_g REAL DEFAULT 2.4,
            speed_kmh REAL DEFAULT 35.0,
            local_image_path TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            synced INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()
    print("[EDGE DB] Local SQLite ready at:", SQLITE_DB_PATH)

# ---------------------------------------------------------------------------
# 2. SAVE DETECTED POTHOLE LOCALLY WHILE OFFLINE
# ---------------------------------------------------------------------------
def record_pothole_offline(pothole_id, road_name, ward, lat, lng, severity, image_path, confidence=0.88, shock_g=2.4, speed=35.0):
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO local_potholes 
        (id, road_name, ward, lat, lng, severity, confidence, peak_dev_g, speed_kmh, local_image_path, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (pothole_id, road_name, ward, lat, lng, severity, confidence, shock_g, speed, image_path))
    conn.commit()
    conn.close()
    print(f"[OFFLINE SAVED] Pothole {pothole_id} buffered in SQLite queue. (Pending sync)")

# ---------------------------------------------------------------------------
# 3. INTERNET CONNECTIVITY CHECK
# ---------------------------------------------------------------------------
def is_online():
    try:
        # Check connection to 8.8.8.8 or Render host
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        return True
    except OSError:
        return False

# ---------------------------------------------------------------------------
# 4. SYNC PENDING RECORDS TO API GATEWAY (POST /api/potholes/sync)
# ---------------------------------------------------------------------------
def sync_to_cloud():
    if not is_online():
        print("[SYNC] Vehicle offline. Buffering in local SQLite queue...")
        return

    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, road_name, ward, lat, lng, severity, confidence, peak_dev_g, speed_kmh, local_image_path 
        FROM local_potholes WHERE synced = 0
    """)
    pending = cursor.fetchall()

    if not pending:
        conn.close()
        return

    print(f"[SYNC] Wi-Fi Online! Uploading {len(pending)} pending potholes to API Gateway...")

    for row in pending:
        p_id, road_name, ward, lat, lng, severity, conf, shock_g, speed, img_path = row

        payload = {
            "id": p_id,
            "vehicle_id": VEHICLE_ID,
            "road_name": road_name,
            "ward": ward,
            "lat": lat,
            "lng": lng,
            "severity": severity,
            "confidence": conf,
            "peak_dev_g": shock_g,
            "speed_kmh": speed,
            "source": "edge_pi"
        }

        success = False

        # Method 1: Upload via Hosted Node.js API Gateway (Block Diagram Module 2)
        try:
            files = {}
            if img_path and os.path.exists(img_path):
                files['photo'] = (os.path.basename(img_path), open(img_path, 'rb'), 'image/jpeg')

            data = {'data': json.dumps(payload)}
            res = requests.post(API_GATEWAY_URL, data=data, files=files if files else None, timeout=12)

            if files and 'photo' in files:
                files['photo'][1].close()

            if res.status_code in [200, 201]:
                cursor.execute("UPDATE local_potholes SET synced = 1 WHERE id = ?", (p_id,))
                conn.commit()
                print(f"[SYNC SUCCESS] Pothole {p_id} uploaded via API Gateway -> Supabase!")
                success = True
            else:
                print(f"[SYNC GATEWAY WARNING] Status {res.status_code}: {res.text[:100]}")
        except Exception as e:
            print(f"[SYNC GATEWAY ERROR] {e}")

        # Method 2: Fallback direct to Supabase if Gateway is temporarily down
        if not success and SUPABASE_KEY:
            try:
                headers = {
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json"
                }
                res = requests.post(f"{SUPABASE_URL}/rest/v1/potholes", json=payload, headers=headers, timeout=8)
                if res.status_code in [200, 201]:
                    cursor.execute("UPDATE local_potholes SET synced = 1 WHERE id = ?", (p_id,))
                    conn.commit()
                    print(f"[SYNC FALLBACK] Pothole {p_id} saved directly to Supabase.")
            except Exception as e:
                print(f"[SYNC FALLBACK ERROR] {e}")

    conn.close()

# ---------------------------------------------------------------------------
# MAIN DAEMON LOOP
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    init_local_db()
    print("=================================================================")
    print(" 🛣️ RoadWatch AI — Edge Sync Daemon (Raspberry Pi 3B+)")
    print(f" Target Gateway: {API_GATEWAY_URL}")
    print(" Running Wi-Fi sync check every 15 seconds...")
    print("=================================================================")
    while True:
        try:
            sync_to_cloud()
        except Exception as err:
            print(f"[DAEMON LOOP ERROR] {err}")
        time.sleep(15)
