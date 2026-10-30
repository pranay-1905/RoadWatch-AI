import { supabase } from '../config/db.js';
import { uploadToSupabaseStorage } from '../config/multer.js';

/**
 * Fallback Location: Priyadarshini College of Engineering (PCE Nagpur)
 * Used whenever the physical GPS sensor is off, disconnected, or has no satellite fix.
 */
export const PCE_NAGPUR = {
  lat: 21.1011,
  lng: 79.0070,
  roadName: 'Priyadarshini College of Engineering (PCE), Hingna Road',
  ward: 'Digdoh Hills (PCE Campus)'
};

/**
 * Helper: Automated Reverse Geocoding (Converts lat, lng to real road & ward name via OpenStreetMap)
 */
const reverseGeocode = async (lat, lng) => {
  try {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

    // Fast-path: If coordinates are at PCE Nagpur campus, return college details directly
    if (Math.abs(lat - PCE_NAGPUR.lat) < 0.005 && Math.abs(lng - PCE_NAGPUR.lng) < 0.005) {
      return {
        roadName: PCE_NAGPUR.roadName,
        ward: PCE_NAGPUR.ward
      };
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'RoadWatch-AI/1.0 (Municipal Pothole Detection System; contact@roadwatch.nmc)'
      },
      signal: AbortSignal.timeout(2500) // 2.5s timeout so edge sync is never blocked
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.address) return null;

    const road = data.address.road || data.address.pedestrian || data.address.suburb || data.address.neighbourhood || 'Surveyed Road Corridor';
    const ward = data.address.suburb || data.address.residential || data.address.city_district || data.address.city || 'Central Zone';
    return {
      roadName: `${road}, near ${ward}`,
      ward
    };
  } catch {
    return null;
  }
};

/**
 * Helper: Sequential Vehicle ID Generator (RW-V1-1001, RW-V1-1002, etc.)
 */
const getNextVehiclePotholeId = async (vehicleId = 'V1') => {
  try {
    const vUpper = (vehicleId || 'V1').toUpperCase();
    const prefix = `RW-${vUpper}-`;
    const { data } = await supabase
      .from('potholes')
      .select('id')
      .ilike('id', `${prefix}%`)
      .order('event_time', { ascending: false, nullsFirst: false })
      .limit(50);

    let maxNum = 1000;
    if (data && data.length > 0) {
      data.forEach(row => {
        if (!row.id) return;
        const parts = row.id.split('-');
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      });
    }
    return maxNum + 1;
  } catch {
    return 1001;
  }
};

/**
 * 1. SYNC EDGE BATCH (Called by Raspberry Pi 3B+ when connecting to Wi-Fi)
 */
