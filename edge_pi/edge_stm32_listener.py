"""
RoadWatch AI - Raspberry Pi 3B+ Edge AI & Telemetry Fusion Engine
=============================================================================
Per System Block Diagram (Module 1):
1. Receives real-time IMU shock triggers & GPS coordinates from STM32F411 over UART.
2. Captures road surface imagery via OV5647 Camera (15-pin CSI interface).
3. Executes edge AI inference using YOLOv8 for automated pothole detection.
4. Performs sensor fusion (GPS + IMU + Image + AI Confidence score).
5. Checks network connectivity:
   - YES (Online) -> Uploads immediately to API Gateway (POST /api/potholes/sync).
   - NO (Offline) -> Buffers into local SQLite Queue (potholes.db) for automated sync.
=============================================================================
"""

import os
import sys
import time
import json
import socket
import sqlite3
import subprocess

try:
    import serial
except ImportError:
    serial = None

try:
    import requests
except ImportError:
    requests = None

# Optional YOLOv8 Vision Inference
YOLO_AVAILABLE = False
try:
    from ultralytics import YOLO
    # Loads custom trained pothole weights or default lightweight nano model
    model_path = os.environ.get("YOLO_MODEL_PATH", "yolov8n.pt")
    if os.path.exists(model_path):
        yolo_model = YOLO(model_path)
        YOLO_AVAILABLE = True
        print(f"[AI ENGINE] YOLOv8 model loaded from {model_path}")
    else:
        yolo_model = None
except Exception as e:
    yolo_model = None

# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------
SERIAL_PORT = "/dev/serial0"    # Hardware UART (GPIO 14 TX, GPIO 15 RX)
BAUD_RATE = 115200              # Matches STM32 USART2 baud rate
SQLITE_DB_PATH = "/home/pi/roadwatch/potholes.db"
LOCAL_IMAGES_DIR = "/home/pi/roadwatch/images"
API_GATEWAY_URL = os.environ.get("API_GATEWAY_URL", "https://roadwatch-ai-15g9.onrender.com/api/potholes/sync")
MOCK_SERIAL = os.environ.get("MOCK_SERIAL", "false").lower() == "true"

os.makedirs(LOCAL_IMAGES_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# 1. LOCAL SQLITE QUEUE (Crash-Proof Offline Buffer)
# ---------------------------------------------------------------------------
def init_db():
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

def record_pothole_offline(p_id, road_name, ward, lat, lng, severity, depth_cm, conf, shock_g, speed, img_path, is_synced=0):
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO local_potholes 
        (id, road_name, ward, lat, lng, severity, depth_cm, confidence, peak_dev_g, speed_kmh, local_image_path, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (p_id, road_name, ward, lat, lng, severity, depth_cm, conf, shock_g, speed, img_path, is_synced))
    conn.commit()
    conn.close()

# ---------------------------------------------------------------------------
# 2. OV5647 CAMERA SNAPSHOT CAPTURE (via CSI Ribbon)
# ---------------------------------------------------------------------------
def capture_snapshot(pothole_id):
    filename = f"pothole_{pothole_id}_{int(time.time())}.jpg"
    filepath = os.path.join(LOCAL_IMAGES_DIR, filename)

    # 1. libcamera-still (Bookworm / Bullseye for OV5647 CSI camera)
    cmd_libcamera = ["libcamera-still", "-n", "-t", "150", "--width", "1280", "--height", "720", "-o", filepath]
    # 2. Legacy raspistill
    cmd_raspistill = ["raspistill", "-n", "-t", "150", "-w", "1280", "-h", "720", "-o", filepath]
    # 3. fswebcam fallback
    cmd_fswebcam = ["fswebcam", "-r", "1280x720", "--no-banner", filepath]

    for cmd in [cmd_libcamera, cmd_raspistill, cmd_fswebcam]:
        try:
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=4)
            if res.returncode == 0 and os.path.exists(filepath):
                print(f"[OV5647 CAMERA] Captured snapshot: {filepath}")
                return filepath
        except (subprocess.SubprocessError, FileNotFoundError):
            continue

    # Simulated fallback if running hardware test on bench
    with open(filepath, "wb") as f:
        f.write(b"SIMULATED_ROAD_DEFECT_IMAGE_BYTES")
    print(f"[OV5647 CAMERA] Bench testing fallback image created.")
    return filepath

# ---------------------------------------------------------------------------
# 3. YOLOV8 INFERENCE & SENSOR FUSION
# ---------------------------------------------------------------------------
def run_yolo_inference(image_path, shock_g):
    """Runs YOLOv8 object detection or falls back to IMU shock physics heuristics."""
    if YOLO_AVAILABLE and yolo_model and os.path.exists(image_path):
        try:
            results = yolo_model.predict(image_path, conf=0.4, verbose=False)
            boxes = results[0].boxes
            if len(boxes) > 0:
                best_conf = float(boxes.conf[0].item())
                print(f"[YOLOv8 AI] Pothole detected! Confidence: {best_conf*100:.1f}%")
                return best_conf
        except Exception as e:
            print(f"[YOLOv8 WARNING] Inference error: {e}")

    # Physical shock heuristic based on STM32 MPU-6050 reading
    conf = min(0.96, 0.70 + (shock_g / 10.0))
    return round(conf, 2)

