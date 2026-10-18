import React, { useState } from 'react';
import { X, Send, IndianRupee, Clock, ShieldCheck, FileSpreadsheet } from 'lucide-react';

export default function TenderBiddingModal({ pothole, vendor, onClose, onSubmitBid }) {
  const [amount, setAmount] = useState(pothole.estimatedCost ? (pothole.estimatedCost * 0.95).toFixed(0) : 30000);
  const [timelineDays, setTimelineDays] = useState(2);
  const [asphaltType, setAsphaltType] = useState('Hot Mix Bitumen (VG-30)');
  const [notes, setNotes] = useState('Includes complete excavation, tack coat, hot mix compaction, and 1-year guarantee.');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      alert("Please enter a valid bid amount.");
      return;
    }

    const newBid = {
      id: `BID-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorId: vendor.id,
      vendorName: vendor.organization,
      amount: Number(amount),
      timelineDays: Number(timelineDays),
      asphaltType,
      notes,
      submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'PENDING_REVIEW'
    };

    onSubmitBid(pothole.id, newBid);
    onClose();
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-card modal-bidding">
        <div className="modal-header">
          <div className="modal-header-title">
            <span className="badge warning">Tender Bid Form</span>
            <h3>Submit Formal Proposal - #{pothole.id}</h3>
          </div>
          <button className="modal-close" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-flex">
          <div className="modal-body">
            {/* Defect Quick Summary */}
            <div className="bid-defect-summary">
              <img src={pothole.imgUrl} alt="Defect" className="bid-thumb" />
              <div className="bid-defect-info">
                <h4>{pothole.locationName}</h4>
                <p>Severity: <strong className={`text-${pothole.severity.toLowerCase()}`}>{pothole.severity}</strong> | Dimensions: <strong>{pothole.dimensions || '1.2m x 0.8m'}</strong></p>
                <p>NMC Benchmark Budget: <strong className="text-primary">₹{pothole.estimatedCost?.toLocaleString('en-IN')}</strong> | Urgency: <strong>{pothole.urgencyLevel || 'High'}</strong></p>
              </div>
            </div>

            <div className="bid-form-grid">
              <div className="form-group">
                <label><IndianRupee className="w-4 h-4 inline text-emerald-600 mr-1" /> Your Quotation / Bid Amount (₹ INR)</label>
                <input
                  type="number"
                  className="form-control"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 32000"
                  required
                />
                <small className="form-help">Recommended competitive bid within +/- 15% of benchmark</small>
              </div>

              <div className="form-group">
                <label><Clock className="w-4 h-4 inline text-amber-600 mr-1" /> Estimated Repair Duration (Days)</label>
                <input
                  type="number"
                  className="form-control"
                  value={timelineDays}
                  onChange={(e) => setTimelineDays(e.target.value)}
                  min="1"
                  max="14"
                  required
                />
              </div>

              <div className="form-group full-width">
                <label><ShieldCheck className="w-4 h-4 inline text-indigo-600 mr-1" /> Material & Mix Specification</label>
                <select
                  className="form-control"
                  value={asphaltType}
                  onChange={(e) => setAsphaltType(e.target.value)}
                >
                  <option value="Hot Mix Bitumen (VG-30)">Hot Mix Bitumen (VG-30) - Standard High Traffic</option>
                  <option value="Polymer Modified Bitumen (PMB-120)">Polymer Modified Bitumen (PMB-120) - Monsoon Resistant</option>
                  <option value="Cold Mix Asphalt (Instant Compact)">Cold Mix Asphalt (Instant Compact) - Quick Patch</option>
                  <option value="Mastic Asphalt with Stone Dust Seal">Mastic Asphalt with Stone Dust Seal - Heavy Flyover Grade</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label><FileSpreadsheet className="w-4 h-4 inline text-slate-600 mr-1" /> Technical Approach & Crew Commitment</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe equipment, compaction strategy, traffic diversion and warranty..."
                ></textarea>
              </div>
            </div>

            <div className="contractor-signoff">
              <div className="contractor-chip">
                <img src={vendor.avatar} alt={vendor.name} className="contractor-avatar-sm" />
                <div>
                  <strong>{vendor.organization}</strong>
                  <span>License: {vendor.licenseNo}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              <Send className="w-4 h-4" /> Submit Binding Tender Bid
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
