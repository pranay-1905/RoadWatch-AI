import React, { useState } from 'react';
import { 
  Layers, 
  FileSpreadsheet, 
  Printer, 
  FileText, 
  UserCheck, 
  Clock, 
  Camera, 
  Award, 
  ArrowUpDown, 
  X, 
  ShieldCheck 
} from 'lucide-react';

export default function DamageInventory({ 
  data, 
  onSendTender: _onSendTender, 
  onMarkWorkDone: _onMarkWorkDone, 
  onSelectPothole, 
  searchQuery 
}) {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [slaFilter, setSlaFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [workflowTab, setWorkflowTab] = useState('all'); // 'all' | 'needs_action' | 'in_progress' | 'completed'
  const [sortBy, setSortBy] = useState('action_needed'); // 'action_needed' | 'completed_first' | 'severity_desc' | 'sla_urgency' | 'id_desc'
  const [showPrintModal, setShowPrintModal] = useState(false);

  const getSlaInfo = (item) => {
    if (item.status === 'WORK_DONE') {
      return { label: 'Completed', tone: 'repaired', progress: 100, text: 'SLA Met', statusKey: 'COMPLETED' };
    }
    const deadlineStr = item.deadline || item.tenderDeadline || '2026-08-22';
    const deadlineTime = new Date(deadlineStr).getTime();
    const now = Date.now();
    const diffHours = Math.round((deadlineTime - now) / (1000 * 60 * 60));

    if (now > deadlineTime) {
      const daysOverdue = Math.max(1, Math.round((now - deadlineTime) / (1000 * 60 * 60 * 24)));
      return { 
        label: `OVERDUE (+${daysOverdue}d)`, 
        tone: 'danger', 
        progress: 100, 
        statusKey: 'OVERDUE',
        deadline: deadlineStr 
      };
    } else if (diffHours < 48) {
      return { 
        label: `AT RISK (${Math.max(1, Math.round(diffHours / 24))}d left)`, 
        tone: 'warning', 
        progress: 80, 
        statusKey: 'AT_RISK',
        deadline: deadlineStr 
      };
    } else {
      const daysLeft = Math.round(diffHours / 24);
      return { 
        label: `ON TRACK (${daysLeft}d left)`, 
        tone: 'good', 
        progress: 45, 
        statusKey: 'ON_TRACK',
        deadline: deadlineStr 
      };
    }
  };

  // Workflow counts for quick arrangement pills
  const allCount = data.length;
  const needsActionCount = data.filter(d => ['PENDING', 'TENDER_ISSUED', 'VERIFICATION_PENDING'].includes(d.status)).length;
  const inProgressCount = data.filter(d => d.status === 'IN_PROGRESS').length;
  const completedCount = data.filter(d => d.status === 'WORK_DONE').length;

  // Filter dataset
  const filteredData = data.filter(item => {
    const isPublicReport = item.source === 'Citizen Report';
    const matchSource = sourceFilter === 'all'
      || (sourceFilter === 'system' && !isPublicReport)
      || (sourceFilter === 'public' && isPublicReport);
    const matchSev = severityFilter === 'all' || item.severity === severityFilter;
    const matchStat = statusFilter === 'all' || item.status === statusFilter;
    const sla = getSlaInfo(item);
    const matchSla = slaFilter === 'all' || 
      (slaFilter === 'COMPLETED' && item.status === 'WORK_DONE') ||
      sla.statusKey === slaFilter;
    
    // Workflow Tab Filter
    let matchWorkflow = true;
    if (workflowTab === 'needs_action') {
      matchWorkflow = ['PENDING', 'TENDER_ISSUED', 'VERIFICATION_PENDING'].includes(item.status);
    } else if (workflowTab === 'in_progress') {
      matchWorkflow = item.status === 'IN_PROGRESS';
    } else if (workflowTab === 'completed') {
      matchWorkflow = item.status === 'WORK_DONE';
    }

    const searchableLocation = item.locationName || item.location || item.ward || item.roadName || '';
    const matchQ = !searchQuery || 
      String(item.id || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      searchableLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.assignedVendor && item.assignedVendor.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchSource && matchSev && matchStat && matchSla && matchWorkflow && matchQ;
  });

  // Apply arrangement / sorting
  const sortedData = [...filteredData].sort((a, b) => {
    if (sortBy === 'completed_first') {
      const aDone = a.status === 'WORK_DONE' ? 1 : 0;
      const bDone = b.status === 'WORK_DONE' ? 1 : 0;
      if (aDone !== bDone) return bDone - aDone;
    }
    if (sortBy === 'action_needed') {
      const order = {
        'VERIFICATION_PENDING': 1,
        'TENDER_ISSUED': 2,
        'PENDING': 3,
        'IN_PROGRESS': 4,
        'WORK_DONE': 5
      };
      const rankA = order[a.status] || 9;
      const rankB = order[b.status] || 9;
      if (rankA !== rankB) return rankA - rankB;
    }
    if (sortBy === 'severity_desc') {
      const order = { 'CRITICAL': 1, 'HIGH': 2, 'MEDIUM': 3, 'LOW': 4 };
      const rankA = order[a.severity] || 9;
      const rankB = order[b.severity] || 9;
      if (rankA !== rankB) return rankA - rankB;
    }
    if (sortBy === 'sla_urgency') {
      const aSla = getSlaInfo(a);
      const bSla = getSlaInfo(b);
      const order = { 'danger': 1, 'warning': 2, 'good': 3, 'repaired': 4 };
      const rankA = order[aSla.tone] || 9;
      const rankB = order[bSla.tone] || 9;
      if (rankA !== rankB) return rankA - rankB;
    }
    return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true });
  });

  // KPI Metrics for Official Report
  const totalAudited = sortedData.length;
  const criticalHighCount = sortedData.filter(d => ['CRITICAL', 'HIGH'].includes(d.severity)).length;
  const inProgressReportCount = sortedData.filter(d => ['IN_PROGRESS', 'TENDER_ISSUED', 'VERIFICATION_PENDING'].includes(d.status)).length;
  const completedReportCount = sortedData.filter(d => d.status === 'WORK_DONE').length;
  const totalCost = sortedData.reduce((sum, d) => sum + (Number(d.estimatedCost) || 0), 0);

  // 2. PROPER EXPORT CSV FUNCTION (UTF-8 BOM + Full Business Fields + Blob download)
  const handleExportCSV = () => {
    try {
      const headers = [
        'Defect_ID',
        'Report_Source',
        'Location_Landmark',
        'Latitude',
        'Longitude',
        'Severity',
        'Workflow_Status',
        'Assigned_Contractor',
        'Bids_Count',
        'Estimated_Cost_INR',
        'SLA_Status',
        'SLA_Deadline',
        'Repair_Specs_Material',
        'Geotag_Verified',
        'Completion_Date',
        'Photo_Evidence_URL'
      ];

      const rows = sortedData.map(item => {
        const sla = getSlaInfo(item);
        const safeLoc = (item.locationName || item.roadName || 'Nagpur Zone').replace(/"/g, '""');
        const safeVendor = (item.assignedVendor || 'Unassigned').replace(/"/g, '""');
        const safeSpecs = (item.materialUsed || 'Standard Hot-Mix Bitumen').replace(/"/g, '""');
        const photoUrl = item.repairProofImg || item.imgUrl || (Array.isArray(item.repairProofImages) && item.repairProofImages[0]) || '';
        
        let readableStatus = 'Pending Tender';
        if (item.status === 'TENDER_ISSUED') readableStatus = 'Tender Issued (Open Bids)';
        else if (item.status === 'IN_PROGRESS') readableStatus = 'Repair In Progress';
        else if (item.status === 'VERIFICATION_PENDING') readableStatus = 'Proof Sent (Audit Req)';
        else if (item.status === 'WORK_DONE') readableStatus = 'Work Done & Verified';

        return [
          item.id,
          item.source === 'Citizen Report' ? 'Citizen Grievance' : 'RoadWatch AI Survey',
          `"${safeLoc}"`,
          item.lat ? Number(item.lat).toFixed(5) : '21.1458',
          item.lng ? Number(item.lng).toFixed(5) : '79.0882',
          item.severity || 'MEDIUM',
          `"${readableStatus}"`,
          `"${safeVendor}"`,
          item.bids?.length || 0,
          item.estimatedCost || 0,
          `"${sla.label}"`,
          item.deadline || item.tenderDeadline || '2026-08-22',
          `"${safeSpecs}"`,
          item.status === 'WORK_DONE' || item.status === 'VERIFICATION_PENDING' ? 'YES (Geotagged)' : 'NO',
          item.completedAt || (item.status === 'WORK_DONE' ? '2026-08-16' : 'Pending'),
          `"${photoUrl}"`
        ].join(',');
      });

      // Municipal metadata header + UTF-8 BOM for Microsoft Excel compatibility
      const BOM = '\uFEFF';
      const metaHeader = [
        `# NAGPUR MUNICIPAL CORPORATION - ZONE 4 ROAD DAMAGE INVENTORY & AUDIT REGISTER`,
        `# Exported By: Dr. Rajesh Sharma (Executive Engineer - NMC Zone 4)`,
        `# Export Date: ${new Date().toLocaleString('en-IN')}`,
        `# Total Filtered Records: ${sortedData.length}`,
        `# Criteria: Source=${sourceFilter} | Severity=${severityFilter} | Status=${statusFilter} | SLA=${slaFilter} | Arrange=${sortBy}`,
        headers.join(','),
        ...rows
      ].join('\r\n');

      const blob = new Blob([BOM + metaHeader], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStamp = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `NMC_Zone4_Road_Damage_Report_${dateStamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating CSV export:', err);
      alert('Unable to generate CSV report. Please try again.');
    }
  };

  const handlePrintClick = () => {
    setShowPrintModal(true);
  };

  const executeBrowserPrint = () => {
    window.print();
  };

  // Shared printable report layout (used in preview modal and media print)
  const renderOfficialReportMarkup = () => (
    <div className="print-preview-paper">
      {/* Official Municipal Letterhead */}
      <div className="print-report-header">
        <div className="print-emblem-row">
          <div className="print-emblem-badge">NMC</div>
          <div className="print-header-titles">
            <h1>NAGPUR MUNICIPAL CORPORATION</h1>
            <h2>DEPARTMENT OF PUBLIC WORKS & INFRASTRUCTURE ENGINEERING</h2>
            <h3>Official Road Damage Inventory, Contractor Tender & Quality Audit Dossier</h3>
          </div>
          <div className="print-stamp-box">
            <span className="stamp-zone">ZONE 4</span>
            <span className="stamp-sub">DHARAMPETH</span>
          </div>
        </div>
        
        <div className="print-meta-grid">
          <div><strong>Docket Ref:</strong> NMC/PWD/Z4/2026-AUDIT-08</div>
          <div><strong>Date of Audit:</strong> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          <div><strong>Auditing Authority:</strong> Dr. Rajesh Sharma (Executive Engineer)</div>
          <div><strong>Compliance Standard:</strong> IRC:SP:98-2020 Bituminous Pavement Norms</div>
        </div>
      </div>

      {/* Executive Summary Metrics Strip */}
      <div className="print-metrics-row">
        <div className="print-metric-card">
          <span className="metric-lbl">Total Audited Defects</span>
          <strong className="metric-val">{totalAudited} Locations</strong>
        </div>
        <div className="print-metric-card">
          <span className="metric-lbl">High/Critical Hazards</span>
          <strong className="metric-val text-danger">{criticalHighCount} Critical</strong>
        </div>
        <div className="print-metric-card">
          <span className="metric-lbl">Active Works / Tenders</span>
          <strong className="metric-val">{inProgressReportCount} Active</strong>
        </div>
        <div className="print-metric-card">
          <span className="metric-lbl">Verified Completed Repairs</span>
          <strong className="metric-val text-success">{completedReportCount} Verified</strong>
        </div>
        <div className="print-metric-card">
          <span className="metric-lbl">Total Allocated Outlay</span>
          <strong className="metric-val">₹{totalCost.toLocaleString('en-IN')}</strong>
        </div>
      </div>

      {/* Formal Audit Data Table */}
      <table className="print-data-table">
        <thead>
          <tr>
            <th style={{ width: '4%' }}>Sr.</th>
            <th style={{ width: '12%' }}>Defect ID</th>
            <th style={{ width: '27%' }}>Road Location & Coordinates</th>
            <th style={{ width: '10%' }}>Severity</th>
            <th style={{ width: '18%' }}>Assigned Contractor</th>
            <th style={{ width: '13%' }}>SLA & Target</th>
            <th style={{ width: '16%' }}>Audit & Workflow Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item, index) => {
            const sla = getSlaInfo(item);
            let printStatusText = 'Pending Tender';
            let printStatusClass = 'status-pending';

            if (item.status === 'TENDER_ISSUED') {
              printStatusText = 'Tender Open (Bidding)';
              printStatusClass = 'status-tender';
            } else if (item.status === 'IN_PROGRESS') {
              printStatusText = 'Repair In Progress';
              printStatusClass = 'status-progress';
            } else if (item.status === 'VERIFICATION_PENDING') {
              printStatusText = 'Proof Sent (Audit Req)';
              printStatusClass = 'status-audit';
            } else if (item.status === 'WORK_DONE') {
              printStatusText = 'WORK DONE & VERIFIED';
              printStatusClass = 'status-done';
            }

            return (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td><strong>{item.id}</strong></td>
                <td>
                  <strong>{item.locationName}</strong>
                  <div className="print-coords">({item.lat?.toFixed(4)}° N, {item.lng?.toFixed(4)}° E)</div>
                </td>
                <td>
                  <span className={`print-sev-tag sev-${item.severity?.toLowerCase()}`}>
                    {item.severity}
                  </span>
                </td>
                <td>
                  {item.assignedVendor ? (
                    <div>
                      <strong>{item.assignedVendor}</strong>
                      <div className="print-cost">Budget: ₹{item.estimatedCost?.toLocaleString('en-IN')}</div>
                    </div>
                  ) : (
                    <span className="text-muted">Open for Bidding</span>
                  )}
                </td>
                <td>
                  <div>{sla.label}</div>
                  <small className="print-deadline">Due: {item.deadline || item.tenderDeadline || '2026-08-22'}</small>
                </td>
                <td>
                  <span className={`print-workflow-tag ${printStatusClass}`}>
                    {printStatusText}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Official Signatory & Seal Section */}
      <div className="print-signatory-section">
        <div className="signatory-block">
          <div className="sign-line" />
          <strong>Field Verification Inspector</strong>
          <span>Nagpur Municipal Corporation (Zone 4)</span>
          <small>Inspection Date: ____ / ____ / 2026</small>
        </div>

        <div className="official-stamp-center">
          <div className="circle-seal">
            <span>NAGPUR MUNICIPAL CORP</span>
            <strong>OFFICIALLY AUDITED</strong>
            <span>ZONE 4 PWD</span>
          </div>
        </div>

        <div className="signatory-block">
          <div className="sign-line" />
          <strong>Dr. Rajesh Sharma</strong>
          <span>Executive Engineer / Nodal Officer</span>
          <small>Certified per IRC:SP:98-2020 Norms</small>
        </div>
      </div>

      <div className="print-footer-notice">
        RoadWatch AI Municipal Pavement Monitoring Platform • Official Report Generated on {new Date().toLocaleString('en-IN')} • Document Certified
      </div>
    </div>
  );

  return (
    <div className="view-section active">
      <div className="view-header">
        <h2><Layers className="w-6 h-6 text-indigo-600 inline mr-2" /> Road Damage Inventory & Contractor Tender Hub</h2>
        <p>MNC Centralized Registry: Review road defects, dispatch e-tenders to registered contractors, and audit geotagged field repair submissions.</p>
      </div>

      <div className="card table-card">
        {/* TOP SOURCE FILTER TABS */}
        <div className="inventory-source-tabs" role="tablist" aria-label="Inventory source">
          <button type="button" className={sourceFilter === 'all' ? 'active' : ''} onClick={() => setSourceFilter('all')}>
            All <span>{data.length}</span>
          </button>
          <button type="button" className={sourceFilter === 'system' ? 'active' : ''} onClick={() => setSourceFilter('system')}>
            System Severity <span>{data.filter((item) => item.source !== 'Citizen Report').length}</span>
          </button>
          <button type="button" className={sourceFilter === 'public' ? 'active' : ''} onClick={() => setSourceFilter('public')}>
            Public Reports <span>{data.filter((item) => item.source === 'Citizen Report').length}</span>
          </button>
        </div>

        {/* 3. WORKFLOW ARRANGEMENT BAR (Quick Status Chips & Arrange/Sort Selector) */}
        <div className="workflow-arrange-bar">
          <div className="workflow-arrange-pills">
            <button
              type="button"
              className={`workflow-pill ${workflowTab === 'all' ? 'active' : ''}`}
              onClick={() => setWorkflowTab('all')}
            >
              All Items <span className="pill-count">{allCount}</span>
            </button>
            <button
              type="button"
              className={`workflow-pill ${workflowTab === 'needs_action' ? 'active' : ''}`}
              onClick={() => setWorkflowTab('needs_action')}
              title="Open Tenders, Pending Bids, and Geotag Proof awaiting Audit"
            >
              ⚡ Needs Action <span className="pill-count">{needsActionCount}</span>
            </button>
            <button
              type="button"
              className={`workflow-pill ${workflowTab === 'in_progress' ? 'active' : ''}`}
              onClick={() => setWorkflowTab('in_progress')}
              title="Active road construction underway by contractors"
            >
              🚧 Under Repair <span className="pill-count">{inProgressCount}</span>
            </button>
            <button
              type="button"
              className={`workflow-pill ${workflowTab === 'completed' ? 'active' : ''}`}
              onClick={() => setWorkflowTab('completed')}
              title="Fully completed, compacted, and verified road repairs"
            >
              ✅ Completed Works <span className="pill-count">{completedCount}</span>
            </button>
          </div>

          <div className="workflow-sort-container">
            <label htmlFor="inventory-sort-select">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" /> Arrange By:
            </label>
            <select
              id="inventory-sort-select"
              className="form-control form-control-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ fontWeight: 600, color: '#0f172a' }}
            >
              <option value="action_needed">Action Needed First</option>
              <option value="completed_first">Completed Works First</option>
              <option value="severity_desc">Highest Severity First</option>
              <option value="sla_urgency">SLA Overdue First</option>
              <option value="id_desc">Newest Defect ID</option>
            </select>
          </div>
        </div>

        {/* TABLE FILTER ACTIONS TOOLBAR */}
        <div className="card-header">
          <div className="card-title">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>Road Defect & Contractor Bidding Register</span>
          </div>
          <div className="table-actions">
            <select
              className="form-control form-control-sm"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="all">All Severities</option>
              <option value="HIGH">High Severity</option>
              <option value="MEDIUM">Medium Severity</option>
              <option value="LOW">Low Severity</option>
            </select>

            <select
              className="form-control form-control-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending Tender</option>
              <option value="TENDER_ISSUED">Tender Issued (Open Bids)</option>
              <option value="IN_PROGRESS">In Progress (Contractor Assigned)</option>
              <option value="VERIFICATION_PENDING">Awaiting MNC Verification (Proof Sent)</option>
              <option value="WORK_DONE">Work Done (Verified)</option>
            </select>

            <select
              className="form-control form-control-sm"
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value)}
            >
              <option value="all">All SLA Timelines</option>
              <option value="ON_TRACK">SLA: On Track</option>
              <option value="AT_RISK">SLA: At Risk</option>
              <option value="OVERDUE">SLA: Overdue</option>
              <option value="COMPLETED">SLA: Completed</option>
            </select>

            {/* EXPORT CSV BUTTON */}
            <button 
              type="button" 
              className="btn btn-sm btn-outline font-semibold" 
              onClick={handleExportCSV}
              title="Export complete inventory dataset formatted for Microsoft Excel & Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
            </button>

            {/* PRINT REPORT BUTTON */}
            <button 
              type="button" 
              className="btn btn-sm btn-primary font-semibold" 
              onClick={handlePrintClick}
              title="Open Official Municipal Quality Audit Report for Printing or PDF Export"
            >
              <Printer className="w-3.5 h-3.5" /> Print Report
            </button>
          </div>
        </div>

        {/* INVENTORY DATA TABLE */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Defect ID</th>
                <th>Camera Snapshot</th>
                <th>Location / Coords</th>
                <th>Severity</th>
                <th>Contractor & Bids</th>
                <th>SLA & Deadline</th>
                <th>Workflow Status</th>
                <th>MNC Tender & Audit Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map(item => {
                let badgeClass = 'badge pending';
                let statusText = 'Pending Tender';

                if (item.status === 'TENDER_ISSUED') {
                  badgeClass = 'badge tender';
                  statusText = 'Tender Open';
                } else if (item.status === 'IN_PROGRESS') {
                  badgeClass = 'badge warning';
                  statusText = 'Repair In Progress';
                } else if (item.status === 'VERIFICATION_PENDING') {
                  badgeClass = 'badge verification';
                  statusText = 'Proof Sent (Audit Req)';
                } else if (item.status === 'WORK_DONE') {
                  badgeClass = 'badge repaired';
                  statusText = 'Work Done & Paid';
                }

                const bidCount = item.bids?.length || 0;

                return (
                  <tr 
                    key={item.id} 
                    onClick={() => onSelectPothole(item)}
                    style={item.status === 'WORK_DONE' ? { background: '#fcfdfd' } : {}}
                  >
                    <td><strong>{item.id}</strong></td>
                    <td>
                      <div className="table-img-wrap">
                        <img src={item.repairProofImg || item.imgUrl} className="table-img" alt="Snapshot" />
                      </div>
                    </td>
                    <td>
                      <strong>{item.locationName}</strong><br />
                      <small style={{ color: '#64748b' }}>({item.lat ? item.lat.toFixed(4) : '21.1458'}, {item.lng ? item.lng.toFixed(4) : '79.0882'})</small>
                    </td>
                    <td><span className={`badge ${item.severity ? item.severity.toLowerCase() : 'medium'}`}>{item.severity}</span></td>
                    <td>
                      {item.assignedVendor ? (
                        <div className="contractor-assigned-pill">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
                          <span>{item.assignedVendor}</span>
                        </div>
                      ) : (
                        <div className="bids-counter-pill">
                          <Clock className="w-3.5 h-3.5 text-amber-600 inline mr-1" />
                          <span>{bidCount} {bidCount === 1 ? 'Bid' : 'Bids'} Placed</span>
                        </div>
                      )}
                    </td>
                    <td>
                      {(() => {
                        const sla = getSlaInfo(item);
                        return (
                          <div className="sla-table-cell">
                            <span className={`sla-pill ${sla.tone}`}>
                              {sla.label}
                            </span>
                            <div className="sla-progress-track">
                              <div 
                                className={`sla-progress-fill ${sla.tone}`} 
                                style={{ width: `${sla.progress}%` }} 
                              />
                            </div>
                            <small className="sla-deadline-text">
                              Due: {item.deadline || item.tenderDeadline || '2026-08-22'}
                            </small>
                          </div>
                        );
                      })()}
                    </td>
                    <td><span className={badgeClass}>{statusText}</span></td>
                    <td>
                      <div className="table-action-btns" onClick={(e) => e.stopPropagation()}>
                        {item.status === 'PENDING' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-warning"
                            onClick={() => onSelectPothole(item)}
                          >
                            <FileText className="w-3 h-3" /> Issue Tender
                          </button>
                        )}

                        {item.status === 'TENDER_ISSUED' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => onSelectPothole(item)}
                          >
                            Review {bidCount} Bids
                          </button>
                        )}

                        {item.status === 'IN_PROGRESS' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => onSelectPothole(item)}
                          >
                            <Clock className="w-3 h-3 text-amber-600" /> Track Field Work
                          </button>
                        )}

                        {item.status === 'VERIFICATION_PENDING' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-warning font-bold"
                            onClick={() => onSelectPothole(item)}
                          >
                            <Camera className="w-3 h-3" /> Inspect Geotag Proof
                          </button>
                        )}

                        {/* 3. COMPLETE WORK STATUS ACTION: Interactive Audit Dossier Viewer */}
                        {item.status === 'WORK_DONE' && (
                          <button
                            type="button"
                            className="btn-success-subtle"
                            onClick={() => onSelectPothole(item)}
                            title="Inspect Before/After Geotagged Proof & Resolution Certificate"
                          >
                            <Award className="w-3.5 h-3.5 text-emerald-600" /> View Audit Proof
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. DEDICATED OFFICIAL PRINT REPORT FOR BROWSER PRINT ENGINE (@media print) */}
      <div className="official-print-report-container">
        {renderOfficialReportMarkup()}
      </div>

      {/* 1. ON-SCREEN OFFICIAL PRINT PREVIEW & AUDIT DOSSIER MODAL */}
      {showPrintModal && (
        <div className="print-preview-modal-overlay" onClick={() => setShowPrintModal(false)}>
          <div className="print-preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="print-preview-modal-header">
              <h3>
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                Official Municipal Audit Dossier & Hardcopy Print Preview
              </h3>
              <div className="print-modal-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-success font-bold"
                  onClick={executeBrowserPrint}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Printer className="w-4 h-4" /> Print Document / Save as PDF
                </button>
                <button
                  type="button"
                  className="btn-modal-csv"
                  onClick={handleExportCSV}
                  title="Download complete filtered inventory as CSV for Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Download CSV
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowPrintModal(false)}
                >
                  <X className="w-4 h-4" /> Close
                </button>
              </div>
            </div>

            <div className="print-preview-modal-body">
              {renderOfficialReportMarkup()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

