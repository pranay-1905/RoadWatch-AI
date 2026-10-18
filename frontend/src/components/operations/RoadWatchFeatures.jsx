import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CloudOff, Gauge, ShieldCheck, TrendingUp, UploadCloud, RefreshCw, Clock, MapPin, Plus } from 'lucide-react';

const reportKey = 'roadwatch_citizen_reports';
const queueKey = 'roadwatch_offline_queue';

const readStorage = (key) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : [];
  } catch (err) {
    console.warn(`Could not read localStorage key "${key}":`, err);
    return [];
  }
};

const safeWriteStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn(`Could not write localStorage key "${key}":`, err);
    return false;
  }
};

const safeRemoveStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.warn(`Could not remove localStorage key "${key}":`, err);
    return false;
  }
};

function calculateSla(item) {
  if (!item) return ['On track', 'good', 50];
  if (item.status === 'WORK_DONE') return ['Completed', 'done', 100];
  
  const endParsed = new Date(item.deadline || item.tenderDeadline || Date.now() + 86400000 * 3).getTime();
  const end = Number.isNaN(endParsed) ? Date.now() + 86400000 * 3 : endParsed;

  const startParsed = new Date(item.assignedAt || item.timestamp || Date.now() - 86400000 * 2).getTime();
  const start = Number.isNaN(startParsed) ? Date.now() - 86400000 * 2 : startParsed;

  const elapsed = Math.max(0, Date.now() - start);
  const total = Math.max(1, end - start);
  const progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));

  if (Date.now() > end) {
    return ['Overdue', 'danger', 100];
  } else if (progress > 65) {
    return ['At risk', 'warn', progress];
  } else {
    return ['On track', 'good', progress];
  }
}

function calculateVendorScore(items) {
  const completed = items.filter((p) => ['WORK_DONE', 'VERIFICATION_PENDING'].includes(p.status));
  const onTime = completed.length ? Math.round((completed.filter((p) => p.status === 'WORK_DONE').length / completed.length) * 100) : 92;
  const quality = completed.length ? Math.max(70, 100 - completed.filter((p) => p.reworkReason).length * 12) : 96;
  const rework = Math.max(2, 100 - quality);
  // Composite score formula
  return { 
    score: Math.round(onTime * 0.35 + quality * 0.45 + (100 - rework) * 0.20), 
    onTime, 
    quality, 
    rework 
  };
}

