import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  CheckCircle2, 
  UserCheck, 
  Clock, 
  ShieldCheck, 
  MapPin, 
  Camera, 
  Award, 
  RotateCcw
} from 'lucide-react';

export default function PotholeModal({ 
  pothole, 
  onClose, 
  onSendTender, 
  onMarkWorkDone, 
  onAcceptBid,
  onApproveWork,
  onRequestRework,
  currentUser 
}) {
  const [reworkReason, setReworkReason] = useState('');
  const [showReworkInput, setShowReworkInput] = useState(false);
  const [activeProofIndex, setActiveProofIndex] = useState(0);
  const [selectedBidIndex, setSelectedBidIndex] = useState(0);
  const [tenderAmount, setTenderAmount] = useState('');

  if (!pothole) return null;

  const isMnc = currentUser?.role === 'mnc';

  let statusText = 'PENDING TENDER';
  let statusBadgeClass = 'badge-pending';

  if (pothole.status === 'TENDER_ISSUED') {
    statusText = 'TENDER ISSUED (OPEN BIDS)';
    statusBadgeClass = 'badge-tender';
  } else if (pothole.status === 'IN_PROGRESS') {
    statusText = 'IN PROGRESS (CONSTRUCTION ACTIVE)';
    statusBadgeClass = 'badge-warning';
  } else if (pothole.status === 'VERIFICATION_PENDING') {
    statusText = 'AWAITING MNC FIELD VERIFICATION';
    statusBadgeClass = 'badge-verification';
  } else if (pothole.status === 'WORK_DONE') {
    statusText = 'WORK DONE & PAYMENT APPROVED';
    statusBadgeClass = 'badge-repaired';
  }

  const proofImagesList = pothole.repairProofImages || (pothole.repairProofImg ? [pothole.repairProofImg] : []);
  const hasRepairEvidence = proofImagesList.length > 0;
  const currentProofImg = proofImagesList[activeProofIndex] || proofImagesList[0];

  const handleApprove = () => {
    if (onApproveWork) {
      onApproveWork(pothole);
    } else if (onMarkWorkDone) {
      onMarkWorkDone(pothole);
    }
    onClose();
  };

  const handleReworkSubmit = () => {
    if (onRequestRework) {
      onRequestRework(pothole, reworkReason || 'Compaction depth and asphalt seal did not meet IRC standard specifications.');
    }
    onClose();
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-card modal-large">
        {/* MODAL HEADER */}
        <div className="modal-header">
          <div>
            <span className={`badge ${statusBadgeClass} mr-2`}>
              {statusText}
            </span>
            <h3>Defect & Work Audit Dossier — #{pothole.id}</h3>
          </div>
          <button className="modal-close" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="modal-body">
          {/* BEFORE VS AFTER GEOTAGGED FIELD EVIDENCE INSPECTION */}
          {hasRepairEvidence ? (
            <div className="inspection-comparison-panel">
              <div className="inspection-header">
                <Camera className="w-4 h-4 text-indigo-600 inline mr-1.5" />
                <strong>Nagpur Municipal Corporation — Before & After Quality Audit ({proofImagesList.length} {proofImagesList.length === 1 ? 'Photo' : 'Photos'})</strong>
              </div>

              <div className="before-after-grid">
                {/* BEFORE (ROAD DAMAGE DEFECT) */}
                <div className="inspection-photo-card">
                  <div className="photo-wrapper">
                    <img src={pothole.imgUrl} alt="Initial Road Defect" className="inspection-img" />
                    <div className="photo-tag tag-before">
                      <span>BEFORE (Defect Survey)</span>
                    </div>
                    <div className="photo-overlay-data">
                      <div>YOLOv8 AI: <strong>{pothole.confidence}</strong></div>
                      <div>IMU G-Force: <strong>{pothole.imuGForce} G</strong></div>
                    </div>
                  </div>
                  <div className="photo-caption">
                    <small className="text-slate-500">Surveyed: {pothole.timestamp || '2026-08-15'}</small>
                  </div>
                </div>

                {/* AFTER (GEOTAGGED CONTRACTOR REPAIR PROOF) */}
                <div className="inspection-photo-card highlight-success">
                  <div className="photo-wrapper">
                    <img src={currentProofImg} alt="Contractor Geotagged Repair" className="inspection-img" />
                    <div className="photo-tag tag-after">
                      <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                      <span>AFTER (Geotagged Work Proof #{activeProofIndex + 1})</span>
                    </div>

                    {/* LIVE WATERMARK STAMP ON INSPECTION VIEW */}
                    <div className="geotag-watermark-overlay compact">
                      <div className="watermark-header">
                        <ShieldCheck className="w-3 h-3 text-emerald-400 inline mr-1" />
                        <span>MNC ZONE 4 GEOTAG VERIFIED</span>
                      </div>
                      <div className="watermark-body">
                        <div>📍 GPS: {pothole.lat?.toFixed(4)}° N, {pothole.lng?.toFixed(4)}° E</div>
                        <div>🕒 TIME: {pothole.completedAt || 'Live Timestamp Synchronized'}</div>
                        <div>🏢 CONTRACTOR: {pothole.assignedVendor || 'Authorized Contractor'}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* MULTI-PHOTO ANGLE THUMBNAILS FOR AUDITOR */}
                  {proofImagesList.length > 1 && (
                    <div className="audit-thumbnails-strip mt-2">
                      {proofImagesList.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`audit-thumb-btn ${activeProofIndex === idx ? 'active' : ''}`}
                          onClick={() => setActiveProofIndex(idx)}
                        >
                          <img src={imgUrl} alt={`Angle ${idx + 1}`} />
                          <span>Angle #{idx + 1}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="photo-caption">
                    <small className="text-emerald-700 font-semibold">Geofence Match: 99.8% Confirmed</small>
                  </div>
                </div>
              </div>

              {/* CONTRACTOR TECHNICAL SUBMISSION NOTES */}
              <div className="repair-specs-box">
                <div className="specs-grid">
                  <div>
                    <span className="spec-lbl">Asphalt Layer & Compaction</span>
                    <strong className="spec-val">{pothole.asphaltThickness || '12 cm (2-layer compacted)'}</strong>
                  </div>
                  <div>
                    <span className="spec-lbl">Material Formulation</span>
                    <strong className="spec-val">{pothole.materialUsed || 'Hot-Mix Bitumen VG-30 with Emulsion Tack Coat'}</strong>
                  </div>
                  <div>
                    <span className="spec-lbl">Executing Contractor</span>
                    <strong className="spec-val text-primary">{pothole.assignedVendor || 'Contractor'}</strong>
                  </div>
                </div>
                {pothole.repairCompletionNotes && (
                  <div className="contractor-compliance-note">
                    <p><strong>Field Engineer Statement:</strong> "{pothole.repairCompletionNotes}"</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STANDARD SINGLE IMAGE BANNER FOR PENDING DEFECTS */
            <div className="modal-image-container">
              <div className="modal-img-wrapper">
                <img src={pothole.imgUrl} alt="Pothole Snapshot" />
                <div className="modal-img-badge">YOLOv8 AI Detection: {pothole.confidence}</div>
              </div>
            </div>
          )}

          {/* TELEMETRY & SPECIFICATIONS GRID */}
          <div className="modal-details-grid mt-3">
            <div className="detail-box">
              <span className="lbl">GPS Spatial Coordinates</span>
              <span className="val">
                <MapPin className="w-3.5 h-3.5 inline text-indigo-600 mr-1" />
                {pothole.lat?.toFixed(4)}° N, {pothole.lng?.toFixed(4)}° E ({pothole.locationName})
              </span>
            </div>
            <div className="detail-box">
              <span className="lbl">Severity Level</span>
              <span className={`val text-${pothole.severity?.toLowerCase()}`}>{pothole.severity} RISK</span>
            </div>
            <div className="detail-box">
              <span className="lbl">IMU Shock Spike</span>
              <span className="val">{pothole.imuGForce} G</span>
            </div>
            <div className="detail-box">
              <span className="lbl">Vehicle Survey Speed</span>
              <span className="val">{pothole.speedKmh} km/h</span>
            </div>
            {pothole.status !== 'PENDING' && (
              <div className="detail-box">
                <span className="lbl">{pothole.assignedVendor ? 'Awarded Value' : 'Tender Budget Cap'}</span>
                <span className="val text-primary font-bold">₹{pothole.estimatedCost ? pothole.estimatedCost.toLocaleString('en-IN') : '—'}</span>
              </div>
            )}
            <div className="detail-box">
              <span className="lbl">Workflow Stage</span>
              <span className="val text-indigo-600 font-bold">{statusText}</span>
            </div>
          </div>

          {/* DEDICATED TENDER DISPATCH CARD (MNC VIEW WHEN PENDING) */}
          {isMnc && pothole.status === 'PENDING' && (
            <div className="tender-issue-card">
              <div className="tender-issue-card-header">
                <FileText className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0" />
                <div>
                  <h4>Issue E-Tender to Registered Road Contractors</h4>
                  <p>Set the benchmark repair budget (₹ INR) for this road damage. This amount will be dispatched to the Contractor Portal for bidding.</p>
                </div>
              </div>
              <div className="tender-issue-card-body">
                <div className="tender-amount-input-box">
                  <label htmlFor="card-tender-amount">Benchmark Repair Budget (₹ INR):</label>
                  <div className="tender-amount-field-wrap">
                    <span className="currency-sign">₹</span>
                    <input
                      id="card-tender-amount"
                      type="number"
                      min="1000"
                      className="tender-amount-input"
                      value={tenderAmount}
                      onChange={(e) => setTenderAmount(e.target.value)}
                      placeholder="e.g. 35000"
                    />
                  </div>
                  <small className="tender-help-text">Enter budget amount in Rupees before releasing tender to vendors.</small>
                </div>
                <button
                  type="button"
                  className="btn btn-warning btn-issue-tender"
                  onClick={() => {
                    const amount = Number(tenderAmount);
                    if (!amount || amount <= 0) {
                      alert('Please enter a valid tender amount in ₹.');
                      return;
                    }
                    onSendTender(pothole, amount);
                    onClose();
                  }}
                >
                  <FileText className="w-4 h-4 mr-1.5" /> Issue E-Tender to Vendors
                </button>
              </div>
            </div>
          )}

          {/* MNC VERIFICATION DECISION PANEL (WHEN PROOF IS TRANSMITTED) */}
          {isMnc && pothole.status === 'VERIFICATION_PENDING' && (
            <div className="mnc-verification-action-panel">
              <div className="mnc-panel-header">
                <Award className="w-5 h-5 text-amber-600" />
                <div>
                  <h4>Municipal Engineering Inspection & Approval</h4>
                  <p>Review the contractor's geotagged photo, compaction specifications, and geofence coordinates to authorize final disbursement.</p>
                </div>
              </div>

              {!showReworkInput ? (
                <div className="mnc-decision-buttons">
                  <button 
                    className="btn btn-success flex-1"
                    onClick={handleApprove}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    ✅ Approve Work & Authorize Payment (₹{pothole.estimatedCost?.toLocaleString('en-IN')})
                  </button>

                  <button 
                    className="btn btn-outline-danger"
                    onClick={() => setShowReworkInput(true)}
                  >
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    ⚠️ Flag Quality Issue / Request Rework
                  </button>
                </div>
              ) : (
                <div className="rework-input-box">
                  <label className="text-xs font-bold text-rose-700">Specific Quality Deficiency / Rectification Required:</label>
                  <textarea 
                    className="form-control"
                    rows="2"
                    placeholder="e.g. Edge bitumen sealing requires additional compaction layer. Please re-roll and resubmit."
                    value={reworkReason}
                    onChange={(e) => setReworkReason(e.target.value)}
                  />
                  <div className="rework-actions-row">
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowReworkInput(false)}>Cancel</button>
                    <button className="btn btn-danger btn-sm" onClick={handleReworkSubmit}>
                      <RotateCcw className="w-3.5 h-3.5" /> Transmit Rework Order to Contractor
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONTRACTOR BIDS SECTION (MNC & VENDOR VIEW) */}
          {pothole.bids && pothole.bids.length > 0 && (
            <div className="modal-bids-section">
              <div className="bids-section-header">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-600 inline mr-1" />
                    <h4>Submitted Contractor Proposals ({pothole.bids.length})</h4>
                  </div>
                  <small className="text-xs text-slate-500 font-semibold">Click any proposal to view full technical dossier</small>
                </div>
              </div>

              {/* BIDS COMPARISON SELECTOR CARDS (ALL BIDS VISIBLE AT ONCE) */}
              <div className="bids-selector-grid">
                {pothole.bids.map((bid, idx) => {
                  const isSelected = (selectedBidIndex || 0) === idx;
                  const isLowest = Math.min(...pothole.bids.map(b => b.amount)) === bid.amount;
                  return (
                    <div
                      key={bid.id || idx}
                      className={`bid-select-tab-card ${isSelected ? 'selected' : ''} ${bid.status === 'ACCEPTED' ? 'bid-accepted' : ''}`}
                      onClick={() => setSelectedBidIndex(idx)}
                    >
                      <div className="bid-tab-top">
                        <strong className="bid-vendor-title">{bid.vendorName}</strong>
                        {isLowest && <span className="lowest-bid-badge">Lowest Quote</span>}
                      </div>
                      <div className="bid-tab-pricing">
                        <strong className="text-emerald-700 font-bold">₹{bid.amount?.toLocaleString('en-IN')}</strong>
                        <span className="bid-tab-days"><Clock className="w-3 h-3 inline mr-0.5" />{bid.timelineDays} Days</span>
                      </div>
                      <div className="bid-tab-footer">
                        <small className="text-slate-500">{bid.submittedAt ? bid.submittedAt.substring(0, 16) : 'Submitted'}</small>
                        {bid.status === 'ACCEPTED' && <span className="badge badge-repaired font-bold">AWARDED</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* EXPANDED FULL BID DOSSIER INFORMATION FOR SELECTED BID */}
              {pothole.bids[selectedBidIndex || 0] && (() => {
                const currentBid = pothole.bids[selectedBidIndex || 0];
                const benchmarkDiff = pothole.estimatedCost ? Math.round(((currentBid.amount - pothole.estimatedCost) / pothole.estimatedCost) * 100) : 0;
                
                return (
                  <div className="selected-bid-dossier-card">
                    <div className="dossier-header">
                      <div className="dossier-title-block">
                        <span className="dossier-badge">Contractor Proposal #{(selectedBidIndex || 0) + 1} of {pothole.bids.length}</span>
                        <h5>{currentBid.vendorName}</h5>
                      </div>
                      <div className="dossier-quote-block">
                        <span className="quote-label">Total Binding Quote</span>
                        <strong className="quote-val text-emerald-700">₹{currentBid.amount?.toLocaleString('en-IN')}</strong>
                        <small className="quote-diff">
                          {benchmarkDiff < 0 ? `${Math.abs(benchmarkDiff)}% Below Benchmark` : `${benchmarkDiff}% vs Benchmark`}
                        </small>
                      </div>
                    </div>

                    {/* KEY METRICS BREAKDOWN GRID */}
                    <div className="dossier-metrics-grid">
                      <div className="metric-box">
                        <span className="m-label">Execution Duration</span>
                        <strong className="m-val"><Clock className="w-3.5 h-3.5 inline text-amber-600 mr-1" />{currentBid.timelineDays} Business Days</strong>
                      </div>
                      <div className="metric-box">
                        <span className="m-label">Material Formulation</span>
                        <strong className="m-val text-primary">{currentBid.asphaltType || 'Hot Mix Bitumen (VG-30)'}</strong>
                      </div>
                      <div className="metric-box">
                        <span className="m-label">Warranty & Quality</span>
                        <strong className="m-val text-emerald-700">12 Months IRC Guarantee</strong>
                      </div>
                      <div className="metric-box">
                        <span className="m-label">Submission Date</span>
                        <strong className="m-val">{currentBid.submittedAt || '2026-08-16 09:30 IST'}</strong>
                      </div>
                    </div>

                    {/* TECHNICAL APPROACH & CREW COMMITMENT STATEMENT */}
                    <div className="dossier-statement-box">
                      <span className="statement-lbl">Technical Approach, Equipment & Crew Commitment:</span>
                      <p className="statement-text">"{currentBid.notes || 'Full pavement excavation, emulsified tack coat bonding, hot-mix vibratory roller compaction per IRC-SP-98 standards with 1-year guarantee.'}"</p>
                    </div>

                    {/* AWARD ACTION BUTTON FOR MNC */}
                    {isMnc && pothole.status === 'TENDER_ISSUED' && (
                      <div className="dossier-actions-bar">
                        <button 
                          className="btn btn-primary btn-md w-full font-bold shadow-md"
                          onClick={() => {
                            if (onAcceptBid) onAcceptBid(pothole.id, currentBid);
                            onClose();
                          }}
                        >
                          <ShieldCheck className="w-4 h-4 mr-1.5" /> Award Tender to {currentBid.vendorName} (₹{currentBid.amount?.toLocaleString('en-IN')})
                        </button>
                      </div>
                    )}

                    {currentBid.status === 'ACCEPTED' && (
                      <div className="dossier-awarded-banner">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 inline mr-1.5" />
                        <strong>Contract Awarded & Active — Official Work Order Dispatched to {currentBid.vendorName}</strong>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {pothole.assignedVendor && (
            <div className="assigned-vendor-banner">
              <UserCheck className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0" />
              <div>
                <strong>Assigned Contractor: {pothole.assignedVendor}</strong>
                <span>Work Order active under NMC Zone 4 supervision. Quality guaranteed under IRC-SP-98.</span>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close Dossier</button>
          
          {/* Direct actions in footer for active states */}

          {isMnc && pothole.status === 'IN_PROGRESS' && (
            <button
              className="btn btn-success"
              onClick={() => { onMarkWorkDone(pothole); onClose(); }}
            >
              <CheckCircle2 className="w-4 h-4" /> Direct Verify & Complete
            </button>
          )}

          {isMnc && pothole.status === 'VERIFICATION_PENDING' && (
            <button
              className="btn btn-success"
              onClick={handleApprove}
            >
              <CheckCircle2 className="w-4 h-4" /> Approve & Release Payment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
