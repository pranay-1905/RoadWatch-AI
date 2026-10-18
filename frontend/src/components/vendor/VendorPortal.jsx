import React, { useState } from 'react';
import { 
  Building2, 
  IndianRupee, 
  CheckCircle2, 
  Clock, 
  FileText, 
  MapPin, 
  Upload, 
  TrendingUp, 
  FileCheck, 
  Send, 
  Camera, 
  Navigation, 
  ShieldCheck, 
  Sparkles, 
  Plus,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import TenderBiddingModal from './TenderBiddingModal';
import repairPatchImg from '../../assets/repair_patch.jpg';
import repairRollerImg from '../../assets/repair_roller.jpg';
import repairSmoothImg from '../../assets/repair_smooth.jpg';
import repairEdgeSealImg from '../../assets/repair_edge_seal.jpg';

const SAMPLE_REPAIR_PHOTOS = [
  {
    label: "Hot-Mix Compacted Asphalt Patch",
    desc: "12cm double-layer heavy roller finish",
    url: repairPatchImg
  },
  {
    label: "Heavy Vibratory Roller Compaction",
    desc: "98.5% density asphalt core finish",
    url: repairRollerImg
  },
  {
    label: "Bitumen Edge Mastic & Tack Seal",
    desc: "Hot perimeter bonding sealant",
    url: repairEdgeSealImg
  },
  {
    label: "Resurfaced Bitumen Wear Course",
    desc: "Smooth highway pavement finish",
    url: repairSmoothImg
  }
];

export default function VendorPortal({ 
  currentUser, 
  potholes, 
  vendorTab: propVendorTab,
  setVendorTab: propSetVendorTab,
  onSubmitBid, 
  onVendorSubmitWork, 
  onSelectPothole 
}) {
  const [localVendorTab, setLocalVendorTab] = useState('marketplace');
  const vendorTab = propVendorTab !== undefined ? propVendorTab : localVendorTab;
  const setVendorTab = propSetVendorTab || setLocalVendorTab;
  const [biddingPothole, setBiddingPothole] = useState(null);
  
  // Geotagged Completion Modal State with Multi-Photo Support
  const [completingPothole, setCompletingPothole] = useState(null);
  const [attachedPhotos, setAttachedPhotos] = useState([SAMPLE_REPAIR_PHOTOS[0].url]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [photoSourceMode, setPhotoSourceMode] = useState('presets'); // 'camera' | 'upload' | 'presets' | 'url'
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [asphaltThickness, setAsphaltThickness] = useState('12 cm (2-layer compacted)');
  const [materialUsed, setMaterialUsed] = useState('Hot-Mix Bitumen VG-30 with Emulsion Tack Coat');
  const [completionNotes, setCompletionNotes] = useState('Milling, bitumen bonding coat and heavy vibratory rolling completed per IRC-SP-98 guidelines.');
  const [qualityChecks, setQualityChecks] = useState({
    compaction: true,
    edgeSeal: true,
    geofenceLocked: true
  });

  // Open modal and initialize photos
  const handleOpenCompletionModal = (work) => {
    setCompletingPothole(work);
    setAttachedPhotos([SAMPLE_REPAIR_PHOTOS[0].url]);
    setActivePhotoIndex(0);
    setPhotoSourceMode('presets');
  };

  // Handle direct camera capture
  const handleCameraCapture = (e) => {
    try {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const newUrl = event.target.result;
            setAttachedPhotos(prev => [...prev, newUrl]);
            setActivePhotoIndex(attachedPhotos.length);
          }
        };
        reader.onerror = (err) => {
          console.warn('FileReader error on camera capture:', err);
          alert('Unable to read selected photo. Please try another image.');
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Error handling camera capture:', err);
    }
  };

  // Handle device file upload (supports single or multiple images)
  const handleDeviceUpload = (e) => {
    try {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        files.forEach((file) => {
          try {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                const newUrl = event.target.result;
                setAttachedPhotos(prev => [...prev, newUrl]);
              }
            };
            reader.onerror = (err) => {
              console.warn('FileReader error on device upload:', err);
            };
            reader.readAsDataURL(file);
          } catch (fileErr) {
            console.warn('Error reading file:', fileErr);
          }
        });
        setActivePhotoIndex(attachedPhotos.length);
      }
    } catch (err) {
      console.error('Error handling device upload:', err);
    }
  };

  // Handle adding photo from preset
  const handleSelectPreset = (url) => {
    if (!attachedPhotos.includes(url)) {
      setAttachedPhotos(prev => [...prev, url]);
      setActivePhotoIndex(attachedPhotos.length);
    } else {
      setActivePhotoIndex(attachedPhotos.indexOf(url));
    }
  };

  // Handle adding custom URL
  const handleAddCustomUrl = (e) => {
    e.preventDefault();
    if (customUrlInput.trim()) {
      setAttachedPhotos(prev => [...prev, customUrlInput.trim()]);
      setActivePhotoIndex(attachedPhotos.length);
      setCustomUrlInput('');
    }
  };

  // Handle removing a photo from the attached list
  const handleRemovePhoto = (indexToRemove, e) => {
    e.stopPropagation();
    if (attachedPhotos.length <= 1) {
      alert('At least 1 geotagged evidence photo is required.');
      return;
    }
    const updated = attachedPhotos.filter((_, idx) => idx !== indexToRemove);
    setAttachedPhotos(updated);
    if (activePhotoIndex >= updated.length) {
      setActivePhotoIndex(Math.max(0, updated.length - 1));
    }
  };

  // Filter datasets for vendor
  const availableTenders = potholes.filter(p => p.status === 'TENDER_ISSUED' || p.status === 'PENDING');
  
  const myActiveContracts = potholes.filter(p => 
    p.assignedVendor === currentUser.organization && (p.status === 'IN_PROGRESS' || p.status === 'TENDER_ISSUED' || p.status === 'VERIFICATION_PENDING')
  );

  const myCompletedWorks = potholes.filter(p => 
    p.assignedVendor === currentUser.organization && p.status === 'WORK_DONE'
  );

  // Compute Financials
  const totalBilled = myCompletedWorks.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0);
  const activeContractValue = myActiveContracts.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0);

  const handleFinishWorkSubmit = (e) => {
    e.preventDefault();
    if (!completingPothole) return;

    if (attachedPhotos.length === 0) {
      alert('Please attach at least 1 geotagged photo before submitting.');
      return;
    }

    const currentTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

    onVendorSubmitWork(completingPothole.id, {
      repairProofImg: attachedPhotos[0], // primary thumbnail
      repairProofImages: attachedPhotos, // all attached angles
      completionNotes: completionNotes,
      materialUsed: materialUsed,
      asphaltThickness: asphaltThickness,
      vendorName: currentUser.organization,
      completedAt: currentTime,
      geoCoordinates: {
        lat: completingPothole.lat,
        lng: completingPothole.lng,
        accuracy: "± 1.8 meters",
        geofenceVerified: true
      }
    });

    setCompletingPothole(null);
  };

  return (
    <div className="vendor-portal-container">
      {/* VENDOR PROFILE & STATS HERO BANNER */}
      <div className="vendor-hero-card">
        <div className="vendor-profile-info">
          <img src={currentUser.avatar} alt={currentUser.organization} className="vendor-avatar-lg" />
          <div>
            <div className="vendor-badge-row">
              <span className="badge badge-contractor">{currentUser.badge}</span>
              <span className="badge badge-license">Lic: {currentUser.licenseNo}</span>
            </div>
            <h2>{currentUser.organization}</h2>
            <p className="vendor-subtitle">
              Authorized Highway & Pavement Contractor | Contact: {currentUser.name} ({currentUser.roleTitle})
            </p>
          </div>
        </div>

        <div className="vendor-kpi-summary">
          <div className="vkpi-card">
            <span className="vkpi-label">Active Work Orders</span>
            <span className="vkpi-val text-primary">{myActiveContracts.length}</span>
            <small>Total Value: ₹{activeContractValue.toLocaleString('en-IN')}</small>
          </div>
          <div className="vkpi-card">
            <span className="vkpi-label">Completed Repairs</span>
            <span className="vkpi-val text-repaired">{myCompletedWorks.length}</span>
            <small>Total Billed: ₹{totalBilled.toLocaleString('en-IN')}</small>
          </div>
          <div className="vkpi-card">
            <span className="vkpi-label">Contractor Status</span>
            <span className="vkpi-val text-primary">Active</span>
            <small>NMC Zone 4 Verified</small>
          </div>
        </div>
      </div>

      {/* VENDOR SUB-NAVBAR TABS */}
      <div className="vendor-nav-tabs">
        <button 
          className={`vendor-tab-btn ${vendorTab === 'marketplace' ? 'active' : ''}`}
          onClick={() => setVendorTab('marketplace')}
        >
          <Building2 className="w-4 h-4" />
          <span>Open Municipal Tenders ({availableTenders.length})</span>
        </button>

        <button 
          className={`vendor-tab-btn ${vendorTab === 'active' ? 'active' : ''}`}
          onClick={() => setVendorTab('active')}
        >
          <Clock className="w-4 h-4" />
          <span>My Active Work Contracts ({myActiveContracts.length})</span>
        </button>

        <button 
          className={`vendor-tab-btn ${vendorTab === 'completed' ? 'active' : ''}`}
          onClick={() => setVendorTab('completed')}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Completed & Verified Jobs ({myCompletedWorks.length})</span>
        </button>

        <button 
          className={`vendor-tab-btn ${vendorTab === 'billing' ? 'active' : ''}`}
          onClick={() => setVendorTab('billing')}
        >
          <IndianRupee className="w-4 h-4" />
          <span>Payouts & Invoices</span>
        </button>
      </div>

      {/* TAB 1: OPEN TENDERS MARKETPLACE */}
      {vendorTab === 'marketplace' && (
        <div className="vendor-view-section">
          <div className="section-header-compact">
            <div>
              <h3>Nagpur Municipal Corporation - Open Road Repair Tenders</h3>
              <p>Review surveyed road damage telemetry, AI severity ratings, and submit competitive tender bids.</p>
            </div>
            <span className="pulse-badge"><span className="pulse-dot"></span> Live E-Tendering Active</span>
          </div>

          {availableTenders.length === 0 ? (
            <div className="empty-placeholder-card">
              <FileCheck className="w-12 h-12 text-slate-400 mb-2" />
              <h4>No Open Tenders Currently</h4>
              <p>All issued road damage tenders have been assigned or resolved.</p>
            </div>
          ) : (
            <div className="tender-grid">
              {availableTenders.map(tender => {
                const existingBid = tender.bids?.find(b => b.vendorId === currentUser.id);
                const hasBid = !!existingBid;

                return (
                  <div key={tender.id} className="tender-card">
                    <div className="tender-card-img-wrap">
                      <img src={tender.imgUrl} alt={tender.locationName} className="tender-card-img" />
                      <span className={`tender-sev-tag ${tender.severity.toLowerCase()}`}>
                        {tender.severity} SEVERITY
                      </span>
                      <span className="tender-yolo-badge">AI Confidence: {tender.confidence}</span>
                    </div>

                    <div className="tender-card-body">
                      <div className="tender-card-header">
                        <span className="tender-id">Tender #{tender.id}</span>
                        <span className="tender-deadline">Due: {tender.tenderDeadline || 'In 3 Days'}</span>
                      </div>

                      <h4 className="tender-title">{tender.locationName}</h4>
                      
                      <div className="tender-meta-list">
                        <div className="meta-item">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>GPS: {tender.lat?.toFixed ? tender.lat.toFixed(4) : (Number(tender.lat) || 21.1458).toFixed(4)}, {tender.lng?.toFixed ? tender.lng.toFixed(4) : (Number(tender.lng) || 79.0882).toFixed(4)}</span>
                        </div>
                        <div className="meta-item">
                          <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                          <span>IMU Spike: <strong>{tender.imuGForce} G</strong> ({tender.speedKmh} km/h)</span>
                        </div>
                        <div className="meta-item">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Dimensions: <strong>{tender.dimensions || '1.2m x 0.8m'}</strong></span>
                        </div>
                      </div>

                      <div className="tender-budget-box">
                        <div>
                          <span className="budget-label">NMC Budget Cap</span>
                          <span className="budget-val">₹{tender.estimatedCost?.toLocaleString('en-IN') || '30,000'}</span>
                        </div>
                        <div>
                          <span className="budget-label">Total Bids</span>
                          <span className="budget-val text-primary">{tender.bids?.length || 0} Submissions</span>
                        </div>
                      </div>

                      {hasBid ? (
                        <div className="already-bid-banner">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 inline mr-1" />
                          <span>Your Bid: <strong>₹{existingBid.amount.toLocaleString('en-IN')}</strong> ({existingBid.timelineDays} days) - Under Review</span>
                        </div>
                      ) : (
                        <button 
                          className="btn btn-primary w-full"
                          onClick={() => setBiddingPothole(tender)}
                        >
                          <Send className="w-4 h-4" /> Submit Tender Bid
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY ACTIVE WORK CONTRACTS */}
      {vendorTab === 'active' && (
        <div className="vendor-view-section">
          <div className="section-header-compact">
            <div>
              <h3>My Active Road Repair Work Orders</h3>
              <p>Track awarded contracts, deploy field crews, and submit geotagged photographic proof for MNC verification.</p>
            </div>
          </div>

          {myActiveContracts.length === 0 ? (
            <div className="empty-placeholder-card">
              <Clock className="w-12 h-12 text-slate-400 mb-2" />
              <h4>No Active Contracts In Progress</h4>
              <p>Place bids on open municipal tenders above to secure road repair contracts.</p>
            </div>
          ) : (
            <div className="active-contracts-list">
              {myActiveContracts.map(work => {
                const isUnderVerification = work.status === 'VERIFICATION_PENDING';

                return (
                  <div key={work.id} className="active-work-card">
                    <div className="work-card-media">
                      <img src={work.repairProofImg || work.imgUrl} alt="Inspection Snapshot" />
                      <span className={`work-status-pill ${isUnderVerification ? 'verification' : 'in-progress'}`}>
                        {isUnderVerification ? 'Submitted for MNC Audit' : 'Active Construction'}
                      </span>
                    </div>

                    <div className="work-card-details">
                      <div className="work-header">
                        <div>
                          <span className="work-id">Contract #{work.id}</span>
                          <h4>{work.locationName}</h4>
                        </div>
                        <div className="work-contract-val">
                          <span className="val-lbl">Awarded Value</span>
                          <span className="val-amt">₹{work.estimatedCost?.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <p className="work-coords">
                        <MapPin className="w-3.5 h-3.5 inline text-indigo-600 mr-1" />
                        Coordinates: {work.lat?.toFixed ? work.lat.toFixed(4) : (Number(work.lat) || 21.1458).toFixed(4)}, {work.lng?.toFixed ? work.lng.toFixed(4) : (Number(work.lng) || 79.0882).toFixed(4)} | Category: {work.urgencyLevel || 'Road Safety Emergency'}
                      </p>

                      {/* Progress Step Bar */}
                      <div className="work-progress-stepper">
                        <div className="step-item completed">
                          <div className="step-dot">✓</div>
                          <span>Tender Awarded</span>
                        </div>
                        <div className="step-line active"></div>
                        <div className="step-item completed">
                          <div className="step-dot">✓</div>
                          <span>Crew Dispatched</span>
                        </div>
                        <div className="step-line active"></div>
                        <div className={`step-item ${isUnderVerification ? 'completed' : 'active'}`}>
                          <div className="step-dot">{isUnderVerification ? '✓' : '3'}</div>
                          <span>Asphalt Repaired</span>
                        </div>
                        <div className={`step-line ${isUnderVerification ? 'active' : ''}`}></div>
                        <div className={`step-item ${isUnderVerification ? 'active' : ''}`}>
                          <div className="step-dot">4</div>
                          <span>MNC Verification</span>
                        </div>
                      </div>

                      {isUnderVerification ? (
                        <div className="verification-sent-notice">
                          <CheckCircle2 className="w-4 h-4 text-amber-600 inline mr-1" />
                          <span>Geotagged proof submitted to Municipal Engineers. Awaiting quality signoff & invoice release.</span>
                        </div>
                      ) : (
                        <div className="work-actions">
                          <button 
                            className="btn btn-outline btn-sm"
                            onClick={() => onSelectPothole(work)}
                          >
                            View Telemetry
                          </button>
                          <button 
                            className="btn btn-success btn-sm"
                            onClick={() => handleOpenCompletionModal(work)}
                          >
                            <Camera className="w-4 h-4" /> Send Geotagged Proof to MNC
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMPLETED & VERIFIED JOBS */}
      {vendorTab === 'completed' && (
        <div className="vendor-view-section">
          <div className="section-header-compact">
            <div>
              <h3>Completed & MNC Verified Road Repairs</h3>
              <p>Audit trail of patched road damages with before-and-after photographic evidence and payment verification.</p>
            </div>
          </div>

          {myCompletedWorks.length === 0 ? (
            <div className="empty-placeholder-card">
              <CheckCircle2 className="w-12 h-12 text-slate-400 mb-2" />
              <h4>No Completed Jobs Recorded Yet</h4>
              <p>Completed jobs verified by Municipal Engineers will appear here.</p>
            </div>
          ) : (
            <div className="completed-grid">
              {myCompletedWorks.map(job => (
                <div key={job.id} className="completed-card">
                  <div className="comparison-images">
                    <div className="comp-box">
                      <img src={job.imgUrl} alt="Before" />
                      <span className="comp-label before">Before (Defect)</span>
                    </div>
                    <div className="comp-box">
                      <img src={job.repairProofImg || job.imgUrl} alt="After" />
                      <span className="comp-label after">After (Repaired Proof)</span>
                    </div>
                  </div>

                  <div className="completed-info">
                    <div className="completed-header">
                      <h4>#{job.id} - {job.locationName}</h4>
                      <span className="badge repaired">Work Done & Verified</span>
                    </div>
                    <p className="completed-notes">
                      Contractor: <strong>{currentUser.organization}</strong> | Value: <strong>₹{job.estimatedCost?.toLocaleString('en-IN')}</strong>
                    </p>
                    <div className="completed-meta-row">
                      <span><CheckCircle2 className="w-3.5 h-3.5 inline text-emerald-600 mr-1" /> 1-Year Guarantee Active</span>
                      <span className="text-emerald-700 font-semibold">Payment Disbursed</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BILLING & INVOICES */}
      {vendorTab === 'billing' && (
        <div className="vendor-view-section">
          <div className="section-header-compact">
            <div>
              <h3>Contractor Billing & Treasury Disbursements</h3>
              <p>Nagpur Municipal Corporation electronic payment vouchers and ledger entries.</p>
            </div>
          </div>

          <div className="billing-summary-cards">
            <div className="card stat-box">
              <span className="stat-label">Total Contract Value Cleared</span>
              <h3 className="stat-val text-emerald-600">₹{totalBilled.toLocaleString('en-IN')}</h3>
              <span className="stat-sub">Across 6 municipal work packages</span>
            </div>
            <div className="card stat-box">
              <span className="stat-label">Pending Verification Release</span>
              <h3 className="stat-val text-amber-600">₹{activeContractValue.toLocaleString('en-IN')}</h3>
              <span className="stat-sub">Escrow protected under NMC Zone 4</span>
            </div>
            <div className="card stat-box">
              <span className="stat-label">TDS & Performance Security</span>
              <h3 className="stat-val text-primary">₹32,500</h3>
              <span className="stat-sub">Refundable after 12 months</span>
            </div>
          </div>

          <div className="card table-card mt-4">
            <div className="card-header">
              <div className="card-title">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Recent Electronic Invoices & Vouchers</span>
              </div>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice No.</th>
                    <th>Defect Work Order</th>
                    <th>Location</th>
                    <th>Amount (INR)</th>
                    <th>Submission Date</th>
                    <th>Treasury Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>INV-2026-NMC-091</strong></td>
                    <td>POT-1089</td>
                    <td>Subhash Nagar Ring Road Junction</td>
                    <td><strong>₹15,000</strong></td>
                    <td>2026-08-16</td>
                    <td><span className="badge repaired">Paid via NEFT</span></td>
                  </tr>
                  <tr>
                    <td><strong>INV-2026-NMC-088</strong></td>
                    <td>POT-1088</td>
                    <td>Civil Lines, High Court Gate 3</td>
                    <td><strong>₹28,000</strong></td>
                    <td>2026-08-16</td>
                    <td><span className="badge repaired">Paid via NEFT</span></td>
                  </tr>
                  <tr>
                    <td><strong>INV-2026-NMC-094</strong></td>
                    <td>POT-1091</td>
                    <td>Ambazari Road, University Sq</td>
                    <td><strong>₹22,000</strong></td>
                    <td>2026-08-17</td>
                    <td><span className="badge pending">Under Verification</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BIDDING MODAL */}
      {biddingPothole && (
        <TenderBiddingModal
          pothole={biddingPothole}
          vendor={currentUser}
          onClose={() => setBiddingPothole(null)}
          onSubmitBid={onSubmitBid}
        />
      )}

      {/* ULTRA-MODERN 2-COLUMN GEOTAGGED WORK EVIDENCE MODAL WITH MULTI-IMAGE & CAMERA */}
      {completingPothole && (
        <div className="modal-overlay active">
          <div className="modal-card modal-extra-wide">
            {/* MODAL HEADER */}
            <div className="modal-header">
              <div className="modal-header-title">
                <span className="badge badge-verification">FIELD QUALITY TELEMETRY</span>
                <h3>Transmit Geotagged Field Evidence to MNC — #{completingPothole.id}</h3>
              </div>
              <button className="modal-close" onClick={() => setCompletingPothole(null)}>×</button>
            </div>

            <form onSubmit={handleFinishWorkSubmit} className="modal-form-flex">
              <div className="modal-body p-0 modal-body-scrollable">
                {/* 2-COLUMN SPLIT GRID */}
                <div className="geotag-modal-grid">
                  
                  {/* LEFT COLUMN: LIVE VIEWFINDER HUD, MULTI-IMAGE GALLERY & CAPTURE CONTROLS */}
                  <div className="geotag-left-column">
                    
                    {/* GEOFENCE LIVE STATUS BAR */}
                    <div className="geofence-alert-box compact">
                      <Navigation className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <div className="geofence-info">
                        <strong>GPS Geofence Match: 99.8% Confirmed</strong>
                        <p>Site: <code>{completingPothole?.lat?.toFixed ? completingPothole.lat.toFixed(4) : '21.1458'}° N, {completingPothole?.lng?.toFixed ? completingPothole.lng.toFixed(4) : '79.0882'}° E</code></p>
                      </div>
                      <span className="gps-live-badge"><span className="pulse-dot"></span> GPS Locked (± 1.8m)</span>
                    </div>

                    {/* LIVE CAMERA VIEWFINDER HUD */}
                    <div className="viewfinder-container">
                      <img 
                        src={attachedPhotos[activePhotoIndex] || attachedPhotos[0] || SAMPLE_REPAIR_PHOTOS[0].url} 
                        alt="Field Evidence Preview" 
                        className="viewfinder-image" 
                        onError={(e) => {
                          e.currentTarget.src = SAMPLE_REPAIR_PHOTOS[0].url;
                        }}
                      />
                      
                      {/* VIEWFINDER CORNER RETICLES */}
                      <div className="viewfinder-reticle top-left"></div>
                      <div className="viewfinder-reticle top-right"></div>
                      <div className="viewfinder-reticle bottom-left"></div>
                      <div className="viewfinder-reticle bottom-right"></div>
                      
                      {/* VIEWFINDER HUD STATUS HEADER */}
                      <div className="viewfinder-hud-top">
                        <span className="hud-rec-tag">
                          <span className="pulse-dot-red"></span> FIELD CAM 01 • PHOTO #{activePhotoIndex + 1}/{attachedPhotos.length}
                        </span>
                        <span className="hud-elev-tag">ALT: 312m | HDOP: 0.8</span>
                      </div>

                      {/* OFFICIAL WATERMARK OVERLAY STAMP */}
                      <div className="geotag-watermark-overlay">
                        <div className="watermark-header">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline mr-1" />
                          <span>NMC ZONE 4 OFFICIAL FIELD EVIDENCE</span>
                        </div>
                        <div className="watermark-body">
                          <div>📍 GPS: <strong>{completingPothole?.lat?.toFixed ? completingPothole.lat.toFixed(4) : '21.1458'}° N, {completingPothole?.lng?.toFixed ? completingPothole.lng.toFixed(4) : '79.0882'}° E</strong> (± 1.8m)</div>
                          <div>🕒 TIME: <strong>{new Date().toISOString().replace('T', ' ').substring(0, 19)} IST</strong></div>
                          <div>🏢 CONTRACTOR: <strong>{currentUser.organization} ({currentUser.licenseNo})</strong></div>
                          <div>🛣️ ROAD: <strong>{completingPothole.locationName}</strong></div>
                        </div>
                      </div>
                    </div>

                    {/* MULTI-PHOTO FILMSTRIP GALLERY */}
                    <div className="photo-gallery-strip-box">
                      <div className="gallery-header">
                        <span className="gallery-title">
                          <ImageIcon className="w-3.5 h-3.5 inline mr-1 text-indigo-600" />
                          Attached Repair Angles ({attachedPhotos.length} Photos)
                        </span>
                        <small className="text-slate-500">Click photo to view in HUD</small>
                      </div>

                      <div className="gallery-thumbnails-row">
                        {attachedPhotos.map((photoUrl, idx) => (
                          <div 
                            key={idx} 
                            className={`gallery-thumb-item ${activePhotoIndex === idx ? 'active' : ''}`}
                            onClick={() => setActivePhotoIndex(idx)}
                          >
                            <img 
                              src={photoUrl} 
                              alt={`Angle ${idx + 1}`} 
                              onError={(e) => {
                                e.currentTarget.src = SAMPLE_REPAIR_PHOTOS[idx % SAMPLE_REPAIR_PHOTOS.length].url;
                              }}
                            />
                            <span className="thumb-idx-badge">#{idx + 1}</span>
                            {attachedPhotos.length > 1 && (
                              <button 
                                type="button" 
                                className="thumb-delete-btn" 
                                title="Remove photo"
                                onClick={(e) => handleRemovePhoto(idx, e)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* DIRECT CAPTURE & UPLOAD ACTION BUTTONS (MOBILE-FIRST) */}
                    <div className="direct-upload-actions-grid">
                      {/* Direct Device Camera Button */}
                      <label htmlFor="directCameraCapture" className="action-capture-btn camera-btn">
                        <div className="capture-icon-circle camera-circle">
                          <Camera className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="btn-text-block">
                          <strong>Take Camera Photo</strong>
                          <small>Direct Mobile / Field Cam</small>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          id="directCameraCapture" 
                          className="hidden-file-input"
                          onChange={handleCameraCapture}
                        />
                      </label>

                      {/* Direct Device File Upload Button (Supports Multi-Select) */}
                      <label htmlFor="directDeviceUpload" className="action-capture-btn upload-btn">
                        <div className="capture-icon-circle upload-circle">
                          <Upload className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="btn-text-block">
                          <strong>Upload from Device</strong>
                          <small>Pick Single or Multiple</small>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          id="directDeviceUpload" 
                          className="hidden-file-input"
                          onChange={handleDeviceUpload}
                        />
                      </label>
                    </div>

                    {/* PHOTO SOURCE SELECTOR TABS (PRESETS & URL) */}
                    <div className="photo-source-section">
                      <div className="source-nav-tabs">
                        <button 
                          type="button" 
                          className={`source-tab-btn ${photoSourceMode === 'presets' ? 'active' : ''}`}
                          onClick={() => setPhotoSourceMode('presets')}
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Verified Asphalt Presets
                        </button>
                        <button 
                          type="button" 
                          className={`source-tab-btn ${photoSourceMode === 'url' ? 'active' : ''}`}
                          onClick={() => setPhotoSourceMode('url')}
                        >
                          <FileText className="w-3.5 h-3.5" /> Paste Custom URL
                        </button>
                      </div>

                      {/* MODE 1: VERIFIED ROAD PRESETS */}
                      {photoSourceMode === 'presets' && (
                        <div className="sample-photos-row mt-2">
                          {SAMPLE_REPAIR_PHOTOS.map((sample, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className={`sample-photo-btn ${attachedPhotos.includes(sample.url) ? 'active' : ''}`}
                              onClick={() => handleSelectPreset(sample.url)}
                            >
                              <img src={sample.url} alt={sample.label} />
                              <span className="sample-title">{sample.label}</span>
                              <span className="sample-sub">{sample.desc}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* MODE 2: CUSTOM URL */}
                      {photoSourceMode === 'url' && (
                        <div className="url-input-form mt-2">
                          <input 
                            type="text" 
                            className="form-control"
                            value={customUrlInput}
                            onChange={(e) => setCustomUrlInput(e.target.value)}
                            placeholder="https://images.unsplash.com/..."
                          />
                          <button 
                            type="button" 
                            className="btn btn-primary btn-sm"
                            onClick={handleAddCustomUrl}
                          >
                            <Plus className="w-3.5 h-3.5" /> Add URL
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: ENGINEERING SPECIFICATIONS & QUALITY STATEMENT */}
                  <div className="geotag-right-column">
                    
                    {/* WORK ORDER CONTEXT CARD */}
                    <div className="work-order-summary-box">
                      <div className="summary-row">
                        <div className="order-info-block">
                          <span className="summary-lbl">Defect Work Order</span>
                          <strong>#{completingPothole.id} — {completingPothole.locationName}</strong>
                        </div>
                        <div className="contract-val-block">
                          <span className="summary-lbl">Contract Value</span>
                          <strong className="text-emerald-700 font-bold">₹{completingPothole.estimatedCost?.toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    </div>

                    {/* MATERIAL & COMPACTION FORM */}
                    <div className="form-group">
                      <div className="field-label-group">
                        <label>Asphalt Layer & Compaction Depth</label>
                        <span className="field-sub-badge">IRC-SP-98 Standard</span>
                      </div>
                      <input 
                        type="text" 
                        className="form-control"
                        value={asphaltThickness}
                        onChange={(e) => setAsphaltThickness(e.target.value)}
                        placeholder="e.g. 12 cm (2-layer compacted)"
                        required
                      />
                      {/* QUICK PRESET PILLS */}
                      <div className="quick-pill-row">
                        <button type="button" className="quick-pill" onClick={() => setAsphaltThickness('10 cm Single-Layer Roller Finish')}>10 cm Standard</button>
                        <button type="button" className="quick-pill" onClick={() => setAsphaltThickness('12 cm (2-layer compacted)')}>12 cm IRC Highway</button>
                        <button type="button" className="quick-pill" onClick={() => setAsphaltThickness('15 cm Heavy Vibratory Compacted')}>15 cm Heavy Load</button>
                      </div>
                    </div>

                    <div className="form-group">
                      <div className="field-label-group">
                        <label>Bitumen Material Mix Formulation</label>
                        <span className="field-sub-badge">Govt Approved</span>
                      </div>
                      <select 
                        className="form-control"
                        value={materialUsed}
                        onChange={(e) => setMaterialUsed(e.target.value)}
                        required
                      >
                        <option value="Hot-Mix Bitumen VG-30 with Emulsion Tack Coat">Hot-Mix Bitumen VG-30 with Emulsion Tack Coat (Standard)</option>
                        <option value="Polymer Modified Bitumen (PMB-40) with Vibratory Compaction">Polymer Modified Bitumen (PMB-40) with Vibratory Compaction</option>
                        <option value="Bitumen Mastic Pavement with Seal Coat (IRC:SP:98)">Bitumen Mastic Pavement with Seal Coat (IRC:SP:98)</option>
                        <option value="Cold-Mix High Polymer Emulsion for Rain Conditions">Cold-Mix High Polymer Emulsion for Rain Conditions</option>
                      </select>
                    </div>

                    {/* QUALITY ASSURANCE CHECKLIST */}
                    <div className="form-group">
                      <div className="field-label-group">
                        <label>Quality Standards & Field Compliance</label>
                      </div>
                      <div className="quality-checklist-card">
                        <label className="checklist-item">
                          <input 
                            type="checkbox" 
                            checked={qualityChecks.compaction} 
                            onChange={(e) => setQualityChecks({ ...qualityChecks, compaction: e.target.checked })}
                          />
                          <span>Vibratory roller compaction test ≥ 98% density confirmed</span>
                        </label>
                        <label className="checklist-item">
                          <input 
                            type="checkbox" 
                            checked={qualityChecks.edgeSeal} 
                            onChange={(e) => setQualityChecks({ ...qualityChecks, edgeSeal: e.target.checked })}
                          />
                          <span>Perimeter edge sealed with hot bitumen bonding coat</span>
                        </label>
                        <label className="checklist-item">
                          <input 
                            type="checkbox" 
                            checked={qualityChecks.geofenceLocked} 
                            onChange={(e) => setQualityChecks({ ...qualityChecks, geofenceLocked: e.target.checked })}
                          />
                          <span>GPS Geofence confirmed at active site coordinates</span>
                        </label>
                      </div>
                    </div>

                    {/* CONTRACTOR STATEMENT */}
                    <div className="form-group">
                      <div className="field-label-group">
                        <label>Contractor Compliance & Field Engineer Statement</label>
                      </div>
                      <textarea 
                        className="form-control"
                        rows="3"
                        value={completionNotes}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        required
                      ></textarea>
                    </div>

                  </div>
                </div>
              </div>

              {/* FIXED PROMINENT MODAL FOOTER */}
              <div className="modal-footer sticky-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCompletingPothole(null)}>Cancel</button>
                <button type="submit" className="btn btn-success btn-lg font-bold">
                  <Send className="w-4 h-4" /> Transmit Geotagged Evidence to MNC ({attachedPhotos.length} {attachedPhotos.length === 1 ? 'Photo' : 'Photos'})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
