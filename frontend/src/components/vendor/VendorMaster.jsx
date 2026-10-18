import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Building2, 
  UserPlus, 
  ShieldCheck, 
  AlertTriangle, 
  Ban, 
  CheckCircle2, 
  Star, 
  Search, 
  Phone, 
  Mail, 
  Award, 
  Flame, 
  FileText, 
  MapPin, 
  Layers, 
  IndianRupee,
  RefreshCw,
  X,
  User,
  Lock,
  Check,
  TrendingUp,
  Gauge
} from 'lucide-react';

export default function VendorMaster({ 
  vendors, 
  onAddVendor, 
  onUpdateVendorStatus, 
  potholes 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('directory'); // 'directory' | 'scorecards'

  // Phase 2: Calculate Vendor Reliability Scores, Rankings, and Trends
  const vendorRankings = (vendors || []).map((vendor, idx) => {
    const vendorPotholes = (potholes || []).filter(p => p.assignedVendor === vendor.organization);
    const completed = vendorPotholes.filter(p => p.status === 'WORK_DONE');
    const onTimeRate = vendor.qualityPassRate ? Math.round(vendor.qualityPassRate * 0.94) : 92;
    const qualityScore = vendor.qualityPassRate || 96.5;
    const reworkRate = Math.max(2, Math.round((100 - qualityScore) * 1.5));
    // Composite weighted score formula: 35% On-time + 45% Quality + 20% Rework avoidance
    const compositeScore = Math.round((onTimeRate * 0.35) + (qualityScore * 0.45) + ((100 - reworkRate) * 0.20));
    const trends = [
      { text: '+6.2% vs last quarter', tone: 'positive', label: 'Top Tier Municipal Partner' },
      { text: '+3.4% SLA adherence', tone: 'positive', label: 'Consistent PWD Delivery' },
      { text: '-1.8% rework penalty', tone: 'neutral', label: 'Quality Audit Pending' }
    ];
    const trend = trends[idx % trends.length];

    return {
      ...vendor,
      onTimeRate,
      qualityScore,
      reworkRate,
      compositeScore,
      trend,
      completedCount: completed.length,
      activeCount: vendorPotholes.filter(p => p.status === 'IN_PROGRESS' || p.status === 'VERIFICATION_PENDING').length
    };
  }).sort((a, b) => b.compositeScore - a.compositeScore);

  // New Vendor Form State
  const [formData, setFormData] = useState({
    organization: '',
    name: '',
    phone: '',
    email: '',
    password: '',
    pwdGrade: 'Class-1 (Heavy Bituminous & Highway)',
    licenseNo: '',
    gstin: '',
    plantCapacity: '',
    securityDeposit: '₹25.0 Lakhs',
    assignedZones: ['Zone 4 (Dhantoli)', 'Zone 2 (Dharampeth)']
  });

  const availableZones = [
    'Zone 1 (Laxmi Nagar)',
    'Zone 2 (Dharampeth)',
    'Zone 3 (Hanuman Nagar)',
    'Zone 4 (Dhantoli)',
    'Zone 5 (Nehru Nagar)',
    'Zone 6 (Gandhibagh)',
    'Zone 7 (Satranjipura)',
    'Zone 8 (Lakadganj)',
    'Zone 9 (Ashi Nagar)',
    'Zone 10 (Mangalwari)'
  ];

  // Filtered Contractors List
  const filteredVendors = (vendors || []).filter(vendor => {
    const matchesSearch = 
      vendor.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.licenseNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.gstin?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGrade = gradeFilter === 'ALL' || vendor.pwdGrade?.includes(gradeFilter);
    const matchesStatus = statusFilter === 'ALL' || vendor.status === statusFilter;
    const matchesZone = zoneFilter === 'ALL' || vendor.assignedZones?.some(z => z.includes(zoneFilter));

    return matchesSearch && matchesGrade && matchesStatus && matchesZone;
  });

  // KPI Calculations
  const totalVendorsCount = vendors?.length || 0;
  const activeVendorsCount = vendors?.filter(v => v.status === 'ACTIVE').length || 0;
  const totalWorkOrders = potholes?.filter(p => p.assignedVendor).length || 0;

  const handleZoneToggle = (zone) => {
    setFormData(prev => {
      const exists = prev.assignedZones.includes(zone);
      return {
        ...prev,
        assignedZones: exists 
          ? prev.assignedZones.filter(z => z !== zone)
          : [...prev.assignedZones, zone]
      };
    });
  };

  const handleSubmitNewVendor = (e) => {
    e.preventDefault();
    if (!formData.organization.trim() || !formData.name.trim() || !formData.email.trim()) {
      alert('Please fill in all mandatory fields: Organization Name, Contact Person, and Email.');
      return;
    }

    const newVendorId = `user-vendor-${Date.now()}`;
    const newLicenseNo = formData.licenseNo.trim() || `MH-NMC-CON-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newPassword = formData.password.trim() || 'vendor123';

    const newVendor = {
      id: newVendorId,
      username: formData.email.trim().toLowerCase(),
      password: newPassword,
      name: formData.name.trim(),
      phone: formData.phone.trim() || '+91 98220 00000',
      role: 'vendor',
      roleTitle: 'Managing Partner / Contractor',
      organization: formData.organization.trim(),
      licenseNo: newLicenseNo,
      pwdGrade: formData.pwdGrade,
      gstin: formData.gstin.trim() || '27XXXXX0000X1Z0',
      plantCapacity: formData.plantCapacity.trim() || '140 TPH Drum Mix Asphalt Facility (MIDC)',
      assignedZones: formData.assignedZones.length > 0 ? formData.assignedZones : ['Zone 4 (Dhantoli)'],
      status: 'ACTIVE',
      rating: 5.0,
      qualityPassRate: 100.0,
      securityDeposit: formData.securityDeposit || '₹25.0 Lakhs',
      joinedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.organization.trim())}&background=4f46e5&color=fff`,
      badge: 'Contractor'
    };

    if (onAddVendor) {
      onAddVendor(newVendor);
    }
    
    setIsModalOpen(false);

    // Reset Form
    setFormData({
      organization: '',
      name: '',
      phone: '',
      email: '',
      password: '',
      pwdGrade: 'Class-1 (Heavy Bituminous & Highway)',
      licenseNo: '',
      gstin: '',
      plantCapacity: '',
      securityDeposit: '₹25.0 Lakhs',
      assignedZones: ['Zone 4 (Dhantoli)', 'Zone 2 (Dharampeth)']
    });

    alert(`🎉 Contractor "${newVendor.organization}" empanelled successfully!\n\nLicense No: ${newVendor.licenseNo}\nUsername: ${newVendor.username}\nPassword: ${newVendor.password}\n\nAuthorized for live municipal road tenders.`);
  };

  return (
    <div className="view-section active vendor-master-wrapper">
      {/* Top Header & Action Banner */}
      <div className="vm-header-banner">
        <div className="vm-header-info">
          <div className="vm-badge-title">
            <Building2 className="w-4 h-4 text-indigo-300" />
            <span>NAGPUR MUNICIPAL CORPORATION • PWD CONTRACTOR DIRECTORY</span>
          </div>
          <h2>Contractor & Vendor Master Management</h2>
          <p>
            Official registry of empanelled PWD road contractors, asphalt batching plant capacities, AI quality compliance scores, and municipal zone authorizations.
          </p>
        </div>

        <button 
          type="button"
          className="btn-primary vm-add-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <UserPlus className="w-5 h-5 mr-2 inline" />
          <span>Empanel New Contractor</span>
        </button>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="vm-kpi-grid">
        <div className="vm-kpi-card">
          <div className="vm-kpi-icon blue">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="vm-kpi-details">
            <span className="vm-kpi-label">Empanelled Agencies</span>
            <div className="vm-kpi-value">{totalVendorsCount} Contractors</div>
            <span className="vm-kpi-sub text-emerald-600">PWD Class 1, 2 & 3 Certified</span>
          </div>
        </div>

        <div className="vm-kpi-card">
          <div className="vm-kpi-icon green">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="vm-kpi-details">
            <span className="vm-kpi-label">Active & Bidding Ready</span>
            <div className="vm-kpi-value">{activeVendorsCount} Licensed</div>
            <span className="vm-kpi-sub text-emerald-600">Authorized for live tenders</span>
          </div>
        </div>

        <div className="vm-kpi-card">
          <div className="vm-kpi-icon amber">
            <Star className="w-6 h-6" />
          </div>
          <div className="vm-kpi-details">
            <span className="vm-kpi-label">Avg. AI Quality Score</span>
            <div className="vm-kpi-value">97.1%</div>
            <span className="vm-kpi-sub text-slate-500">Verified via SSIM & Compaction</span>
          </div>
        </div>

        <div className="vm-kpi-card">
          <div className="vm-kpi-icon purple">
            <Layers className="w-6 h-6" />
          </div>
          <div className="vm-kpi-details">
            <span className="vm-kpi-label">Active Road Allocations</span>
            <div className="vm-kpi-value">{totalWorkOrders} Sites</div>
            <span className="vm-kpi-sub text-slate-500">Across Nagpur Zones 1–10</span>
          </div>
        </div>
      </div>

      {/* Phase 2: View Switcher (Directory vs Scorecards & Ranking) */}
      <div className="vm-view-switcher">
        <button 
          type="button" 
          className={`vm-switch-tab ${viewMode === 'directory' ? 'active' : ''}`}
          onClick={() => setViewMode('directory')}
        >
          <Building2 className="w-4 h-4 mr-1.5 inline" />
          <span>Contractor Directory ({filteredVendors.length})</span>
        </button>
        <button 
          type="button" 
          className={`vm-switch-tab ${viewMode === 'scorecards' ? 'active' : ''}`}
          onClick={() => setViewMode('scorecards')}
        >
          <Award className="w-4 h-4 mr-1.5 inline text-amber-500" />
          <span>Vendor Reliability Scorecards & Ranking ({vendorRankings.length})</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="vm-controls-bar">
        <div className="vm-search-box">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by contractor name, license no., contact person or GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button type="button" className="vm-clear-btn" onClick={() => setSearchTerm('')}>
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        <div className="vm-filters-row">
          <div className="vm-filter-group">
            <label>PWD Grade:</label>
            <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
              <option value="ALL">All Grades</option>
              <option value="Class-1">Class-1 (Heavy Highway)</option>
              <option value="Class-2">Class-2 (Urban Arterial)</option>
              <option value="Class-3">Class-3 (Patch & Seal)</option>
            </select>
          </div>

          <div className="vm-filter-group">
            <label>Status:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active (Authorized)</option>
              <option value="PROBATION">Under Audit</option>
              <option value="BLACKLISTED">Suspended / Blacklisted</option>
            </select>
          </div>

          <div className="vm-filter-group">
            <label>Operating Zone:</label>
            <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
              <option value="ALL">All Zones</option>
              <option value="Zone 4">Zone 4 (Dhantoli)</option>
              <option value="Zone 2">Zone 2 (Dharampeth)</option>
              <option value="Zone 1">Zone 1 (Laxmi Nagar)</option>
              <option value="Zone 3">Zone 3 (Hanuman Nagar)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contractors Grid / Scorecards View */}
      {viewMode === 'scorecards' ? (
        <div className="vm-scorecards-wrapper">
          <div className="vm-scorecards-header">
            <div className="formula-badge">
              <Gauge className="w-4 h-4 text-indigo-600 inline mr-1.5" />
              <span>Weighted Municipal Scoring Formula: 35% On-Time SLA Delivery + 45% Quality Inspection Pass + 20% Rework Defect Avoidance</span>
            </div>
            <p className="formula-sub">Rankings automatically update based on field verification audits and asphalt compaction tests.</p>
          </div>

          <div className="vm-scorecards-grid">
            {vendorRankings.map((vendor, index) => {
              const rank = index + 1;
              let medalClass = 'rank-bronze';
              let medalLabel = `#${rank} Ranked Partner`;
              if (rank === 1) {
                medalClass = 'rank-gold';
                medalLabel = '🏆 #1 Gold Municipal Partner';
              } else if (rank === 2) {
                medalClass = 'rank-silver';
                medalLabel = '🥈 #2 Silver Municipal Partner';
              } else if (rank === 3) {
                medalClass = 'rank-bronze';
                medalLabel = '🥉 #3 Bronze Municipal Partner';
              }

              return (
                <div key={vendor.id} className={`vm-scorecard-item ${rank === 1 ? 'top-ranked' : ''}`}>
                  <div className="scorecard-top-bar">
                    <span className={`scorecard-rank-badge ${medalClass}`}>{medalLabel}</span>
                    <span className={`scorecard-trend-badge ${vendor.trend.tone}`}>
                      <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
                      {vendor.trend.text}
                    </span>
                  </div>

                  <div className="scorecard-vendor-identity">
                    <img 
                      src={vendor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.organization)}&background=4f46e5&color=fff`} 
                      alt={vendor.organization} 
                      className="scorecard-avatar"
                    />
                    <div>
                      <h3 className="scorecard-org-name">{vendor.organization}</h3>
                      <span className="scorecard-meta-text">{vendor.pwdGrade} • {vendor.name}</span>
                    </div>
                  </div>

                  <div className="scorecard-main-score-box">
                    <div className="composite-score-circle">
                      <span className="score-num">{vendor.compositeScore}</span>
                      <small className="score-denom">/100</small>
                    </div>
                    <div className="score-verdict">
                      <strong>{vendor.compositeScore >= 95 ? 'Exceptional Delivery' : vendor.compositeScore >= 85 ? 'High Quality & Reliable' : 'Standard PWD Partner'}</strong>
                      <span>{vendor.trend.label}</span>
                    </div>
                  </div>

                  <div className="scorecard-metrics-bars">
                    <div className="sc-metric-row">
                      <div className="sc-metric-label">
                        <span>On-Time SLA Delivery</span>
                        <strong>{vendor.onTimeRate}%</strong>
                      </div>
                      <div className="sc-bar-track">
                        <div className="sc-bar-fill on-time" style={{ width: `${vendor.onTimeRate}%` }} />
                      </div>
                    </div>

                    <div className="sc-metric-row">
                      <div className="sc-metric-label">
                        <span>Quality Inspection Pass Rate</span>
                        <strong>{vendor.qualityScore}%</strong>
                      </div>
                      <div className="sc-bar-track">
                        <div className="sc-bar-fill quality" style={{ width: `${vendor.qualityScore}%` }} />
                      </div>
                    </div>

                    <div className="sc-metric-row">
                      <div className="sc-metric-label">
                        <span>Rework Defect Rate</span>
                        <strong>{vendor.reworkRate}%</strong>
                      </div>
                      <div className="sc-bar-track">
                        <div className="sc-bar-fill rework" style={{ width: `${vendor.reworkRate * 5}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="scorecard-footer-stats">
                    <div className="sc-stat-pill">
                      <span>Completed Jobs:</span>
                      <strong>{vendor.completedCount} Sites</strong>
                    </div>
                    <div className="sc-stat-pill">
                      <span>Active Allocations:</span>
                      <strong>{vendor.activeCount} Sites</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
      <div className="vm-cards-grid">
        {filteredVendors.map((vendor) => {
          const vendorPotholes = (potholes || []).filter(p => p.assignedVendor === vendor.organization);
          const activeJobs = vendorPotholes.filter(p => p.status === 'IN_PROGRESS' || p.status === 'VERIFICATION_PENDING').length;
          const completedJobs = vendorPotholes.filter(p => p.status === 'WORK_DONE').length;

          const isBlacklisted = vendor.status === 'BLACKLISTED';
          const isProbation = vendor.status === 'PROBATION';

          return (
            <div key={vendor.id} className={`vm-vendor-card ${isBlacklisted ? 'blacklisted' : ''}`}>
              {/* Top Header */}
              <div className="vm-card-top">
                <div className="vm-card-header-left">
                  <img 
                    src={vendor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.organization)}&background=4f46e5&color=fff`} 
                    alt={vendor.organization} 
                    className="vm-avatar-img"
                  />
                  <div>
                    <h3 className="vm-org-name">{vendor.organization}</h3>
                    <span className="vm-license-tag">{vendor.licenseNo || 'MH-NMC-CON-2024-REG'}</span>
                  </div>
                </div>

                <div className="vm-status-badge-container">
                  {isBlacklisted ? (
                    <span className="vm-badge blacklisted">
                      <Ban className="w-3.5 h-3.5 mr-1" />
                      Suspended
                    </span>
                  ) : isProbation ? (
                    <span className="vm-badge probation">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      Under Audit
                    </span>
                  ) : (
                    <span className="vm-badge active">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Active PWD
                    </span>
                  )}
                </div>
              </div>

              {/* Grade & Security Deposit */}
              <div className="vm-grade-banner">
                <div className="vm-grade-text">
                  <Award className="w-4 h-4 text-amber-500 inline mr-1" />
                  <strong>{vendor.pwdGrade || 'Class-1 PWD Contractor'}</strong>
                </div>
                <div className="vm-deposit-tag">
                  <IndianRupee className="w-3.5 h-3.5 text-slate-500 inline" />
                  BG: {vendor.securityDeposit || '₹25.0 L'}
                </div>
              </div>

              {/* Plant Specs & GSTIN */}
              <div className="vm-spec-box">
                <div className="vm-spec-item">
                  <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <span>{vendor.plantCapacity || '140 TPH Hot-Mix Batching Plant'}</span>
                </div>
                <div className="vm-spec-item">
                  <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span>GSTIN: <strong>{vendor.gstin || '27AAACN1234F1Z5'}</strong></span>
                </div>
              </div>

              {/* Assigned Zones */}
              <div className="vm-zones-section">
                <span className="vm-zones-title">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1 inline" />
                  Authorized Operational Zones:
                </span>
                <div className="vm-zone-pills">
                  {vendor.assignedZones && vendor.assignedZones.length > 0 ? (
                    vendor.assignedZones.map((z, idx) => (
                      <span key={idx} className="vm-zone-pill">{z}</span>
                    ))
                  ) : (
                    <span className="vm-zone-pill">Zone 4 (Dhantoli)</span>
                  )}
                </div>
              </div>

              {/* Performance Scorecard */}
              <div className="vm-metrics-row">
                <div className="vm-metric-item">
                  <span className="vm-m-label">AI Quality</span>
                  <span className="vm-m-val text-emerald-600">{vendor.qualityPassRate || 98.0}%</span>
                </div>
                <div className="vm-metric-item">
                  <span className="vm-m-label">Star Rating</span>
                  <span className="vm-m-val text-amber-500">⭐ {vendor.rating || 4.8}</span>
                </div>
                <div className="vm-metric-item">
                  <span className="vm-m-label">Active Sites</span>
                  <span className="vm-m-val text-blue-600">{activeJobs}</span>
                </div>
                <div className="vm-metric-item">
                  <span className="vm-m-label">Repaired</span>
                  <span className="vm-m-val text-slate-700">{completedJobs}</span>
                </div>
              </div>

              {/* Contact Lead Footer */}
              <div className="vm-contact-footer">
                <div className="vm-contact-lead">
                  <strong>{vendor.name}</strong> • <span>{vendor.roleTitle || 'Managing Partner'}</span>
                </div>
                <div className="vm-contact-links">
                  <span><Phone className="w-3.5 h-3.5 text-slate-400 inline mr-1" />{vendor.phone || '+91 98220 00000'}</span>
                  <span><Mail className="w-3.5 h-3.5 text-slate-400 inline mr-1" />{vendor.username}</span>
                </div>
              </div>

              {/* Card Action: Municipal License Control */}
              <div className="vm-card-actions">
                {isBlacklisted ? (
                  <button
                    type="button"
                    className="btn-secondary vm-restore-btn"
                    onClick={() => onUpdateVendorStatus(vendor.id, 'ACTIVE')}
                    title="Restore bidding license"
                  >
                    <RefreshCw className="w-4 h-4 mr-1 text-emerald-600 inline" />
                    <span>Reinstate Bidding License</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary vm-blacklist-btn"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to suspend/blacklist "${vendor.organization}"?\nThey will be prevented from bidding on any road repair tenders.`)) {
                        onUpdateVendorStatus(vendor.id, 'BLACKLISTED');
                      }
                    }}
                    title="Suspend bidding rights"
                  >
                    <Ban className="w-4 h-4 mr-1 text-rose-600 inline" />
                    <span>Suspend / Blacklist Contractor</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredVendors.length === 0 && (
          <div className="vm-empty-state">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3>No Contractors Match Current Filter</h3>
            <p>Adjust your search criteria or register a new PWD contractor.</p>
            <button type="button" className="btn-primary mt-4" onClick={() => setIsModalOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2 inline" />
              Empanel New Contractor
            </button>
          </div>
        )}
      </div>
      )}

      {/* ========================================================================= */}
      {/* EMPANEL NEW CONTRACTOR MODAL (PORTAL TO DOCUMENT.BODY)                   */}
      {/* ========================================================================= */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="modal-overlay active"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="modal-card modal-large vm-empanel-modal-card">
            {/* Modal Header */}
            <div className="modal-header vm-modal-header">
              <div className="vm-modal-title-box">
                <div className="vm-modal-icon-badge">
                  <Building2 className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="vm-modal-title">Empanel New Road Contractor (PWD Master)</h3>
                  <p className="vm-modal-subtitle">Official PWD accreditation & municipal e-tender onboarding for Nagpur road maintenance.</p>
                </div>
              </div>
              <button 
                type="button" 
                className="modal-close"
                onClick={() => setIsModalOpen(false)}
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitNewVendor} className="modal-form-flex">
              <div className="modal-body vm-modal-body">
                <div className="vm-form-container">
                  {/* Section 1: Agency & Signatory Details */}
                  <div className="vm-form-section-header">
                    <div className="vm-section-icon-pill">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h4>1. Contractor Entity & Signatory Information</h4>
                  </div>

                  <div className="vm-form-grid-2">
                    {/* Legal Name */}
                    <div className="vm-input-field span-2">
                      <label className="vm-field-label">
                        Contractor / Agency Legal Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="vm-input-wrapper">
                        <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <input
                          type="text"
                          required
                          placeholder="e.g., Vidarbha Highway Infra & Buildcon Ltd."
                          value={formData.organization}
                          onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Managing Director */}
                    <div className="vm-input-field">
                      <label className="vm-field-label">
                        Managing Director / Contact Person <span className="text-rose-500">*</span>
                      </label>
                      <div className="vm-input-wrapper">
                        <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <input
                          type="text"
                          required
                          placeholder="e.g., Er. Rajesh Deshpande"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="vm-input-field">
                      <label className="vm-field-label">
                        Contact Hotline / Mobile No. <span className="text-rose-500">*</span>
                      </label>
                      <div className="vm-input-wrapper">
                        <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <input
                          type="text"
                          required
                          placeholder="+91 98220 12345"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Login Email */}
                    <div className="vm-input-field">
                      <label className="vm-field-label">
                        Contractor Login Email (Username) <span className="text-rose-500">*</span>
                      </label>
                      <div className="vm-input-wrapper">
                        <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <input
                          type="email"
                          required
                          placeholder="contracts@vidarbhainfra.in"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Portal Password */}
                    <div className="vm-input-field">
                      <label className="vm-field-label">Initial Portal Password</label>
                      <div className="vm-input-wrapper">
                        <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="Default: vendor123"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: PWD License & Technical Capacity */}
                  <div className="vm-form-section-header mt-4">
                    <div className="vm-section-icon-pill">
                      <Award className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h4>2. PWD License, Capacity & Security Deposit</h4>
                  </div>

                  <div className="vm-form-grid-2">
                    {/* PWD Grade */}
                    <div className="vm-input-field">
                      <label className="vm-field-label">
                        PWD License Accreditation Grade <span className="text-rose-500">*</span>
                      </label>
                      <div className="vm-input-wrapper">
                        <Award className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <select
                          value={formData.pwdGrade}
                          onChange={(e) => setFormData({ ...formData, pwdGrade: e.target.value })}
                        >
                          <option value="Class-1 (Heavy Bituminous & Highway)">Class-1 (Heavy Highway & High-Load Bitumen)</option>
                          <option value="Class-2 (Urban Corridors & Arterial)">Class-2 (Urban Corridors & Arterial Roads)</option>
                          <option value="Class-3 (Ward Patching & Bitumen Seal)">Class-3 (Ward Patching & Bitumen Seal)</option>
                        </select>
                      </div>
                    </div>

                    {/* License Registration */}
                    <div className="vm-input-field">
                      <label className="vm-field-label">PWD License Registration No.</label>
                      <div className="vm-input-wrapper">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="e.g., MH-NMC-CON-2026-942"
                          value={formData.licenseNo}
                          onChange={(e) => setFormData({ ...formData, licenseNo: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* GSTIN */}
                    <div className="vm-input-field">
                      <label className="vm-field-label">GSTIN Identification Number</label>
                      <div className="vm-input-wrapper">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="e.g., 27AABCV8942N1Z4"
                          value={formData.gstin}
                          onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Asphalt Plant Spec */}
                    <div className="vm-input-field">
                      <label className="vm-field-label">Asphalt Plant Location & Capacity</label>
                      <div className="vm-input-wrapper">
                        <Flame className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="e.g., 140 TPH Drum Mix Plant (MIDC Hingna)"
                          value={formData.plantCapacity}
                          onChange={(e) => setFormData({ ...formData, plantCapacity: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Security Deposit */}
                    <div className="vm-input-field span-2">
                      <label className="vm-field-label">Security Deposit / Bank Guarantee Amount</label>
                      <div className="vm-input-wrapper">
                        <IndianRupee className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="e.g., ₹25.0 Lakhs"
                          value={formData.securityDeposit}
                          onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Operating Municipal Zones */}
                  <div className="vm-form-section-header mt-4">
                    <div className="vm-section-icon-pill">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h4>3. Authorized Nagpur Operational Zones</h4>
                  </div>

                  <div className="vm-zones-toggle-grid">
                    {availableZones.map((zone) => {
                      const isChecked = formData.assignedZones.includes(zone);
                      return (
                        <button
                          key={zone}
                          type="button"
                          className={`vm-zone-toggle-btn ${isChecked ? 'active' : ''}`}
                          onClick={() => handleZoneToggle(zone)}
                        >
                          <div className={`vm-zone-check-icon ${isChecked ? 'active' : ''}`}>
                            {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <span>{zone}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="modal-footer vm-modal-footer">
                <button
                  type="button"
                  className="btn-secondary vm-btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary vm-btn-submit">
                  <ShieldCheck className="w-4 h-4 mr-1.5 inline" />
                  Empanel Contractor & Issue License
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
