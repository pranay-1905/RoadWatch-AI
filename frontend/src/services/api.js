/**
 * RoadWatch AI - Frontend API Service
 * Communicates with the Node.js / Express backend server.
 * Supports VITE_API_BASE_URL for Vercel & Render production deployment.
 */

// Production (Render backend) or Localhost fallback
export const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '') 
  : `http://${typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost'}:5000`);

const API_BASE = `${BACKEND_URL}/api`;

export const roadWatchApi = {
  // 1. Health check
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return await res.json();
    } catch (err) {
      return { status: 'OFFLINE', error: err.message };
    }
  },

  async getCitizenReports() {
    try {
      const res = await fetch(`${API_BASE}/citizen/reports`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Unable to load citizen reports');
      return { data: json.data || [], error: null };
    } catch (err) {
      return { data: [], error: err };
    }
  },

  // 2. Fetch all potholes
  async getPotholes(filters = {}) {
    try {
      const query = new URLSearchParams(filters).toString();
      const res = await fetch(`${API_BASE}/potholes${query ? `?${query}` : ''}`);
      const json = await res.json();
      return { data: json.data || [], error: null };
    } catch (err) {
      console.warn('[API] Backend unreachable, using local fallback:', err.message);
      return { data: null, error: err };
    }
  },

  // 3. Update Pothole SLA / Status
  async updatePotholeStatus(potholeId, status) {
    try {
      const res = await fetch(`${API_BASE}/potholes/${potholeId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      return { data: json.data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  // 4. Contractor Uploads Repair Photo Evidence
  async uploadRepairEvidence(potholeId, file) {
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch(`${API_BASE}/potholes/${potholeId}/verify-repair`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      return { data: json.data, photo_url: json.photo_url, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  // 5. Fetch Contractors & Reliability Scores
  async getVendors() {
    try {
      const res = await fetch(`${API_BASE}/vendors`);
      const json = await res.json();
      return { data: json.data || [], error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  // 6. E-Tenders
  async getTenders() {
    try {
      const res = await fetch(`${API_BASE}/tenders`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Unable to load tenders');
      return { data: json.data || [], error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  async createTender(tenderData) {
    try {
      const res = await fetch(`${API_BASE}/tenders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenderData)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Unable to issue tender');
      return { data: json.data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  // 7. Contractor Submits Bid via Mobile
  async submitBid(tenderId, bidData) {
    try {
      const res = await fetch(`${API_BASE}/tenders/${tenderId}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bidData)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Unable to submit bid');
      return { data: json.data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  // 8. Citizen Complaint Submission (Supports single or multiple damage photos)
  async submitCitizenReport(reportData, photoFiles) {
    try {
      const formData = new FormData();
      Object.entries(reportData).forEach(([key, val]) => formData.append(key, val));

      if (Array.isArray(photoFiles) && photoFiles.length > 0) {
        photoFiles.forEach(file => formData.append('photos', file));
        formData.append('photo', photoFiles[0]); // Legacy compatibility
      } else if (photoFiles) {
        formData.append('photos', photoFiles);
        formData.append('photo', photoFiles);
      }

      const res = await fetch(`${API_BASE}/citizen/report`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      return { 
        data: json.data, 
        tracking_id: json.tracking_id, 
        photo_url: json.photo_url || json.data?.photo_url,
        photo_urls: json.photo_urls || (json.photo_url ? [json.photo_url] : []),
        error: null 
      };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  // 9. Citizen Tracking by Tracking ID
  async trackCitizenReport(trackingId) {
    try {
      const res = await fetch(`${API_BASE}/citizen/track/${trackingId}`);
      const json = await res.json();
      return { data: json.data, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  // 10. Delete Pothole by ID (from Supabase Database)
  async deletePothole(potholeId) {
    try {
      const res = await fetch(`${API_BASE}/potholes/${potholeId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      return { data: json, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }
};
