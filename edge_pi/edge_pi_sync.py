"""
RoadWatch AI - Raspberry Pi 3B+ Edge Database & Cloud Sync Service
Runs on Raspberry Pi OS. 
- Records detections into local SQLite (offline).
- Automatically checks for Wi-Fi/Internet connectivity.
- Uploads pending detections & photos to Supabase Cloud PostgreSQL.
"""

import os
import time
import socket
import sqlite3
import requests

# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------
SQLITE_DB_PATH = "/home/pi/roadwatch/potholes.db"
LOCAL_IMAGES_DIR = "/home/pi/roadwatch/images"

# Fill these from your Supabase Dashboard -> Settings -> API
SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_KEY = "your-anon-or-service-role-key"

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
            depth_cm REAL,
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
def record_pothole_offline(pothole_id, road_name, ward, lat, lng, severity, depth_cm, image_path):
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO local_potholes 
        (id, road_name, ward, lat, lng, severity, depth_cm, local_image_path, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (pothole_id, road_name, ward, lat, lng, severity, depth_cm, image_path))
    conn.commit()
    conn.close()
    print(f"[OFFLINE SAVED] Pothole {pothole_id} stored in SQLite. (Pending sync)")

# ---------------------------------------------------------------------------
# 3. INTERNET CONNECTIVITY CHECK
# ---------------------------------------------------------------------------
def is_online():
    try:
        # Check connection to Google DNS or Supabase host
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        return True
    except OSError:
        return False

# ---------------------------------------------------------------------------
# 4. SYNC PENDING RECORDS TO SUPABASE CLOUD
# ---------------------------------------------------------------------------
def sync_to_supabase():
    if not is_online():
        print("[SYNC] Vehicle offline. Waiting for Wi-Fi connection...")
        return

    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, road_name, ward, lat, lng, severity, depth_cm, local_image_path FROM local_potholes WHERE synced = 0")
    pending = cursor.fetchall()

    if not pending:
        print("[SYNC] All local potholes are already synced.")
        conn.close()
        return

    print(f"[SYNC] Online! Found {len(pending)} pending potholes to upload.")

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    for row in pending:
        p_id, road_name, ward, lat, lng, severity, depth, img_path = row
        image_url = None

        # A) Upload image to Supabase Storage if file exists
        if img_path and os.path.exists(img_path):
            file_name = os.path.basename(img_path)
            upload_url = f"{SUPABASE_URL}/storage/v1/object/pothole-photos/edge/{file_name}"
            try:
                with open(img_path, 'rb') as f:
                    upload_res = requests.post(
                        upload_url,
                        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
                        data=f
                    )
                if upload_res.status_code in [200, 201]:
                    image_url = f"{SUPABASE_URL}/storage/v1/object/public/pothole-photos/edge/{file_name}"
            except Exception as e:
                print(f"[IMAGE UPLOAD ERROR] {e}")

        # B) Insert row into Supabase 'potholes' table
        payload = {
            "id": p_id,
            "road_name": road_name,
            "ward": ward,
            "lat": lat,
            "lng": lng,
            "severity": severity,
            "depth_cm": depth,
            "status": "OPEN",
            "image_url": image_url
        }

        try:
            res = requests.post(f"{SUPABASE_URL}/rest/v1/potholes", json=payload, headers=headers)
            if res.status_code in [200, 201]:
                cursor.execute("UPDATE local_potholes SET synced = 1 WHERE id = ?", (p_id,))
                conn.commit()
                print(f"[SYNC SUCCESS] Pothole {p_id} synced to cloud Supabase!")
            else:
                print(f"[SYNC FAILED] Status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[SYNC NETWORK ERROR] {e}")

    conn.close()

# ---------------------------------------------------------------------------
# MAIN LOOP
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    init_local_db()
    print("[ROADWATCH] Edge Sync Daemon started. Running sync check every 15 seconds...")
    while True:
        try:
            sync_to_supabase()
        except Exception as err:
            print(f"[LOOP ERROR] {err}")
        time.sleep(15)
