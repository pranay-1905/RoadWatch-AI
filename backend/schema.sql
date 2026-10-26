-- =========================================================================
-- RoadWatch AI - Complete Supabase PostgreSQL Schema
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- =========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. POTHOLES TABLE (Synchronized from Raspberry Pi 3B+ Edge AI & Field Patrols)
CREATE TABLE IF NOT EXISTS public.potholes (
    id TEXT PRIMARY KEY DEFAULT ('RW-' || floor(random() * 900000 + 100000)::text),
    road_name TEXT DEFAULT 'Nagpur Surveyed Corridor',
    ward TEXT DEFAULT 'Central Zone',
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    severity TEXT DEFAULT 'MEDIUM',
    status TEXT NOT NULL DEFAULT 'OPEN',
    image_url TEXT,                           -- Supabase bucket URL or edge photo path
    repair_image_url TEXT,                    -- Contractor completion verification photo
    sla_hours INTEGER DEFAULT 48,
    source TEXT DEFAULT 'edge_pi',            -- 'edge_pi', 'manual', 'citizen'
    event_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confidence REAL DEFAULT 0.92,             -- AI confidence (e.g. 0.94)
    peak_dev_g REAL DEFAULT 2.4,              -- IMU Peak G-Force deviation
    peak_mg REAL DEFAULT 2400.0,
    ax REAL,
    ay REAL,
    az REAL,
    gx_dps REAL,                              -- Gyroscope X (deg/sec)
    gy_dps REAL,                              -- Gyroscope Y (deg/sec)
    gz_dps REAL,                              -- Gyroscope Z (deg/sec)
    speed_kmh REAL DEFAULT 30.0,              -- Vehicle speed at detection
    gps_fix INTEGER DEFAULT 1,
    imu_ok INTEGER DEFAULT 1,
    note TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 3. TENDERS & CONTRACTOR ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.tenders (
    id TEXT PRIMARY KEY DEFAULT ('TND-' || UPPER(SUBSTRING(uuid_generate_v4()::TEXT, 1, 8))),
    pothole_id TEXT REFERENCES public.potholes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    ward TEXT NOT NULL,
    estimated_cost NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'BIDDING_CLOSED', 'AWARDED', 'COMPLETED')),
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    assigned_vendor TEXT,
    awarded_amount NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CONTRACTOR BIDS TABLE (Submitted from Contractor Mobiles)
CREATE TABLE IF NOT EXISTS public.contractor_bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id TEXT REFERENCES public.tenders(id) ON DELETE CASCADE,
    vendor_name TEXT NOT NULL,
    contact_phone TEXT,
    bid_amount NUMERIC NOT NULL,
    completion_days INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. CITIZEN COMPLAINTS / REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.citizen_reports (
    tracking_id TEXT PRIMARY KEY,             -- e.g. 'RPT-2026-4421'
    landmark TEXT NOT NULL,
    ward TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    citizen_phone TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'REPORTED' CHECK (status IN ('REPORTED', 'VERIFIED', 'TENDER_ISSUED', 'IN_REPAIR', 'RESOLVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ENABLE ROW LEVEL SECURITY (RLS) FOR SAFE PUBLIC ACCESS
ALTER TABLE public.potholes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_reports ENABLE ROW LEVEL SECURITY;

-- Allow public read & write for dashboard demo
CREATE POLICY "Public Read Potholes" ON public.potholes FOR SELECT USING (true);
CREATE POLICY "Public Insert Potholes" ON public.potholes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Potholes" ON public.potholes FOR UPDATE USING (true);

CREATE POLICY "Public Read Tenders" ON public.tenders FOR SELECT USING (true);
CREATE POLICY "Public Insert Tenders" ON public.tenders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Tenders" ON public.tenders FOR UPDATE USING (true);

CREATE POLICY "Public Read Bids" ON public.contractor_bids FOR SELECT USING (true);
CREATE POLICY "Public Insert Bids" ON public.contractor_bids FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Citizen" ON public.citizen_reports FOR SELECT USING (true);
CREATE POLICY "Public Insert Citizen" ON public.citizen_reports FOR INSERT WITH CHECK (true);

-- 7. STORAGE BUCKET FOR ROAD DAMAGE PHOTOS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pothole-photos', 'pothole-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Storage Access" ON storage.objects
FOR ALL USING (bucket_id = 'pothole-photos')
WITH CHECK (bucket_id = 'pothole-photos');

-- 8. INITIAL SEED DATA FOR NAGPUR (DEMO RECORDS)
INSERT INTO public.potholes (id, road_name, ward, lat, lng, severity, status, image_url, sla_hours)
VALUES 
  ('NMC-2026-0941', 'Wardha Road - Airport Flyover', 'Dharampeth (Ward 2)', 21.1458, 79.0882, 'CRITICAL', 'OPEN', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop', 24),
  ('NMC-2026-0942', 'Central Avenue - Gandhibagh', 'Gandhibagh (Ward 4)', 21.1524, 79.1121, 'HIGH', 'TENDER_ACTIVE', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&auto=format&fit=crop', 48),
  ('NMC-2026-0943', 'Amravati Road - University Gate', 'Dharampeth (Ward 2)', 21.1399, 79.0521, 'MEDIUM', 'IN_PROGRESS', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop', 72)
ON CONFLICT (id) DO NOTHING;