def calculate_severity(shock_g):
    if shock_g >= 3.0:
        return "CRITICAL", 12.5
    elif shock_g >= 2.2:
        return "HIGH", 8.0
    elif shock_g >= 1.8:
        return "MEDIUM", 5.5
    return "LOW", 3.0

# ---------------------------------------------------------------------------
# 4. NETWORK CONNECTIVITY & IMMEDIATE SYNC
# ---------------------------------------------------------------------------
def is_online():
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=2)
        return True
    except OSError:
        return False

def upload_to_gateway(p_id, road, ward, lat, lng, severity, depth, conf, shock_g, speed, img_path):
    if not is_online() or requests is None:
        return False

    payload = {
        "id": p_id,
        "road_name": road,
        "ward": ward,
        "lat": lat,
        "lng": lng,
        "severity": severity,
        "depth_cm": depth,
        "confidence": conf,
        "peak_dev_g": shock_g,
        "speed_kmh": speed,
        "source": "edge_pi"
    }

    try:
        files = {}
        if img_path and os.path.exists(img_path):
            files['photo'] = (os.path.basename(img_path), open(img_path, 'rb'), 'image/jpeg')

        res = requests.post(API_GATEWAY_URL, data={'data': json.dumps(payload)}, files=files if files else None, timeout=8)
        if files and 'photo' in files:
            files['photo'][1].close()

        if res.status_code in [200, 201]:
            print(f"[CLOUD UPLOAD SUCCESS] Pothole {p_id} transmitted immediately via API Gateway!")
            return True
        else:
            print(f"[UPLOAD REJECTED] Status {res.status_code}")
    except Exception as e:
        print(f"[UPLOAD NETWORK ERROR] {e}")

    return False

# ---------------------------------------------------------------------------
# 5. SERIAL TELEMETRY LISTENER & SENSOR FUSION DISPATCH
# ---------------------------------------------------------------------------
def process_telemetry(data):
    p_id = data.get("id", f"RW-NGP-{int(time.time()) % 10000}")
    lat = float(data.get("lat", 21.1458))
    lng = float(data.get("lng", 79.0882))
    shock = float(data.get("shock_g", 2.2))
    speed = float(data.get("speed", 35.0))

    severity, depth_cm = calculate_severity(shock)
    print(f"\n⚡ [STM32 TRIGGER] Shock: {shock:.2f}G | GPS: ({lat:.5f}, {lng:.5f}) | Speed: {speed:.1f} km/h")

    # Step A: Capture image from OV5647 CSI camera
    img_path = capture_snapshot(p_id)

    # Step B: Run YOLOv8 Pothole Detection
    confidence = run_yolo_inference(img_path, shock)

    # Step C: Check Wi-Fi -> Upload to API Gateway (Cloud backend handles Reverse Geocoding)
    uploaded = upload_to_gateway(p_id, None, None, lat, lng, severity, depth_cm, confidence, shock, speed, img_path)

    # Step D: Save to local SQLite (marked synced=1 if uploaded, else synced=0 for retry)
    record_pothole_offline(p_id, "Surveyed Corridor", "Central Zone", lat, lng, severity, depth_cm, confidence, shock, speed, img_path, is_synced=1 if uploaded else 0)

def listen_stm32():
    init_db()
    print("=================================================================")
    print(" 🛣️ RoadWatch AI — Edge Detection Unit (Raspberry Pi 3B+)")
    print(f" Camera: OV5647 via CSI Ribbon Bus")
    print(f" Serial Port: {SERIAL_PORT} @ {BAUD_RATE} Baud (STM32 USART2)")
    print(f" Cloud Gateway: {API_GATEWAY_URL}")
    print("=================================================================")

    if serial is None or MOCK_SERIAL:
        print("[MOCK] Running in simulated telemetry mode (Every 12s)...")
        while True:
            time.sleep(12)
            mock_payload = {
                "id": f"RW-NGP-{int(time.time()) % 10000}",
                "road": "Wardha Road (NH-44)",
                "ward": "Ward 4 Dharampeth",
                "lat": 21.1215,
                "lng": 79.0620,
                "shock_g": 2.45,
                "speed": 38.5
            }
            process_telemetry(mock_payload)
        return

    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1.0)
        ser.flush()
        print(f"[SERIAL] Connected to STM32F411 on {SERIAL_PORT}")
    except Exception as e:
        print(f"[SERIAL ERROR] Failed to connect: {e}")
        return

    while True:
        try:
            if ser.in_waiting > 0:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if line.startswith("{") and line.endswith("}"):
                    try:
                        data = json.loads(line)
                        process_telemetry(data)
                    except json.JSONDecodeError:
                        pass
        except KeyboardInterrupt:
            print("\n[STOPPING] Shutting down listener.")
            break
        except Exception as err:
            time.sleep(1)

if __name__ == "__main__":
    listen_stm32()