export const syncEdgeBatch = async (req, res, next) => {
  try {
    let payload = req.body;
    
    // Parse JSON if sent as form-data string
    if (typeof payload.data === 'string') {
      try {
        payload = JSON.parse(payload.data);
      } catch (e) {
        // use raw body
      }
    }

    const potholesToInsert = Array.isArray(payload) ? payload : [payload];
    
    // Upload image directly to Supabase Storage bucket 'pothole-photos'
    if (req.file) {
      const cloudPhotoUrl = await uploadToSupabaseStorage(req.file, 'edge');
      if (potholesToInsert.length > 0) {
        potholesToInsert[0].image_url = cloudPhotoUrl;
      }
    }

    // Determine Vehicle ID and get sequential starting counter
    const defaultVehicle = payload.vehicle_id || payload.vehicleId || 'V1';
    let currentSeq = await getNextVehiclePotholeId(defaultVehicle);

    // Resolve real road names from GPS coordinates (Reverse Geocoding)
    const sanitized = await Promise.all(potholesToInsert.map(async (item, idx) => {
      const vId = (item.vehicle_id || item.vehicleId || defaultVehicle).toUpperCase();
      const generatedId = `RW-${vId}-${currentSeq + idx}`;
      const isVehicleSequential = item.id && /^RW-V\d+-\d+$/i.test(item.id);
      const finalId = isVehicleSequential || (item.id && item.id.startsWith('RPT-')) ? item.id : generatedId;

      let lat = parseFloat(item.lat);
      let lng = parseFloat(item.lng ?? item.lon);
      let road_name = item.road_name || item.note;
      let ward = item.ward;

      // Check if GPS sensor is NOT working (empty, 0, NaN, or old un-synced default)
      const isSensorNotWorking = !lat || !lng || isNaN(lat) || isNaN(lng) || 
                                (lat === 0 && lng === 0) || 
                                (Math.abs(lat - 21.1458) < 0.001 && Math.abs(lng - 79.0882) < 0.001);

      if (isSensorNotWorking) {
        // Sensor NOT working: Fallback to Priyadarshini College of Engineering (PCE)
        lat = 21.1011;
        lng = 79.0070;
        road_name = road_name || 'Priyadarshini College of Engineering, Hingna Road';
        ward = ward || 'Digdoh Hills';
      } else {
        // Sensor IS WORKING: Use the exact GPS values given by the sensor
        if (!road_name || road_name === 'Nagpur Arterial Road' || road_name === 'West High Court Road' || road_name.includes('Surveyed Road Corridor')) {
          const geo = await reverseGeocode(lat, lng);
          if (geo) {
            road_name = geo.roadName;
            ward = geo.ward || ward;
          } else {
            road_name = item.note || `Surveyed Road Corridor (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
          }
        }
      }

      const scoreVal = item.score !== undefined ? parseFloat(item.score) : (item.confidence !== undefined ? parseFloat(item.confidence) : (item.severity_score !== undefined ? parseFloat(item.severity_score) : null));
      const peakGVal = item.peak_dev_g !== undefined ? parseFloat(item.peak_dev_g) : (item.peak_mg !== undefined ? parseFloat((item.peak_mg / 1000).toFixed(2)) : (item.imuGForce ? parseFloat(item.imuGForce) : null));

      // Severity is directly determined by AI Confidence / Score (0.0 - 1.0 or 0 - 100)
      let rawSev = (item.severity || '').toString().trim().toUpperCase();
      let normalizedSeverity = 'MEDIUM';
      if (scoreVal !== null && !isNaN(scoreVal)) {
        const c = scoreVal > 1 ? scoreVal / 100 : scoreVal;
        if (c >= 0.80) normalizedSeverity = 'HIGH';
        else if (c >= 0.50) normalizedSeverity = 'MEDIUM';
        else normalizedSeverity = 'LOW';
      } else if (rawSev === 'CRITICAL' || rawSev === 'HIGH' || rawSev === 'MEDIUM' || rawSev === 'LOW') {
        normalizedSeverity = rawSev === 'NORMAL' ? 'LOW' : rawSev;
      } else if (peakGVal) {
        normalizedSeverity = peakGVal >= 3.0 ? 'CRITICAL' : (peakGVal >= 2.2 ? 'HIGH' : (peakGVal >= 1.8 ? 'MEDIUM' : 'LOW'));
      }

      return {
        id: finalId,
        road_name: road_name || (isSensorNotWorking ? 'Priyadarshini College of Engineering, Hingna Road' : 'Surveyed Road Corridor'),
        ward: ward || (isSensorNotWorking ? 'Digdoh Hills' : 'Central Zone'),
        lat,
        lng,
        lon: lng,
        severity: normalizedSeverity,
        status: item.status || 'OPEN',
        image_url: item.image_url || null,
        sla_hours: item.severity === 'CRITICAL' ? 24 : item.severity === 'HIGH' ? 48 : 72,
        source: item.source || 'edge_pi',
        event_time: item.date_time || item.datetime || item.event_time || item.timestamp || new Date().toISOString(),
        confidence: scoreVal,
        peak_dev_g: peakGVal,
        peak_mg: item.peak_mg !== undefined ? parseFloat(item.peak_mg) : (peakGVal ? peakGVal * 1000 : null),
        gx_dps: item.gx_dps !== undefined ? parseFloat(item.gx_dps) : null,
        gy_dps: item.gy_dps !== undefined ? parseFloat(item.gy_dps) : null,
        gz_dps: item.gz_dps !== undefined ? parseFloat(item.gz_dps) : null,
        speed_kmh: item.speed_kmh !== undefined ? parseFloat(item.speed_kmh) : (item.speed !== undefined ? parseFloat(item.speed) : (item.speedKmh ? parseFloat(item.speedKmh) : null)),
        note: item.note || null
      };
    }));

    const { data, error } = await supabase
      .from('potholes')
      .upsert(sanitized)
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: `Successfully synchronized ${data.length} potholes from Edge Device`,
      syncedCount: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET ALL POTHOLES (Supports filters by Ward, Severity, Status)
 */
export const getAllPotholes = async (req, res, next) => {
  try {
    const { ward, severity, status } = req.query;
    let query = supabase.from('potholes').select('*').order('event_time', { ascending: false, nullsFirst: false });

    if (ward) query = query.eq('ward', ward);
    if (severity) query = query.eq('severity', severity.toUpperCase());
    if (status) query = query.eq('status', status.toUpperCase());

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET SINGLE POTHOLE DETAILS
 */
export const getPotholeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('potholes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Pothole not found' });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. UPDATE STATUS & SLA (Admin / Inspection Actions)
 */
export const updatePotholeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolved_at } = req.body;

    const normalizedStatus = status.toUpperCase();
    const updates = { status: normalizedStatus };
    if (normalizedStatus === 'RESOLVED') {
      updates.resolved_at = resolved_at || new Date().toISOString();
    }

    // 1. Try updating potholes table
    let { data, error } = await supabase
      .from('potholes')
      .update(updates)
      .eq('id', id)
      .select();

    // 2. If no record was updated in potholes table, check citizen_reports table!
    if (!data || data.length === 0) {
      let citizenStatus = normalizedStatus;
      if (citizenStatus === 'PENDING') citizenStatus = 'VERIFIED';
      if (citizenStatus === 'OPEN') citizenStatus = 'REPORTED';
      if (citizenStatus === 'IN_PROGRESS') citizenStatus = 'IN_REPAIR';

      const citizenUpdates = { status: citizenStatus };
      if (citizenStatus === 'RESOLVED') {
        citizenUpdates.resolved_at = resolved_at || new Date().toISOString();
      }

      const { data: citizenData, error: citizenError } = await supabase
        .from('citizen_reports')
        .update(citizenUpdates)
        .eq('tracking_id', id.toUpperCase())
        .select();

      if (citizenError) throw citizenError;
      data = citizenData;
    }

    if (error) throw error;

    res.json({
      success: true,
      message: `Record ${id} updated to ${status}`,
      data: data && data.length > 0 ? data[0] : null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. CONTRACTOR REPAIR EVIDENCE UPLOAD (Mobile Phone Camera Photo)
 */
export const uploadRepairEvidence = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No repair photo uploaded' });
    }

    // Upload contractor repair proof photo directly to Supabase Storage
    const photoUrl = await uploadToSupabaseStorage(req.file, 'repairs');

    let updatedRecord = null;

    // Check if it's a citizen complaint
    if (id && id.startsWith('RPT-')) {
      const { data: citizenData } = await supabase
        .from('citizen_reports')
        .update({
          status: 'RESOLVED'
        })
        .eq('tracking_id', id)
        .select();
      if (citizenData && citizenData.length > 0) {
        updatedRecord = citizenData[0];
      }
    }

    // Update in potholes table
    const { data: potholeData, error } = await supabase
      .from('potholes')
      .update({
        repair_image_url: photoUrl,
        status: 'RESOLVED',
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) {
      console.warn('[DB UPDATE ERROR]', error.message);
    } else if (potholeData && potholeData.length > 0) {
      updatedRecord = potholeData[0];
    }

    // If record did not exist in potholes table yet, insert it so it persists in DB
    if (!updatedRecord) {
      const { data: insertedPothole } = await supabase
        .from('potholes')
        .upsert([{
          id,
          road_name: req.body.road_name || PCE_NAGPUR.roadName,
          ward: req.body.ward || PCE_NAGPUR.ward,
          lat: parseFloat(req.body.lat) || PCE_NAGPUR.lat,
          lng: parseFloat(req.body.lng) || PCE_NAGPUR.lng,
          severity: 'MEDIUM',
          status: 'RESOLVED',
          repair_image_url: photoUrl,
          resolved_at: new Date().toISOString()
        }])
        .select();
      if (insertedPothole && insertedPothole.length > 0) {
        updatedRecord = insertedPothole[0];
      }
    }

    res.json({
      success: true,
      message: 'Repair evidence uploaded successfully. Marked for NMC Inspection verification.',
      photo_url: photoUrl,
      data: updatedRecord || { id, repair_image_url: photoUrl, status: 'RESOLVED' }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a pothole defect record by ID
 */
export const deletePothole = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Pothole ID is required' });
    }

    const { data, error } = await supabase
      .from('potholes')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.warn('[DB DELETE ERROR]', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    // Also attempt cleanup if it was a citizen report
    if (String(id).startsWith('RPT-')) {
      await supabase.from('citizen_reports').delete().eq('tracking_id', id);
    }

    res.json({
      success: true,
      message: `Pothole ${id} deleted successfully.`,
      deleted: data
    });
  } catch (error) {
    next(error);
  }
};

