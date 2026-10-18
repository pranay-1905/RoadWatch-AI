import React from 'react';
import { AlertTriangle, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

export default function KpiCards({ data, setActiveTab }) {
  const total = data.length;
  const high = data.filter(i => i.severity === 'HIGH').length;
  const tenders = data.filter(i => i.status === 'TENDER_ISSUED').length;
  const repaired = data.filter(i => i.status === 'WORK_DONE').length;

  return (
    <section className="kpi-grid">
      <div className="kpi-card clickable" onClick={() => setActiveTab('inventory')}>
        <div className="kpi-icon total"><AlertTriangle /></div>
        <div className="kpi-data">
          <span className="kpi-title">Total Potholes Found</span>
          <h3 className="kpi-value">{total}</h3>
          <span className="kpi-sub positive">+12 today from vehicle #01</span>
        </div>
      </div>

      <div className="kpi-card clickable" onClick={() => setActiveTab('inventory')}>
        <div className="kpi-icon high"><AlertCircle /></div>
        <div className="kpi-data">
          <span className="kpi-title">Critical High Severity</span>
          <h3 className="kpi-value text-high">{high}</h3>
          <span className="kpi-sub text-high">Requires Tender / Repair</span>
        </div>
      </div>

      <div className="kpi-card clickable" onClick={() => setActiveTab('inventory')}>
        <div className="kpi-icon tender"><FileText /></div>
        <div className="kpi-data">
          <span className="kpi-title">Tenders Sent</span>
          <h3 className="kpi-value text-warning">{tenders}</h3>
          <span className="kpi-sub text-warning">Work Assigned to Contractors</span>
        </div>
      </div>

      <div className="kpi-card clickable" onClick={() => setActiveTab('inventory')}>
        <div className="kpi-icon repaired"><CheckCircle2 /></div>
        <div className="kpi-data">
          <span className="kpi-title">Work Done (Repaired)</span>
          <h3 className="kpi-value text-repaired">{repaired}</h3>
          <span className="kpi-sub positive">Verified Completed Repairs</span>
        </div>
      </div>
    </section>
  );
}
