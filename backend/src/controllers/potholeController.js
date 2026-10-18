import { supabase } from '../config/db.js';
import { uploadToSupabaseStorage } from '../config/multer.js';

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

    // Sanitize and format records for Supabase
    const sanitized = potholesToInsert.map(item => ({
      id: item.id || `NMC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      road_name: item.road_name || 'Nagpur Arterial Road',
      ward: item.ward || 'Central Zone',
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lng),
      severity: (item.severity || 'MEDIUM').toUpperCase(),
      depth_cm: parseFloat(item.depth_cm || 5.0),
      status: item.status || 'OPEN',
      image_url: item.image_url || null,
      sla_hours: item.severity === 'CRITICAL' ? 24 : item.severity === 'HIGH' ? 48 : 72,
      source: item.source || 'edge_pi',
      detected_at: item.detected_at || new Date().toISOString(),
      confidence: item.confidence !== undefined ? parseFloat(item.confidence) : null,
      peak_dev_g: item.peak_dev_g !== undefined ? parseFloat(item.peak_dev_g) : (item.imuGForce ? parseFloat(item.imuGForce) : null),
      ax_mg: item.ax_mg !== undefined ? parseInt(item.ax_mg, 10) : null,
      ay_mg: item.ay_mg !== undefined ? parseInt(item.ay_mg, 10) : null,
      az_mg: item.az_mg !== undefined ? parseInt(item.az_mg, 10) : null,
      gx_dps: item.gx_dps !== undefined ? parseFloat(item.gx_dps) : null,
      gy_dps: item.gy_dps !== undefined ? parseFloat(item.gy_dps) : null,
      gz_dps: item.gz_dps !== undefined ? parseFloat(item.gz_dps) : null,
      speed_kmh: item.speed_kmh !== undefined ? parseFloat(item.speed_kmh) : (item.speedKmh ? parseFloat(item.speedKmh) : null)
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
    let query = supabase.from('potholes').select('*').order('created_at', { ascending: false });

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

    const updates = { status: status.toUpperCase() };
    if (status.toUpperCase() === 'RESOLVED') {
      updates.resolved_at = resolved_at || new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('potholes')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      message: `Pothole ${id} updated to ${status}`,
      data: data[0]
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
          road_name: req.body.road_name || 'Nagpur Monitored Road',
          ward: req.body.ward || 'Central Zone',
          lat: parseFloat(req.body.lat) || 21.1458,
          lng: parseFloat(req.body.lng) || 79.0882,
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