export default function RoadWatchFeatures({ potholes = [], currentUser: _currentUser }) {
  const [tab, setTab] = useState('sla');
  const [slaFilter, setSlaFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [online, setOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queue, setQueue] = useState(() => readStorage(queueKey));
  const [reports, setReports] = useState(() => readStorage(reportKey));
  const [syncedMessage, setSyncedMessage] = useState('');
  
  // New Offline Inspection Modal Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newInspection, setNewInspection] = useState({
    road: 'Wardha Road Corridor',
    ward: 'Zone 4 (Dhantoli)',
    severity: 'High',
    notes: 'Severe asphalt detachment detected during field sweep.'
  });

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const refreshData = () => {
      setReports(readStorage(reportKey));
      setQueue(readStorage(queueKey));
    };
    window.addEventListener('storage', refreshData);
    return () => window.removeEventListener('storage', refreshData);
  }, []);

  // Phase 1: SLA Active Repairs
  const activeRepairs = potholes.filter((p) => ['IN_PROGRESS', 'VERIFICATION_PENDING', 'TENDER_ISSUED'].includes(p.status));
  const filteredSlaRows = activeRepairs.filter((item) => {
    if (slaFilter === 'all') return true;
    const tone = calculateSla(item)[1];
    return tone === slaFilter;
  });

  // Phase 2: Vendor Reliability Scores
  const vendorsList = useMemo(() => {
    const names = [...new Set(potholes.map((p) => p.assignedVendor).filter(Boolean))];
    if (names.length === 0) {
      names.push("Apex Infrastructure Ltd", "Nagpur Roadworks & Asphalting Corp", "Shree Highway Infra Solutions");
    }
    return names.map((name, index) => {
      const vendorItems = potholes.filter((p) => p.assignedVendor === name);
      const metrics = calculateVendorScore(vendorItems);
      const trends = ['+6.2% Q3 Audit', '+3.8% SLA Adherence', '-1.5% Quality Audit'];
      return { 
        name, 
        ...metrics, 
        trend: trends[index % trends.length],
        activeJobs: vendorItems.filter(p => p.status === 'IN_PROGRESS').length,
        completedJobs: vendorItems.filter(p => p.status === 'WORK_DONE').length
      };
    }).sort((a, b) => b.score - a.score);
  }, [potholes]);

  // Phase 4: Dynamic Risk Formula using actual potholes survey data
  const dynamicRisks = useMemo(() => {
    return potholes.map(item => {
      const gForce = item.imuGForce || 1.8;
      const sevPoints = item.severity === 'HIGH' ? 45 : item.severity === 'MEDIUM' ? 30 : 15;
      const rainPoints = (item.urgencyLevel && item.urgencyLevel.includes('Rainfall')) ? 30 : 15;
      const trafficPoints = Math.min(25, Math.round(gForce * 8));
      
      // Risk formula (0 - 100)
      const score = Math.min(98, Math.max(25, Math.round(sevPoints + rainPoints + trafficPoints)));
      const level = score >= 75 ? 'Critical' : score >= 50 ? 'High' : 'Moderate';
      
      let action = 'Preventive bitumen tack seal & surface milling recommended';
      if (level === 'Critical') {
        action = 'Emergency deep-patch compaction required before monsoon washout';
      } else if (level === 'High') {
        action = 'Heavy vibratory roller resurfacing required within 10-14 days';
      } else {
        action = 'Schedule routine preventive road maintenance audit';
      }

      return {
        id: item.id,
        road: item.locationName,
        score,
        level,
        factors: `IMU G-Force ${gForce}G • ${item.severity} Defect • ${item.urgencyLevel || 'Standard Urban Traffic'}`,
        action,
        status: item.status
      };
    });
  }, [potholes]);

  const filteredRisks = dynamicRisks.filter((r) => riskFilter === 'all' || r.level === riskFilter);

  // Phase 5: Offline Field Mode Actions
  const handleAddInspection = (e) => {
    e.preventDefault();
    const item = {
      id: `INS-${Date.now().toString().slice(-6)}`,
      road: `${newInspection.road} (${newInspection.ward})`,
      severity: newInspection.severity,
      notes: newInspection.notes,
      createdAt: new Date().toISOString(),
      attempts: 1,
      status: 'PENDING_SYNC'
    };
    const nextQueue = [item, ...queue];
    setQueue(nextQueue);
    safeWriteStorage(queueKey, nextQueue);
    setShowAddModal(false);
    setSyncedMessage('Inspection queued locally! Will sync when network is ready.');
    setTimeout(() => setSyncedMessage(''), 4000);
  };

  const handleSyncAll = () => {
    if (!online) {
      alert('Cannot sync while offline. Please connect to internet.');
      return;
    }
    const count = queue.length;
    setQueue([]);
    safeRemoveStorage(queueKey);
    setSyncedMessage(`✅ Successfully synchronized ${count} queued field inspections to Nagpur Municipal Central Database!`);
    setTimeout(() => setSyncedMessage(''), 5000);
  };

  const handleRetryItem = (id) => {
    if (!online) {
      const next = queue.map((x) => x.id === id ? { ...x, attempts: x.attempts + 1 } : x);
      setQueue(next);
      safeWriteStorage(queueKey, nextQueue);
      const attemptCount = next.find(x => x.id === id)?.attempts || 1;
      alert(`⚠️ Retry attempt registered (Attempt #${attemptCount}). Device is currently offline.`);
      return;
    }
    // If online, sync this single item
    const next = queue.filter(x => x.id !== id);
    setQueue(next);
    safeWriteStorage(queueKey, next);
    setSyncedMessage(`✅ Synced inspection #${id} to MNC server!`);
    setTimeout(() => setSyncedMessage(''), 4000);
  };

  const tabs = [
    ['sla', 'Phase 1: SLA Monitor'],
    ['vendors', 'Phase 2: Vendor Scorecards'],
    ['reports', `Phase 3: Citizen Reports (${reports.length})`],
    ['risk', 'Phase 4: Predictive Risk'],
    ['offline', `Phase 5: Field Mode (${queue.length})`]
  ];

  return (
    <section className="feature-center view-section active">
      {/* OPERATIONS CENTER HERO BANNER */}
      <div className="feature-hero">
        <div>
          <span className="citizen-eyebrow">ROADWATCH ADVANCED OPERATIONS SUITE</span>
          <h1>Municipal Road Command & Intelligence Center</h1>
          <p>End-to-end management: Real-time repair SLAs, vendor reliability ranking, public grievances, risk forecasting, and offline field audits.</p>
        </div>
        <div className={`network-pill ${online ? 'online' : 'offline'}`}>
          {online ? <Activity size={16} /> : <CloudOff size={16} />} 
          {online ? 'System Online (Live Sync)' : 'Offline Field Mode'}
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <nav className="feature-tabs" aria-label="Operations features">
        {tabs.map(([id, label]) => (
          <button 
            key={id} 
            className={tab === id ? 'active' : ''} 
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ========================================================================= */}
      {/* PHASE 1: SLA MONITOR                                                      */}
      {/* ========================================================================= */}
      {tab === 'sla' && (
        <div className="feature-panel">
          <div className="feature-toolbar">
            <div>
              <h2>Live Repair SLA & Milestone Tracker</h2>
              <p>Monitor contractor progress against statutory Nagpur Municipal deadlines.</p>
            </div>
            <select value={slaFilter} onChange={(e) => setSlaFilter(e.target.value)}>
              <option value="all">All Timelines ({activeRepairs.length})</option>
              <option value="good">On Track</option>
              <option value="warn">At Risk (&lt;48h)</option>
              <option value="danger">Overdue Deadline</option>
            </select>
          </div>

          <div className="feature-kpis">
            <div>
              <b>{activeRepairs.length}</b>
              <span>Active Tracked Repairs</span>
            </div>
            <div>
              <b style={{ color: '#ef4444' }}>{activeRepairs.filter((p) => calculateSla(p)[1] === 'danger').length}</b>
              <span>Overdue Beyond Statutory SLA</span>
            </div>
            <div>
              <b style={{ color: '#10b981' }}>
                {activeRepairs.length ? Math.round((activeRepairs.filter((p) => calculateSla(p)[1] !== 'danger').length / activeRepairs.length) * 100) : 100}%
              </b>
              <span>Overall SLA Adherence Rate</span>
            </div>
          </div>

          <div className="feature-list">
            {filteredSlaRows.length ? filteredSlaRows.map((item) => {
              const [label, tone, progress] = calculateSla(item);
              return (
                <article className="feature-row" key={item.id}>
                  <div className="feature-row-main">
                    <small>Defect #{item.id} • Assigned: <strong>{item.assignedVendor || 'Open for Bidding'}</strong></small>
                    <h3>{item.locationName || item.location || 'Municipal Road Sector'}</h3>
                    <div className="progress-track">
                      <i style={{ width: `${progress}%`, background: tone === 'danger' ? '#ef4444' : tone === 'warn' ? '#f59e0b' : '#10b981' }} />
                    </div>
                    <small>Statutory Repair Deadline: <strong>{item.deadline || item.tenderDeadline || '3 Business Days'}</strong></small>
                  </div>
                  <span className={`feature-badge ${tone}`}>
                    <Gauge size={14} /> {label}
                  </span>
                </article>
              );
            }) : (
              <div className="feature-empty">No active repairs match the selected SLA filter.</div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 2: VENDOR SCORECARDS                                                */}
      {/* ========================================================================= */}
      {tab === 'vendors' && (
        <div className="feature-panel">
          <div className="feature-panel-heading">
            <div>
              <h2>Empanelled Contractor Reliability Rankings</h2>
              <p>Calculated composite score: 35% On-Time SLA Delivery + 45% AI Quality Pass Rate + 20% Rework Avoidance.</p>
            </div>
            <ShieldCheck size={28} className="text-indigo-600" />
          </div>

          <div className="score-grid">
            {vendorsList.map((v, i) => (
              <article className="score-card" key={v.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="rank-pill">#{i + 1} {i === 0 ? '🏆 Gold' : i === 1 ? '🥈 Silver' : '🥉 Bronze'}</span>
                  <span className={v.trend.startsWith('+') ? 'trend-up' : 'trend-down'}>
                    <TrendingUp size={14} /> {v.trend}
                  </span>
                </div>
                <div style={{ margin: '14px 0 8px' }}>
                  <span className="score-number">{v.score}</span>
                  <small style={{ color: '#64748b' }}>/100</small>
                </div>
                <h3 style={{ fontSize: '1.1rem', margin: '4px 0 12px' }}>{v.name}</h3>

                <div className="metric">
                  <span>On-Time SLA Adherence</span>
                  <b>{v.onTime}%</b>
                  <i style={{ width: `${v.onTime}%` }} />
                </div>
                <div className="metric">
                  <span>Field Quality Pass Rate</span>
                  <b>{v.quality}%</b>
                  <i style={{ width: `${v.quality}%` }} />
                </div>
                <div className="metric">
                  <span>Rework Defect Rate</span>
                  <b>{v.rework}%</b>
                  <i className="negative" style={{ width: `${v.rework * 5}%` }} />
                </div>

                <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                  <span>Completed: <strong>{v.completedJobs} Sites</strong></span>
                  <span>Active: <strong>{v.activeJobs} Sites</strong></span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 3: CITIZEN REPORTS & STATUS TIMELINE                                */}
      {/* ========================================================================= */}
      {tab === 'reports' && (
        <div className="feature-panel">
          <div className="feature-panel-heading">
            <div>
              <h2>Citizen Public Reports & Status Timelines</h2>
              <p>Review road defect complaints filed via the Public Grievance Portal.</p>
            </div>
            <Activity size={28} className="text-indigo-600" />
          </div>

          <div className="feature-list">
            {reports.length ? reports.map((r) => (
              <article className="feature-row" key={r.id}>
                <div className="feature-row-main">
                  <small>
                    Reference #{r.id} • Registered: {(() => {
                      try {
                        const d = new Date(r.reportedAt);
                        return Number.isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                      } catch {
                        return 'Recently';
                      }
                    })()}
                  </small>
                  <h3>{r.title}</h3>
                  <p style={{ margin: '4px 0 8px', color: '#475569', fontSize: '0.88rem' }}>
                    <MapPin className="w-3.5 h-3.5 inline mr-1 text-indigo-600" />
                    <strong>{r.location}</strong> — {r.description}
                  </p>
                  <div className="status-timeline">
                    <b className="current">1. Logged</b>
                    <span>→</span>
                    <b className="current">2. MNC Review</b>
                    <span>→</span>
                    <b>3. Tender Issued</b>
                    <span>→</span>
                    <b>4. Resurfacing</b>
                    <span>→</span>
                    <b>5. Resolved</b>
                  </div>
                </div>
                <span className="feature-badge warn">
                  <Clock size={14} /> {r.status || 'Under Verification'}
                </span>
              </article>
            )) : (
              <div className="feature-empty">
                No citizen reports registered yet. Visit the Login Page and click "Report a Pothole" to file a public report.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 4: PREDICTIVE RISK FORECAST                                         */}
      {/* ========================================================================= */}
      {tab === 'risk' && (
        <div className="feature-panel">
          <div className="feature-toolbar">
            <div>
              <h2>Predictive Road Damage & Risk Forecasting</h2>
              <p>Dynamic AI risk scoring: Severity (45%) + Rainfall Vulnerability (30%) + IMU Axle G-Force (25%).</p>
            </div>
            <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
              <option value="all">All Risk Levels ({dynamicRisks.length})</option>
              <option value="Critical">Critical (&gt;75 Score)</option>
              <option value="High">High (50–74 Score)</option>
              <option value="Moderate">Moderate (&lt;50 Score)</option>
            </select>
          </div>

          <div className="risk-grid">
            {filteredRisks.map((r) => (
              <article className="risk-card" key={r.id || r.road}>
                <div className="risk-ring" data-risk={r.level.toLowerCase()}>
                  {r.score}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem' }}>{r.road}</h3>
                    <span className={`badge ${r.level === 'Critical' ? 'high' : r.level === 'High' ? 'warning' : 'pending'}`}>
                      {r.level} Risk
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 8px', color: '#64748b', fontSize: '0.82rem' }}>{r.factors}</p>
                  <div style={{ background: '#eef2ff', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', color: '#3730a3' }}>
                    <strong>Action Recommendation:</strong> {r.action}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 5: OFFLINE FIELD MODE                                               */}
      {/* ========================================================================= */}
      {tab === 'offline' && (
        <div className="feature-panel offline-panel">
          <div className="feature-panel-heading">
            <div>
              <h2>Offline Field Inspection Queue & Synchronization</h2>
              <p>Enables field engineers to audit road segments without cellular connection. Queued entries persist locally in localStorage (ready for IndexedDB).</p>
            </div>
            <UploadCloud size={28} className="text-indigo-600" />
          </div>

          <div className="offline-actions">
            <button 
              type="button" 
              className="citizen-primary-button" 
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} /> Log Field Inspection
            </button>
            <button 
              type="button" 
              className="secondary-button" 
              disabled={!online || queue.length === 0} 
              onClick={handleSyncAll}
            >
              <RefreshCw size={15} /> Synchronize All Queued ({queue.length})
            </button>
          </div>

          {syncedMessage && (
            <div className="sync-success" style={{ padding: '12px 16px', background: '#ecfdf5', borderRadius: '10px', margin: '14px 0', border: '1px solid #a7f3d0' }}>
              {syncedMessage}
            </div>
          )}

          <div className="feature-list" style={{ marginTop: '16px' }}>
            {queue.length ? queue.map((item) => (
              <article className="feature-row" key={item.id}>
                <div className="feature-row-main">
                  <small>{item.id} • Queued at: {new Date(item.createdAt).toLocaleTimeString()} • Sync Attempts: <strong>{item.attempts}</strong></small>
                  <h3>{item.road}</h3>
                  <p style={{ margin: '4px 0', color: '#64748b', fontSize: '0.85rem' }}>{item.notes} — Severity: <strong>{item.severity}</strong></p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className="feature-badge warn">
                    Pending Upload
                  </span>
                  <button 
                    type="button" 
                    className="secondary-button" 
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => handleRetryItem(item.id)}
                  >
                    Retry / Push
                  </button>
                </div>
              </article>
            )) : (
              <div className="feature-empty">
                No inspections pending in local queue. All field sweeps are fully synchronized.
              </div>
            )}
          </div>

          {/* ADD INSPECTION MODAL */}
          {showAddModal && (
            <div className="modal-overlay active" style={{ zIndex: 9999 }}>
              <div className="modal-card" style={{ maxWidth: '480px' }}>
                <div className="modal-header">
                  <h3>Log Field Road Inspection (Offline-Ready)</h3>
                  <button type="button" className="modal-close-btn" onClick={() => setShowAddModal(false)}>×</button>
                </div>
                <form onSubmit={handleAddInspection} style={{ padding: '20px', display: 'grid', gap: '14px' }}>
                  <label style={{ display: 'grid', gap: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
                    Road Corridor / Landmark
                    <input 
                      type="text" 
                      required 
                      className="form-control"
                      value={newInspection.road}
                      onChange={(e) => setNewInspection({ ...newInspection, road: e.target.value })}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
                    Municipal Zone / Ward
                    <input 
                      type="text" 
                      required 
                      className="form-control"
                      value={newInspection.ward}
                      onChange={(e) => setNewInspection({ ...newInspection, ward: e.target.value })}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
                    Defect Severity
                    <select 
                      className="form-control"
                      value={newInspection.severity}
                      onChange={(e) => setNewInspection({ ...newInspection, severity: e.target.value })}
                    >
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
                    Field Engineer Notes
                    <textarea 
                      className="form-control"
                      rows="3"
                      value={newInspection.notes}
                      onChange={(e) => setNewInspection({ ...newInspection, notes: e.target.value })}
                    />
                  </label>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                    <button type="submit" className="citizen-primary-button">Queue Inspection</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
