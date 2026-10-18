import React, { useState } from 'react';
import { MapPin, CheckCircle2, Clock, Search, ArrowLeft, AlertCircle, Camera, LocateFixed } from 'lucide-react';
import { roadWatchApi } from '../../services/api';

const STORAGE_KEY = 'roadwatch_citizen_reports';

export default function CitizenReportForm({ onBack }) {
  const [activeMode, setActiveMode] = useState('report'); // 'report' | 'track'
  const [form, setForm] = useState({ title: '', location: '', severity: 'Medium', description: '' });
  const [photos, setPhotos] = useState([]); // Multiple damage photos (up to 4)
  const [coordinates, setCoordinates] = useState(null);
  const [locationMessage, setLocationMessage] = useState('Location not captured yet');
  const [trackingId, setTrackingId] = useState('');
  const [trackQuery, setTrackQuery] = useState('');
  const [searchedReport, setSearchedReport] = useState(null);
  const [trackError, setTrackError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  // Handle adding one or multiple photos
  const handlePhotoAdd = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    setPhotos((prev) => {
      const combined = [...prev, ...selectedFiles];
      if (combined.length > 4) {
        alert('You can upload up to 4 photos per grievance report.');
        return combined.slice(0, 4);
      }
      return combined;
    });
    e.target.value = '';
  };

  // Remove a specific photo by index
  const handlePhotoRemove = (indexToRemove) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const safeFormatDate = (dateVal) => {
    try {
      const d = new Date(dateVal);
      return Number.isNaN(d.getTime()) ? 'Just now' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch {
      return 'Recently';
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Geolocation is not supported by this browser');
      return;
    }
    setLocationMessage('Requesting current location…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nextCoordinates = { lat: Number(coords.latitude.toFixed(6)), lng: Number(coords.longitude.toFixed(6)) };
        setCoordinates(nextCoordinates);
        setLocationMessage(`Captured: ${nextCoordinates.lat}, ${nextCoordinates.lng}`);
      },
      () => setLocationMessage('Location permission denied. Enter landmark manually.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const normalizeReport = (raw) => {
    if (!raw) return null;
    let photoUrls = [];
    if (Array.isArray(raw.photo_urls) && raw.photo_urls.length > 0) {
      photoUrls = raw.photo_urls;
    } else if (raw.photo_url) {
      if (typeof raw.photo_url === 'string' && raw.photo_url.startsWith('[') && raw.photo_url.endsWith(']')) {
        try { photoUrls = JSON.parse(raw.photo_url); } catch { photoUrls = [raw.photo_url]; }
      } else if (typeof raw.photo_url === 'string' && raw.photo_url.includes(';')) {
        photoUrls = raw.photo_url.split(';').map(u => u.trim()).filter(Boolean);
      } else {
        photoUrls = [raw.photo_url];
      }
    }

    return {
      id: raw.tracking_id || raw.id,
      title: raw.landmark || raw.title || 'Reported Road Defect',
      location: raw.ward || raw.location || 'Nagpur Zone',
      severity: raw.severity || 'Medium',
      status: raw.status || 'Reported',
      reportedAt: raw.created_at || raw.reportedAt || new Date().toISOString(),
      photoUrl: photoUrls[0] || raw.photo_url || null,
      photoUrls: photoUrls,
      currentStepIndex: raw.currentStepIndex
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      alert('Please enter a brief title or landmark for the road issue.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newId = `RPT-${Math.floor(100000 + Math.random() * 900000)}`;

      const reportPayload = {
        tracking_id: newId,
        landmark: form.title,
        ward: form.location,
        severity: form.severity.toUpperCase(),
        description: form.description,
        lat: coordinates?.lat || '',
        lng: coordinates?.lng || ''
      };

      // Submit with multiple photos support
      const result = await roadWatchApi.submitCitizenReport(reportPayload, photos);
      const assignedId = result?.tracking_id || newId;

      const localReport = {
        id: assignedId,
        tracking_id: assignedId,
        ...form,
        photoName: photos[0]?.name || null,
        photo_url: result?.photo_url || result?.data?.photo_url || null,
        photo_urls: result?.photo_urls || (result?.photo_url ? [result.photo_url] : []),
        coordinates,
        status: 'Under Verification',
        citizenId: 'public-citizen',
        reportedAt: new Date().toISOString()
      };

      let reports = [];
      try {
        reports = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (!Array.isArray(reports)) reports = [];
      } catch (parseErr) {
        console.warn('Could not parse stored citizen reports:', parseErr);
        reports = [];
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([localReport, ...reports]));
      } catch (storageErr) {
        console.warn('LocalStorage save failed:', storageErr);
      }

      setTrackingId(assignedId);
      setSearchedReport(normalizeReport(result?.data || localReport));
      setForm({ title: '', location: '', severity: 'Medium', description: '' });
      setPhotos([]);
      setCoordinates(null);
      setLocationMessage('Location not captured yet');
    } catch (err) {
      console.error('Error submitting citizen report:', err);
      alert('Unable to submit report due to an unexpected error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bug 1 Fix: Query backend API first before falling back to local storage
  const handleTrackLookup = async (e) => {
    e.preventDefault();
    const query = trackQuery.trim();
    if (!query) return;

    setTrackError('');
    setIsSearching(true);

    try {
      // 1. Check live backend API / Supabase database
      const { data: remoteData, error } = await roadWatchApi.trackCitizenReport(query);
      if (remoteData && !error) {
        setSearchedReport(normalizeReport(remoteData));
        return;
      }

      // 2. Fallback to localStorage for offline / cached reports
      let reports = [];
      try {
        reports = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (!Array.isArray(reports)) reports = [];
      } catch {
        reports = [];
      }

      const found = reports.find(r => r && (
        (r.id && r.id.toLowerCase() === query.toLowerCase()) ||
        (r.tracking_id && r.tracking_id.toLowerCase() === query.toLowerCase())
      ));

      if (found) {
        setSearchedReport(normalizeReport(found));
      } else {
        setSearchedReport(null);
        setTrackError(`Complaint ID "${query}" not found in Municipal database or local records.`);
      }
    } catch (err) {
      console.error('Error looking up tracking ID:', err);
      setTrackError('Could not retrieve complaint status. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const renderTimeline = (report) => {
    const formattedDate = safeFormatDate(report?.reportedAt);
    const steps = [
      { id: 1, title: 'Complaint Registered', desc: 'Geotagged citizen report logged', done: true, time: formattedDate },
      { id: 2, title: 'Municipal Inspection', desc: 'MNC Civil Engineer site review', done: true, time: 'In Progress' },
      { id: 3, title: 'Tender Dispatched', desc: 'Assigned to empanelled contractor', done: report?.status === 'Tender Issued' || report?.status === 'Resolved', time: 'Pending' },
      { id: 4, title: 'Asphalt Compaction', desc: 'Heavy roller road resurfacing', done: report?.status === 'Resolved', time: 'Scheduled' },
      { id: 5, title: 'Audit & Resolved', desc: 'Geotagged proof verified by MNC', done: report?.status === 'Resolved', time: 'Final Step' },
    ];

    return (
      <div className="citizen-timeline-box">
        <div className="timeline-header-info">
          <div>
            <span className="citizen-ref-badge">REF: {report.id}</span>
            <h3 style={{ margin: '6px 0', fontSize: '1.25rem', color: '#0f172a' }}>{report.title}</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
              <MapPin className="w-3.5 h-3.5 inline mr-1 text-indigo-600" />
              {report.location} • Severity: <strong>{report.severity}</strong>
            </p>
          </div>
          <span className="badge warning" style={{ padding: '6px 12px', height: 'fit-content' }}>
            {report.status || 'Under Review'}
          </span>
        </div>

        {/* Display Uploaded Evidence Photo Thumbnails */}
        {((report.photoUrls && report.photoUrls.length > 0) || report.photoUrl) && (
          <div className="timeline-evidence-photos">
            <span className="evidence-strip-title">Attached Damage Evidence ({report.photoUrls?.length || 1} Photo(s)):</span>
            <div className="evidence-strip-gallery">
              {report.photoUrls && report.photoUrls.length > 0 ? (
                report.photoUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="evidence-gallery-item">
                    <img src={url} alt={`Evidence ${i + 1}`} className="evidence-gallery-thumb" />
                    <span className="gallery-tag">Photo {i + 1}</span>
                  </a>
                ))
              ) : (
                <a href={report.photoUrl} target="_blank" rel="noopener noreferrer" className="evidence-gallery-item">
                  <img src={report.photoUrl} alt="Evidence" className="evidence-gallery-thumb" />
                  <span className="gallery-tag">Photo 1</span>
                </a>
              )}
            </div>
          </div>
        )}

        <div className="timeline-steps-list">
          {steps.map((st, i) => (
            <div key={st.id} className={`timeline-step-item ${st.done ? 'step-done' : ''}`}>
              <div className="step-icon-wrap">
                {st.done ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="step-content">
                <div className="step-title-row">
                  <strong>{st.title}</strong>
                  <small>{st.time}</small>
                </div>
                <p>{st.desc}</p>
              </div>
              {i < steps.length - 1 && <div className={`step-connector ${st.done ? 'connector-done' : ''}`} />}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="public-report-panel">
      <div className="public-top-nav">
        <button type="button" className="public-back-button" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 inline mr-1" /> Back to sign in
        </button>

        <div className="public-mode-switch">
          <button 
            type="button" 
            className={`mode-btn ${activeMode === 'report' ? 'active' : ''}`}
            onClick={() => { setActiveMode('report'); setTrackingId(''); }}
          >
            File Road Complaint
          </button>
          <button 
            type="button" 
            className={`mode-btn ${activeMode === 'track' ? 'active' : ''}`}
            onClick={() => setActiveMode('track')}
          >
            Track Status Timeline
          </button>
        </div>
      </div>

      {activeMode === 'report' ? (
        trackingId ? (
          <div className="public-report-success">
            <div className="success-icon-badge">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <span className="citizen-eyebrow">COMPLAINT SUBMITTED SUCCESSFULLY</span>
            <h2>Thank you for reporting road damage!</h2>
            <p>
              Nagpur Municipal Corporation has assigned Reference ID <strong>{trackingId}</strong> to your report.
            </p>
            {searchedReport && renderTimeline(searchedReport)}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
              <button 
                type="button" 
                className="citizen-primary-button" 
                onClick={() => setTrackingId('')}
              >
                File Another Complaint
              </button>
              <button 
                type="button" 
                className="secondary-button" 
                onClick={onBack}
              >
                Return to Login
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="public-report-heading">
              <span className="citizen-eyebrow">CITIZEN MUNICIPAL GRIEVANCE PORTAL</span>
              <h2>Report a Road Defect or Pothole</h2>
              <p>Direct citizen reporting channel for Nagpur Zone roads. Fast-track municipal road repair dispatch.</p>
            </div>

            <form className="public-report-form single-page-grid" onSubmit={handleSubmit}>
              {/* LEFT COLUMN: Grievance Details */}
              <div className="form-col-left">
                <label>
                  Problem Title / Landmark
                  <input 
                    value={form.title} 
                    onChange={(e) => update('title', e.target.value)} 
                    placeholder="e.g. Deep crater near University Square Bus Stop" 
                    required 
                  />
                </label>

                <div className="location-severity-grid">
                  <label>
                    Specific Location & Ward
                    <input 
                      value={form.location} 
                      onChange={(e) => update('location', e.target.value)} 
                      placeholder="e.g. Wardha Road, Ward 12" 
                      required 
                    />
                  </label>

                  <label>
                    Hazard Severity
                    <select 
                      value={form.severity} 
                      onChange={(e) => update('severity', e.target.value)}
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                      <option>Critical</option>
                    </select>
                  </label>
                </div>

                <label>
                  Description & Hazard Details
                  <textarea 
                    value={form.description} 
                    onChange={(e) => update('description', e.target.value)} 
                    placeholder="Describe road damage, depth, two-wheeler accident risk, or waterlogging..." 
                    rows="3" 
                    required 
                  />
                </label>
              </div>

              {/* RIGHT COLUMN: Evidence, Geolocation & Submit */}
              <div className="form-col-right">
                <div className="citizen-evidence-stack">
                  {/* Multi-Photo Uploader Component */}
                  <div className="citizen-multi-upload-card">
                    <div className="multi-upload-header">
                      <span className="upload-title">
                        <Camera className="w-4 h-4 text-indigo-600 inline mr-1" />
                        Evidence Photos ({photos.length}/4)
                      </span>
                      <span className="upload-hint">Attach up to 4 angles (close-up & road context)</span>
                    </div>

                    {photos.length === 0 ? (
                      <label className="citizen-upload-dropzone">
                        <Camera className="w-7 h-7 text-indigo-500" />
                        <span className="dropzone-text">Click to Attach Photos (Up to 4)</span>
                        <small>Capture live camera photo or select multiple from gallery</small>
                        <input 
                          id="citizen-road-images" 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          onChange={handlePhotoAdd} 
                        />
                      </label>
                    ) : (
                      <div className="photos-preview-strip">
                        {photos.map((file, idx) => (
                          <div key={idx} className="photo-preview-item">
                            <img 
                              src={URL.createObjectURL(file)} 
                              alt={`Evidence preview ${idx + 1}`} 
                              className="preview-img" 
                            />
                            <span className="photo-tag-pill">
                              {idx === 0 ? 'Primary' : `#${idx + 1}`}
                            </span>
                            <button 
                              type="button" 
                              className="remove-photo-btn" 
                              onClick={() => handlePhotoRemove(idx)}
                              title="Remove photo"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        {photos.length < 4 && (
                          <label className="add-more-photo-slot" title="Add another angle">
                            <span className="plus-symbol">+</span>
                            <span className="slot-label">Add More</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              multiple 
                              onChange={handlePhotoAdd} 
                              style={{ display: 'none' }} 
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="citizen-location-card">
                    <div className="citizen-location-title">
                      <LocateFixed className="w-5 h-5 text-emerald-600" /> Geolocation GPS
                    </div>
                    <small>{locationMessage}</small>
                    <button id="capture-citizen-location" type="button" className="location-capture-button" onClick={captureLocation}>
                      <MapPin className="w-4 h-4" /> Use current location
                    </button>
                  </div>
                </div>

                <button className="citizen-primary-button submit-btn-block" type="submit" disabled={isSubmitting}>
                  <span>
                    {isSubmitting 
                      ? 'Uploading Report & Evidence...' 
                      : `Send Complaint (${photos.length} Photo${photos.length === 1 ? '' : 's'}) & Geotag to NMC`}
                  </span>
                  <CheckCircle2 className="w-4 h-4 ml-1" />
                </button>
              </div>
            </form>
          </>
        )
      ) : (
        <div className="public-track-section">
          <div className="public-report-heading">
            <span className="citizen-eyebrow">PUBLIC COMPLAINT TRACKER</span>
            <h2>Track Live Repair Status Timeline</h2>
            <p>Enter your 6-digit Reference ID (e.g. RPT-109401) to view the municipal repair progress.</p>
          </div>

          <form className="track-search-form" onSubmit={handleTrackLookup}>
            <div className="track-input-group">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Enter Reference ID (e.g. RPT-109401)..." 
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="citizen-primary-button" disabled={isSearching}>
              {isSearching ? 'Searching NMC...' : 'Search Status'}
            </button>
          </form>

          {trackError && (
            <div className="auth-error-banner" style={{ marginTop: '16px' }}>
              <AlertCircle className="w-4 h-4 inline mr-1" />
              {trackError}
            </div>
          )}

          {searchedReport && (
            <div style={{ marginTop: '24px' }}>
              {renderTimeline(searchedReport)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
