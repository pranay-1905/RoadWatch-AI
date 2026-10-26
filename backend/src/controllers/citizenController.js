import { supabase } from '../config/db.js';
import { uploadToSupabaseStorage } from '../config/multer.js';

export const getCitizenReports = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('citizen_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const enriched = (data || []).map(item => {
      let photoUrls = [];
      if (item.photo_url) {
        if (item.photo_url.startsWith('[') && item.photo_url.endsWith(']')) {
          try { photoUrls = JSON.parse(item.photo_url); } catch { photoUrls = [item.photo_url]; }
        } else if (item.photo_url.includes(';')) {
          photoUrls = item.photo_url.split(';').map(u => u.trim()).filter(Boolean);
        } else {
          photoUrls = [item.photo_url];
        }
      }
      return {
        ...item,
        photo_url: photoUrls[0] || item.photo_url,
        photo_urls: photoUrls
      };
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    next(error);
  }
};

/**
 * 1. CITIZEN SUBMITS COMPLAINT
 */
export const submitReport = async (req, res, next) => {
  try {
    const { landmark, ward, severity, description, citizen_phone } = req.body;
    const tracking_id = (req.body.tracking_id && req.body.tracking_id.trim())
      ? req.body.tracking_id.trim().toUpperCase()
      : `RPT-${Math.floor(100000 + Math.random() * 900000)}`;

    // Upload images directly to Supabase Storage bucket 'pothole-photos'
    let photoUrls = [];
    const filesList = req.files?.photos || (req.files?.photo ? req.files.photo : (req.file ? [req.file] : []));
    if (filesList && filesList.length > 0) {
      photoUrls = await Promise.all(filesList.map(f => uploadToSupabaseStorage(f, 'citizen')));
      photoUrls = photoUrls.filter(Boolean);
    }

    const primaryPhotoUrl = photoUrls[0] || null;
    const allPhotosJoined = photoUrls.length > 0 ? photoUrls.join(';') : null;

    const { data, error } = await supabase
      .from('citizen_reports')
      .insert([{
        tracking_id,
        landmark: landmark || 'Nagpur Public Road',
        ward: ward || 'Dharampeth (Ward 2)',
        severity: severity || 'MEDIUM',
        description,
        photo_url: allPhotosJoined,
        citizen_phone,
        lat: Number(req.body.lat) || null,
        lng: Number(req.body.lng) || null,
        status: 'REPORTED'
      }])
      .select();

    if (error) throw error;

    // Automatically sync into potholes table with id = tracking_id
    // This allows MNC engineers to see it in the main inventory & update its status without RLS restrictions
    try {
      await supabase.from('potholes').upsert([{
        id: tracking_id,
        road_name: landmark || 'Citizen Reported Location',
        ward: ward || 'Dharampeth (Ward 2)',
        severity: (severity || 'MEDIUM').toUpperCase(),
        status: 'OPEN',
        image_url: primaryPhotoUrl,
        source: 'citizen',
        note: description || 'Citizen reported road defect',
        lat: Number(req.body.lat) || null,
        lng: Number(req.body.lng) || null,
        sla_hours: severity?.toUpperCase() === 'CRITICAL' ? 24 : 48
      }]);
    } catch (syncErr) {
      console.warn('[CITIZEN SYNC TO POTHOLES WARNING]', syncErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Citizen grievance registered successfully',
      tracking_id,
      photo_url: primaryPhotoUrl,
      photo_urls: photoUrls,
      data: {
        ...data[0],
        photo_url: primaryPhotoUrl,
        photo_urls: photoUrls
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. TRACK CITIZEN COMPLAINT STATUS (Supports RPT-xxxx, pure numbers, and Pothole IDs like RW-xxxx)
 */
export const trackReport = async (req, res, next) => {
  try {
    let { trackingId } = req.params;
    if (!trackingId) {
      return res.status(400).json({ success: false, message: 'Tracking ID is required' });
    }

    const cleanId = trackingId.trim();
    const cleanIdUpper = cleanId.toUpperCase();
    const prefixedRpt = cleanIdUpper.startsWith('RPT-') ? cleanIdUpper : `RPT-${cleanIdUpper}`;
    const prefixedRw = cleanIdUpper.startsWith('RW-') ? cleanIdUpper : `RW-${cleanIdUpper}`;

    // 1. Check live status in potholes table (where municipal updates are saved)
    const { data: potholeData } = await supabase
      .from('potholes')
      .select('*')
      .or(`id.eq.${cleanIdUpper},id.eq.${prefixedRpt},id.eq.${prefixedRw}`)
      .limit(1)
      .maybeSingle();

    // 2. Query citizen_reports table
    const { data: citizenData } = await supabase
      .from('citizen_reports')
      .select('*')
      .or(`tracking_id.eq.${cleanIdUpper},tracking_id.eq.${prefixedRpt}`)
      .limit(1)
      .maybeSingle();

    let data = null;

    if (potholeData && citizenData) {
      // Merge citizen details with live municipal pothole status!
      data = {
        id: potholeData.id,
        tracking_id: citizenData.tracking_id || potholeData.id,
        landmark: citizenData.landmark || potholeData.road_name,
        ward: citizenData.ward || potholeData.ward,
        severity: potholeData.severity || citizenData.severity,
        description: citizenData.description || potholeData.note,
        photo_url: citizenData.photo_url || potholeData.image_url,
        status: potholeData.status,
        created_at: citizenData.created_at || potholeData.created_at
      };
    } else if (potholeData) {
      data = {
        id: potholeData.id,
        tracking_id: potholeData.id,
        landmark: potholeData.road_name || 'Nagpur Surveyed Route',
        ward: potholeData.ward || 'Central Zone',
        severity: potholeData.severity || 'MEDIUM',
        description: potholeData.note || `Road surface defect audited at ${potholeData.road_name || 'Nagpur'}`,
        photo_url: potholeData.image_url,
        status: potholeData.status,
        created_at: potholeData.event_time || potholeData.created_at
      };
    } else if (citizenData) {
      data = citizenData;
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: `No grievance or road defect found with ID: ${trackingId}`
      });
    }

    // Standardize 5-step lifecycle stages
    // 0: REPORTED, 1: VERIFIED, 2: TENDER_ISSUED, 3: IN_REPAIR, 4: RESOLVED
    const rawStatus = String(data.status || 'REPORTED').toUpperCase();
    let normalizedStatus = 'REPORTED';
    let currentStepIndex = 0;

    if (rawStatus === 'REPORTED' || rawStatus === 'OPEN' || rawStatus.includes('VERIFICATION')) {
      normalizedStatus = 'REPORTED';
      currentStepIndex = 0;
    } else if (rawStatus === 'VERIFIED' || rawStatus === 'PENDING' || rawStatus.includes('INSPECT')) {
      normalizedStatus = 'VERIFIED';
      currentStepIndex = 1;
    } else if (rawStatus === 'TENDER_ISSUED' || rawStatus.includes('TENDER') || rawStatus === 'ASSIGNED') {
      normalizedStatus = 'TENDER_ISSUED';
      currentStepIndex = 2;
    } else if (rawStatus === 'IN_REPAIR' || rawStatus === 'IN_PROGRESS' || rawStatus.includes('REPAIR')) {
      normalizedStatus = 'IN_REPAIR';
      currentStepIndex = 3;
    } else if (rawStatus === 'RESOLVED' || rawStatus === 'COMPLETED') {
      normalizedStatus = 'RESOLVED';
      currentStepIndex = 4;
    }

    const STEPS = ['REPORTED', 'VERIFIED', 'TENDER_ISSUED', 'IN_REPAIR', 'RESOLVED'];

    // Extract photo_urls if stored with separator or json
    let photoUrls = [];
    if (data.photo_url) {
      if (data.photo_url.startsWith('[') && data.photo_url.endsWith(']')) {
        try { photoUrls = JSON.parse(data.photo_url); } catch { photoUrls = [data.photo_url]; }
      } else if (data.photo_url.includes(';')) {
        photoUrls = data.photo_url.split(';').map(u => u.trim()).filter(Boolean);
      } else {
        photoUrls = [data.photo_url];
      }
    }

    res.json({
      success: true,
      data: {
        ...data,
        status: normalizedStatus,
        photo_url: photoUrls[0] || data.photo_url,
        photo_urls: photoUrls,
        currentStepIndex,
        timelineSteps: STEPS
      }
    });
  } catch (error) {
    next(error);
  }
};
