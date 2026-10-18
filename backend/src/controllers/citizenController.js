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
 * 2. TRACK CITIZEN COMPLAINT STATUS
 */
export const trackReport = async (req, res, next) => {
  try {
    const { trackingId } = req.params;

    const { data, error } = await supabase
      .from('citizen_reports')
      .select('*')
      .eq('tracking_id', trackingId.toUpperCase())
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: `No grievance found with Tracking ID: ${trackingId}`
      });
    }

    // 5-step lifecycle stages
    const STEPS = ['REPORTED', 'VERIFIED', 'TENDER_ISSUED', 'IN_REPAIR', 'RESOLVED'];
    const currentStepIndex = STEPS.indexOf(data.status);

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
        photo_url: photoUrls[0] || data.photo_url,
        photo_urls: photoUrls,
        currentStepIndex: currentStepIndex >= 0 ? currentStepIndex : 0,
        timelineSteps: STEPS
      }
    });
  } catch (error) {
    next(error);
  }
};
