import { supabase } from '../config/db.js';

/**
 * 1. GET ALL TENDERS (With associated bids)
 */
export const getAllTenders = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('tenders')
      .select('*, contractor_bids(*)')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status.toUpperCase());

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. CREATE NEW TENDER (Issued by Municipal Admin)
 */
export const createTender = async (req, res, next) => {
  try {
    const { pothole_id, title, ward, estimated_cost, deadline_hours } = req.body;

    const deadline = new Date(Date.now() + (deadline_hours || 48) * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('tenders')
      .insert([{
        pothole_id,
        title: title || `Emergency Asphalt Patching - ${ward}`,
        ward,
        estimated_cost: parseFloat(estimated_cost),
        deadline,
        status: 'OPEN'
      }])
      .select();

    if (error) throw error;

    // Update corresponding pothole to TENDER_ACTIVE
    if (pothole_id) {
      await supabase
        .from('potholes')
        .update({ status: 'TENDER_ACTIVE' })
        .eq('id', pothole_id);
    }

    res.status(201).json({ success: true, data: data[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. SUBMIT CONTRACTOR BID (From Contractor Mobile Browser)
 */
export const submitBid = async (req, res, next) => {
  try {
    const { id: tender_id } = req.params;
    const { vendor_name, contact_phone, bid_amount, completion_days } = req.body;

    const { data, error } = await supabase
      .from('contractor_bids')
      .insert([{
        tender_id,
        vendor_name,
        contact_phone,
        bid_amount: parseFloat(bid_amount),
        completion_days: parseInt(completion_days, 10),
        status: 'PENDING'
      }])
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Bid successfully registered in Municipal Portal',
      data: data[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. AWARD TENDER TO CONTRACTOR
 */
export const awardTender = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assigned_vendor, awarded_amount, bid_id } = req.body;

    // A) Update tender
    const { data, error } = await supabase
      .from('tenders')
      .update({
        status: 'AWARDED',
        assigned_vendor,
        awarded_amount: parseFloat(awarded_amount)
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    // B) Update bid status to ACCEPTED
    if (bid_id) {
      await supabase
        .from('contractor_bids')
        .update({ status: 'ACCEPTED' })
        .eq('id', bid_id);
    }

    res.json({
      success: true,
      message: `Tender ${id} awarded to ${assigned_vendor}`,
      data: data[0]
    });
  } catch (error) {
    next(error);
  }
};
