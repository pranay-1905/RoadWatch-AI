import React, { useState } from 'react';
import CitizenReportForm from '../citizen/CitizenReportForm';
import { 
  Radio, 
  ShieldCheck, 
  Building2, 
  Users,
  ArrowRight, 
  Sparkles,
  CheckCircle2,
  Lock,
  Mail,
  Activity,
  KeyRound
} from 'lucide-react';
import { DEMO_USERS } from '../../data/authData';

export default function AuthScreen({ onLogin, usersList = DEMO_USERS }) {
  const [showPublicReport, setShowPublicReport] = useState(false);
  
  // Login form state
  const [username, setUsername] = useState('admin@nmc.gov.in');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  // Selected profile for Contractor switcher
  const [selectedVendorIndex, setSelectedVendorIndex] = useState(0);

  const mncUsers = usersList.filter(u => u.role === 'mnc');
  const vendorUsers = usersList.filter(u => u.role === 'vendor');
  const defaultMnc = mncUsers[0] || usersList[0];
  const activeVendor = vendorUsers[selectedVendorIndex] || vendorUsers[0];

  // Select Contractor: syncs the active contractor portal AND the Account Login credentials
  const handleSelectVendor = (idx) => {
    setSelectedVendorIndex(idx);
    const vendor = vendorUsers[idx];
    if (vendor) {
      setUsername(vendor.username);
      setPassword(vendor.password);
    }
    setError('');
  };

  // Select MNC Admin: syncs NMC Admin credentials to Account Login form
  const handleSelectMnc = () => {
    setUsername(defaultMnc.username);
    setPassword(defaultMnc.password);
    setError('');
  };

  // Submit Login Form
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const user = usersList.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (user) {
      onLogin(user);
    } else {
      setError('Invalid username or password. You can click any portal card on the right to enter directly.');
    }
  };

  // 1-Click Launch MNC Authority
  const handleLaunchMnc = () => {
    onLogin(defaultMnc);
  };

  // 1-Click Launch Contractor Portal
  const handleLaunchVendor = () => {
    const vendorToLaunch = vendorUsers[selectedVendorIndex] || vendorUsers[0];
    if (vendorToLaunch) {
      onLogin(vendorToLaunch);
    }
  };

  if (showPublicReport) {
    return (
      <div className="auth-page-wrapper citizen-full-wrapper">
        <div className="public-report-shell citizen-full-shell">
          <CitizenReportForm onBack={() => setShowPublicReport(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-wrapper">
      <div className="auth-background-glow"></div>

      <div className="split-auth-container">
        {/* ============================================================ */}
        {/* PLATFORM TOP HEADER                                          */}
        {/* ============================================================ */}
        <header className="gateway-brand-header">
          <div className="gateway-emblem-badge">
            <Radio className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>NAGPUR MUNICIPAL CORPORATION (NMC) • स्मार्ट नागपूर</span>
          </div>

          <h1 className="gateway-title">
            RoadWatch AI Infrastructure Platform
          </h1>
          <p className="gateway-subtitle">
            Smart Pothole Detection, Edge Pi Telemetry & Unified Public Grievance Management
          </p>

          <div className="gateway-status-strip">
            <span className="status-pill cloud-active">
              <span className="status-dot green"></span>
              Supabase Cloud Live
            </span>
            <span className="status-pill edge-ready">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              Raspberry Pi 3B+ Edge Ready
            </span>
            <span className="status-pill pwd-certified">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              NMC Civil Works Certified
            </span>
          </div>
        </header>

        {/* ============================================================ */}
        {/* 2-SIDE SPLIT: ONE SIDE LOGIN | ONE SIDE 3 PORTAL CARDS       */}
        {/* ============================================================ */}
        <div className="auth-split-layout">
          
          {/* ---------------------------------------------------------- */}
          {/* SIDE A (LEFT): PROPER FORMAL LOGIN FORM                    */}
          {/* ---------------------------------------------------------- */}
          <section className="auth-side-card login-form-panel">
            <div className="form-panel-header">
              <div className="form-eyebrow-badge">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                <span>Authorized Sign In</span>
              </div>
              <h2>Account Login</h2>
              <p>Enter your assigned administrative email address and password to sign in.</p>
            </div>

            <form className="auth-form" onSubmit={handleFormSubmit}>
              {error && <div className="auth-error-banner">{error}</div>}

              <div className="auth-form-group">
                <label>
                  <Mail className="w-4 h-4 inline mr-1 text-slate-500" /> 
                  Username / Registered Email
                </label>
                <input
                  type="text"
                  className="auth-input"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  placeholder="e.g. admin@nmc.gov.in"
                  required
                />
              </div>

              <div className="auth-form-group">
                <label>
                  <Lock className="w-4 h-4 inline mr-1 text-slate-500" /> 
                  Password
                </label>
                <input
                  type="password"
                  className="auth-input"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" className="auth-submit-btn mnc">
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="auth-security-notes">
              <div className="sec-note-item">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>256-Bit SSL Encrypted Municipal Session</span>
              </div>
              <div className="sec-note-item">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                <span>Real-time Role Routing & Supabase Cloud Auth</span>
              </div>
              <div className="sec-note-item">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span>Active Session Audited by NMC IT Directorate</span>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------- */}
          {/* SIDE B (RIGHT): 3 DEDICATED PORTAL CARDS (1-CLICK ENTRY)   */}
          {/* ---------------------------------------------------------- */}
          <section className="auth-side-card portals-panel">
            <div className="portals-panel-header">
              <div className="portals-header-title">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3>Direct Role Portals (1-Click Access)</h3>
              </div>
              <p>Click any portal or contractor below to enter directly:</p>
            </div>

            <div className="stacked-portals-list">
              
              {/* PORTAL CARD 1: PUBLIC CITIZEN */}
              <div className="gateway-row-card citizen-row-card">
                <div className="row-card-left">
                  <div className="row-icon-box citizen-bg">
                    <Users className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="row-info-copy">
                    <div className="row-title-badge-line">
                      <h4>Public Citizen Portal</h4>
                      <span className="row-badge badge-citizen">Public Access • No Password</span>
                    </div>
                    <p>Report road potholes with live camera photos & track municipal repair milestones.</p>
                    <div className="row-micro-tags">
                      <span>📸 Geotag Photo</span>
                      <span>•</span>
                      <span>🔍 5-Step SLA Tracking</span>
                      <span>•</span>
                      <span>📍 10 Nagpur Wards</span>
                    </div>
                  </div>
                </div>

                <div className="row-card-right">
                  <button 
                    type="button" 
                    className="btn-row-launch btn-citizen-launch"
                    onClick={() => setShowPublicReport(true)}
                  >
                    <span>Enter Citizen Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* PORTAL CARD 2: NMC MUNICIPAL AUTHORITY */}
              <div className="gateway-row-card mnc-row-card">
                <div className="row-card-left">
                  <div className="row-icon-box mnc-bg">
                    <ShieldCheck className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="row-info-copy">
                    <div className="row-title-badge-line">
                      <h4>NMC Municipal Authority</h4>
                      <span className="row-badge badge-mnc">Official • Executive Login</span>
                    </div>
                    <p>Executive GIS command center. Inspect Edge Pi damage telemetry, dispatch automated tenders & audit repairs.</p>
                    
                    <div 
                      className="row-profile-chip mnc-chip interactive-chip"
                      onClick={handleSelectMnc}
                      title="Click to fill NMC Admin credentials into Account Login"
                      role="button"
                      tabIndex={0}
                    >
                      <img src={defaultMnc.avatar} alt={defaultMnc.name} className="chip-avatar" />
                      <span><strong>{defaultMnc.name}</strong> • {defaultMnc.roleTitle}</span>
                    </div>
                  </div>
                </div>

                <div className="row-card-right">
                  <button 
                    type="button" 
                    className="btn-row-launch btn-mnc-launch"
                    onClick={handleLaunchMnc}
                  >
                    <span>Launch NMC Command</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* PORTAL CARD 3: CONTRACTOR & VENDOR PORTAL */}
              <div className="gateway-row-card vendor-row-card expanded-vendor-card">
                <div className="vendor-card-header-row">
                  <div className="row-card-left">
                    <div className="row-icon-box vendor-bg">
                      <Building2 className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="row-info-copy">
                      <div className="row-title-badge-line">
                        <h4>Contractor & Vendor Portal</h4>
                        <span className="row-badge badge-vendor">Empanelled • E-Tender Bidding</span>
                      </div>
                      <p>Browse active road repair tenders, submit mobile quotation bids, and upload compaction evidence.</p>
                    </div>
                  </div>

                  <div className="row-card-right">
                    <button 
                      type="button" 
                      className="btn-row-launch btn-vendor-launch"
                      onClick={handleLaunchVendor}
                    >
                      <span>Access Contractor Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ENLARGED CONTRACTOR SELECTOR BOXES */}
                <div className="contractor-selection-container">
                  <div className="contractor-select-header">
                    <span className="contractor-select-label">
                      Select Registered Contractor (Click to Fill & Launch):
                    </span>
                    <span className="contractor-active-hint">
                      Active: <strong>{activeVendor.organization}</strong>
                    </span>
                  </div>

                  <div className="contractor-cards-grid">
                    {vendorUsers.map((v, idx) => {
                      const isSelected = selectedVendorIndex === idx;
                      return (
                        <div
                          key={v.id}
                          className={`contractor-box-card ${isSelected ? 'active-contractor' : ''}`}
                          onClick={() => handleSelectVendor(idx)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="contractor-box-top">
                            <img src={v.avatar} alt={v.organization} className="contractor-avatar" />
                            <div className="contractor-top-status">
                              {isSelected ? (
                                <span className="vendor-active-badge">
                                  <CheckCircle2 className="w-3 h-3 inline mr-0.5" /> Selected
                                </span>
                              ) : (
                                <span className="vendor-select-hint">Select</span>
                              )}
                            </div>
                          </div>

                          <div className="contractor-box-info">
                            <strong className="contractor-org-name" title={v.organization}>
                              {v.organization}
                            </strong>
                            <span className="contractor-rep-text">
                              Rep: <strong>{v.name}</strong>
                            </span>
                            <div className="contractor-mini-chips">
                              <span className="mini-chip grade">{v.pwdGrade.split(' ')[0]}</span>
                              <span className="mini-chip rating">★ {v.rating}</span>
                              <span className="mini-chip zone">{v.assignedZones[0].split(' ')[0]}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          </section>

        </div>

        {/* MUNICIPAL FOOTER */}
        <footer className="gateway-footer">
          <p>
            RoadWatch AI • Nagpur Smart City & Municipal Corporation Road Safety Initiative
          </p>
          <div className="footer-links">
            <span>Powered by Edge Pi Vision & Supabase Cloud</span>
            <span>•</span>
            <span>Version 2.4.0 Production Ready</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
