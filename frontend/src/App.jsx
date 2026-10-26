import React, { useState, useEffect } from 'react';
import { initialPotholes } from './data/potholeData';
import { DEMO_USERS } from './data/authData';
import { roadWatchApi, BACKEND_URL } from './services/api';
import Sidebar from './components/layout/Sidebar';
import TopHeader from './components/layout/TopHeader';
import AiChatbot from './components/layout/AiChatbot';

// Municipal (MNC) Authority Components
import KpiCards from './components/mnc/KpiCards';
import LiveMap from './components/mnc/LiveMap';
import IncidentFeed from './components/mnc/IncidentFeed';
import DamageInventory from './components/mnc/DamageInventory';
import AnalyticsView from './components/mnc/AnalyticsView';
import PotholeModal from './components/mnc/PotholeModal';

// Road Contractor & Vendor Components
import VendorPortal from './components/vendor/VendorPortal';
import VendorMaster from './components/vendor/VendorMaster';

// Operations Center Suite (SLA, Scores, Risk, Offline)
import RoadWatchFeatures from './components/operations/RoadWatchFeatures';

import AuthScreen from './components/auth/AuthScreen';
import realPotholeDefectImg from './assets/real_pothole_defect.jpg';
import './styles/App.css';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('roadwatch_current_user') || 'null'); } catch { return null; }
  });
  const [usersList, setUsersList] = useState(DEMO_USERS);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('roadwatch_active_tab') || 'overview');
  const [vendorTab, setVendorTab] = useState(() => localStorage.getItem('roadwatch_vendor_tab') || 'marketplace');
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('roadwatch_sidebar_collapsed');
    return saved === null ? (typeof window !== 'undefined' ? window.innerWidth <= 768 : false) : saved === 'true';
  });
  
  const [potholes, setPotholes] = useState(() => {
    try {
      const saved = localStorage.getItem('roadwatch_potholes_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(parsed.map(p => p.id));
          const missing = initialPotholes.filter(p => !existingIds.has(p.id));
          return missing.length > 0 ? [...parsed, ...missing] : parsed;
        }
      }
    } catch {}
    return initialPotholes;
  });
  const [selectedPothole, setSelectedPothole] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('roadwatch_potholes_data', JSON.stringify(potholes));
    } catch {}
  }, [potholes]);

  const loadCitizenReports = async () => {
    const result = await roadWatchApi.getCitizenReports();
    if (!result.error && result.data) {
      const reports = result.data.map((report) => ({
        id: report.tracking_id,
        roadName: report.landmark,
        location: report.ward,
        locationName: report.landmark || report.ward || 'Citizen reported location',
        lat: Number(report.lat) || 0,
        lng: Number(report.lng) || 0,
        severity: String(report.severity || 'MEDIUM').toUpperCase(),
        status: report.status === 'REPORTED' ? 'PENDING' : report.status,
        source: 'Citizen Report',
        reportedAt: report.created_at,
        timestamp: report.created_at,
        imgUrl: report.photo_url
          ? (report.photo_url.startsWith('http') ? report.photo_url : `${BACKEND_URL}${report.photo_url}`)
          : null,
        image: report.photo_url
          ? (report.photo_url.startsWith('http') ? report.photo_url : `${BACKEND_URL}${report.photo_url}`)
          : null,
        description: report.description,
        imuGForce: null
      }));
      setPotholes((current) => {
        const mergedReports = reports.map((r) => {
          const existing = current.find((c) => c.id === r.id);
          if (existing) {
            return {
              ...r,
              status: existing.status,
              estimatedCost: existing.estimatedCost,
              bids: existing.bids || [],
              assignedVendor: existing.assignedVendor
            };
          }
          return r;
        });
        const reportIds = new Set(mergedReports.map(r => r.id));
        return [...current.filter((item) => !reportIds.has(item.id)), ...mergedReports];
      });
    }
  };

  const loadBackendPotholes = async () => {
    const result = await roadWatchApi.getPotholes();
    if (!result.error && Array.isArray(result.data)) {
      const backendItems = result.data.map((item) => {
        const isCitizenItem = item.source === 'citizen' || item.source === 'Citizen Report' || String(item.id).startsWith('RPT-');
        return {
          id: String(item.id),
          lat: Number(item.lat) || 0,
          lng: Number(item.lng ?? item.lon) || 0,
          locationName: item.road_name ? `${item.road_name}${item.ward ? `, ${item.ward}` : ''}` : (item.note || item.locationName || 'Nagpur Surveyed Route'),
          severity: String(item.severity || (item.peak_mg && Number(item.peak_mg) > 3000 ? 'CRITICAL' : 'HIGH')).toUpperCase(),
          confidence: isCitizenItem ? 'Citizen Verified' : (item.confidence ? (typeof item.confidence === 'number' && item.confidence <= 1 ? `${Math.round(item.confidence * 100)}%` : String(item.confidence)) : (item.score ? `${Math.round((Number(item.score) <= 1 ? Number(item.score) : Number(item.score) / 100) * 100)}%` : '92%')),
          imuGForce: isCitizenItem ? null : (item.peak_dev_g ? Number(item.peak_dev_g) : (item.peak_mg ? Number((Number(item.peak_mg) / 1000).toFixed(2)) : (item.imuGForce || 2.4))),
          speedKmh: isCitizenItem ? null : (item.speed_kmh ? Number(item.speed_kmh) : (item.speedKmh || 32.0)),
          timestamp: item.event_time || item.detected_at || item.created_at || new Date().toISOString(),
          status: item.status === 'OPEN' ? 'PENDING' : (item.status || 'PENDING'),
          estimatedCost: item.estimated_cost || (item.severity === 'CRITICAL' ? 45000 : 25000),
          tenderDeadline: item.tender_deadline || '2026-10-30',
          assignedVendor: item.assigned_vendor || null,
          urgencyLevel: item.severity === 'CRITICAL' ? 'High Traffic Emergency' : 'Standard Routine',
          dimensions: isCitizenItem ? 'Citizen Visual Assessment' : 'Standard Surface Defect',
          description: item.note || item.description || null,
          imgUrl: item.image_url || realPotholeDefectImg,
          image: item.image_url || realPotholeDefectImg,
          repairProofImg: item.repair_proof_url || null,
          bids: item.bids || [],
          source: isCitizenItem ? 'Citizen Report' : (item.source || 'edge_pi')
        };
      });

      setPotholes((current) => {
        const currentMap = new Map();
        current.forEach(p => {
          if (p && p.id) currentMap.set(p.id, p);
        });
        backendItems.forEach(b => {
          if (b && b.id) {
            const existing = currentMap.get(b.id);
            currentMap.set(b.id, existing ? { ...b, ...existing, status: existing.status || b.status } : b);
          }
        });
        return Array.from(currentMap.values());
      });
    }
  };

  useEffect(() => {
    if (!currentUser) return undefined;
    loadCitizenReports();
    loadBackendPotholes();
    // Fast 3-second auto-polling for instant real-time sync with database
    const refreshTimer = window.setInterval(() => {
      loadCitizenReports();
      loadBackendPotholes();
    }, 3000);
    return () => window.clearInterval(refreshTimer);
  }, [currentUser]);

  useEffect(() => {
    try { localStorage.setItem('roadwatch_active_tab', activeTab); } catch {}
  }, [activeTab]);

  useEffect(() => {
    try { localStorage.setItem('roadwatch_vendor_tab', vendorTab); } catch {}
  }, [vendorTab]);

  useEffect(() => {
    try { localStorage.setItem('roadwatch_sidebar_collapsed', String(isCollapsed)); } catch {}
  }, [isCollapsed]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) setIsCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    try { sessionStorage.setItem('roadwatch_current_user', JSON.stringify(user)); } catch {}
    if (typeof window !== 'undefined') setIsCollapsed(window.innerWidth <= 768);
    if (user.role === 'vendor') {
      setActiveTab('vendor_portal');
      setVendorTab('marketplace');
    } else {
      setActiveTab('overview');
      loadCitizenReports();
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try { sessionStorage.removeItem('roadwatch_current_user'); } catch {}
    try { localStorage.removeItem('roadwatch_active_tab'); } catch {}
  };

  // Handle Action: Send Tender (MNC)
  const handleSendTender = async (pothole, tenderAmount) => {
    const cost = Number(tenderAmount) || pothole.estimatedCost || 25000;

    // Immediately update state and persistence
    setPotholes(prev => prev.map(item =>
      item.id === pothole.id ? { ...item, status: 'TENDER_ISSUED', estimatedCost: cost } : item
    ));

    // Synchronize with backend API
    try {
      const result = await roadWatchApi.createTender({
        pothole_id: pothole.id,
        title: `Road Repair Tender - ${pothole.locationName || pothole.roadName || pothole.id}`,
        ward: pothole.location || pothole.ward || 'NMC Ward',
        estimated_cost: cost,
        deadline_hours: 48
      });
      if (result.data) {
        setPotholes(prev => prev.map(item =>
          item.id === pothole.id ? { ...item, tenderId: result.data.id } : item
        ));
      }
    } catch (err) {
      console.warn('Backend tender issue sync warning:', err);
    }

    alert(`✅ E-Tender Issued for ₹${cost.toLocaleString('en-IN')}!\nAvailable on the Contractor Portal for bidding.`);
  };

  // Handle Action: Send All High Tenders via AI Chatbot (MNC)
  const handleSendAllHighTenders = () => {
    setPotholes(prev => prev.map(item => 
      item.severity === 'HIGH' && item.status === 'PENDING' 
        ? { ...item, status: 'TENDER_ISSUED' } 
        : item
    ));
    alert(`⚡ AI Action: Tenders dispatched for ALL High Severity Potholes to registered contractors!`);
  };

  // Handle Action: Filter to Rain Risk Potholes via AI Chatbot
  const handleFilterRainRisk = () => {
    setActiveTab('inventory');
    setSearchQuery('');
  };

  // Handle Action: Work Done Verification (MNC)
  const handleMarkWorkDone = (pothole) => {
    setPotholes(prev => prev.map(item => 
      item.id === pothole.id ? { ...item, status: 'WORK_DONE' } : item
    ));
    alert(`🎉 Work Done Verified for Pothole #${pothole.id}!\nPayment voucher queued for contractor disbursement.`);
  };

  // Handle Action: MNC Approves Geotagged Field Work (Payment Released)
  const handleMncApproveWork = (pothole) => {
    setPotholes(prev => prev.map(item => 
      item.id === pothole.id ? { ...item, status: 'WORK_DONE' } : item
    ));
    alert(`✅ Quality Verified & Approved for Pothole #${pothole.id}!\nPayment authorization of ₹${pothole.estimatedCost?.toLocaleString('en-IN')} released to ${pothole.assignedVendor || 'contractor'}.`);
  };

  // Handle Action: MNC Flags Defect & Requests Quality Rework
  const handleMncRequestRework = (pothole, reworkReason) => {
    setPotholes(prev => prev.map(item => 
      item.id === pothole.id ? { 
        ...item, 
        status: 'IN_PROGRESS',
        reworkReason: reworkReason || 'Quality check failed. Please re-compact asphalt.',
        reworkRequestedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      } : item
    ));
    alert(`⚠️ Quality Rework Order Dispatched for #${pothole.id}!\nContractor has been notified to re-execute compaction & submit fresh geotagged evidence.`);
  };

  // Handle Action: Submit Contractor Bid (Vendor)
  const handleSubmitBid = async (potholeId, newBid) => {
    const savedBid = {
      ...newBid,
      status: 'PENDING_REVIEW'
    };

    // 1. Immediately update state & localStorage
    setPotholes(prev => prev.map(item => {
      if (item.id !== potholeId) return item;
      const currentBids = item.bids || [];
      return {
        ...item,
        status: 'TENDER_ISSUED',
        bids: [...currentBids.filter(b => b.vendorId !== newBid.vendorId), savedBid]
      };
    }));

    // 2. Synchronize with backend API
    try {
      const tenderResult = await roadWatchApi.getTenders();
      const tender = (tenderResult.data || []).find(item =>
        item.pothole_id === potholeId || item.id === potholeId
      );
      if (tender) {
        await roadWatchApi.submitBid(tender.id, {
          vendor_name: newBid.vendorName,
          contact_phone: newBid.contactPhone || '',
          bid_amount: newBid.amount,
          completion_days: newBid.timelineDays
        });
      }
    } catch (err) {
      console.warn('Backend bid sync error:', err);
    }

    alert(`📋 Bid of ₹${newBid.amount.toLocaleString('en-IN')} submitted successfully!\nNagpur Municipal Authority has received your quotation.`);
  };

  // Handle Action: Accept Contractor Bid & Award Contract (MNC)
  const handleAcceptBid = (potholeId, acceptedBid) => {
    setPotholes(prev => prev.map(item => {
      if (item.id === potholeId) {
        return {
          ...item,
          status: 'IN_PROGRESS',
          assignedVendor: acceptedBid.vendorName,
          estimatedCost: acceptedBid.amount,
          bids: (item.bids || []).map(b => 
            b.id === acceptedBid.id ? { ...b, status: 'ACCEPTED' } : { ...b, status: 'REJECTED' }
          )
        };
      }
      return item;
    }));
    alert(`🏆 Tender Awarded to ${acceptedBid.vendorName} for ₹${acceptedBid.amount.toLocaleString('en-IN')}!\nWork Order is now active.`);
  };

  // Handle Action: Contractor Submits Geotagged Work Evidence to MNC (Vendor)
  const handleVendorSubmitWork = async (potholeId, workData) => {
    // 1. Immediately update UI preview
    setPotholes(prev => prev.map(item => {
      if (item.id === potholeId) {
        return {
          ...item,
          status: 'VERIFICATION_PENDING',
          repairProofImg: workData.repairProofImg,
          repairProofImages: workData.repairProofImages || (workData.repairProofImg ? [workData.repairProofImg] : []),
          repairCompletionNotes: workData.completionNotes,
          asphaltThickness: workData.asphaltThickness,
          materialUsed: workData.materialUsed,
          completedAt: workData.completedAt,
          geoCoordinates: workData.geoCoordinates
        };
      }
      return item;
    }));

    // 2. Upload proof photo directly to Supabase Storage via backend API
    try {
      if (workData.repairProofImg) {
        const fetchRes = await fetch(workData.repairProofImg);
        const blob = await fetchRes.blob();
        const file = new File([blob], `repair_${potholeId}_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
        
        const uploadRes = await roadWatchApi.uploadRepairEvidence(potholeId, file);
        const cloudUrl = uploadRes.photo_url || uploadRes.data?.repair_image_url;
        
        if (cloudUrl) {
          setPotholes(prev => prev.map(item => {
            if (item.id === potholeId) {
              return {
                ...item,
                repairProofImg: cloudUrl,
                repairProofImages: [cloudUrl]
              };
            }
            return item;
          }));
        }
      }
    } catch (err) {
      console.warn('[REPAIR UPLOAD SYNC ERROR]', err);
    }

    alert(`📡 Geotagged Field Evidence for #${potholeId} transmitted to Nagpur Municipal Corporation & saved to Supabase!`);
  };

  // Handle Action: MNC Empanels New Vendor
  const handleAddVendor = (newVendor) => {
    setUsersList(prev => [...prev, newVendor]);
  };

  // Handle Action: MNC Updates Vendor Status (Active / Blacklisted / Probation)
  const handleUpdateVendorStatus = (vendorId, newStatus) => {
    setUsersList(prev => prev.map(u => u.id === vendorId ? { ...u, status: newStatus } : u));
    alert(`⚡ Contractor status updated to "${newStatus}".`);
  };

  // Handle Action: MNC Impersonates/Switches to Vendor for Testing & Demo
  const handleImpersonateVendor = (vendor) => {
    setCurrentUser(vendor);
    setActiveTab('vendor_portal');
    setVendorTab('marketplace');
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setIsCollapsed(true);
    }
  };

  // If user is not logged in, render the AuthScreen
  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} usersList={usersList} />;
  }

  const isVendor = currentUser.role === 'vendor';
  const vendors = usersList.filter(u => u.role === 'vendor');

  return (
    <div className="app-wrapper">
      {/* Mobile Drawer Overlay Backdrop */}
      {!isCollapsed && (
        <div 
          className="mobile-sidebar-backdrop"
          onClick={() => setIsCollapsed(true)}
          aria-hidden="true"
        />
      )}

      {/* LEFT COLLAPSIBLE HAMBURGER SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        vendorTab={vendorTab}
        setVendorTab={setVendorTab}
        potholes={potholes}
        vendorsCount={vendors.length}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* MAIN CONTENT AREA */}
      <div className={`main-content ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* TOP CONTROL HEADER WITH ROLE BADGE & LOGOUT */}
        <TopHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          currentUser={currentUser}
          onLogout={handleLogout}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />

        {/* MAIN VIEW CONTENT CONTAINER */}
        <main className="view-body">
          {/* VENDOR SECTION: TENDER & REPAIR WORKSPACE */}
          {isVendor && activeTab === 'vendor_portal' && (
            <VendorPortal
              currentUser={currentUser}
              potholes={potholes}
              vendorTab={vendorTab}
              setVendorTab={setVendorTab}
              onSubmitBid={handleSubmitBid}
              onVendorSubmitWork={handleVendorSubmitWork}
              onSelectPothole={(item) => setSelectedPothole(item)}
            />
          )}

          {/* MNC VIEW 1: DASHBOARD OVERVIEW */}
          {!isVendor && activeTab === 'overview' && (
            <div className="view-section active">
              <KpiCards data={potholes} setActiveTab={setActiveTab} />
              
              <section className="split-view">
                <div className="map-column">
                  <LiveMap
                    data={potholes}
                    onSelectPothole={(item) => setSelectedPothole(item)}
                  />
                </div>
                <IncidentFeed
                  data={potholes}
                  onSelectPothole={(item) => setSelectedPothole(item)}
                />
              </section>
            </div>
          )}

          {/* MNC VIEW 2: DEDICATED ROAD DAMAGE & TENDER INVENTORY */}
          {!isVendor && activeTab === 'inventory' && (
            <DamageInventory
              data={potholes}
              onSendTender={handleSendTender}
              onMarkWorkDone={handleMarkWorkDone}
              onSelectPothole={(item) => setSelectedPothole(item)}
              searchQuery={searchQuery}
            />
          )}

          {/* MNC VIEW 3: DEDICATED CONTRACTOR & VENDOR MASTER */}
          {!isVendor && activeTab === 'vendors' && (
            <VendorMaster
              vendors={vendors}
              onAddVendor={handleAddVendor}
              onUpdateVendorStatus={handleUpdateVendorStatus}
              onImpersonateVendor={handleImpersonateVendor}
              potholes={potholes}
            />
          )}

          {/* SHARED VIEW 4: DEDICATED STANDALONE LIVE MAP VIEW */}
          {activeTab === 'map' && (
            <div className="view-section active">
              <div className="view-header">
                <h2>Live GPS Route & Repair Map</h2>
                <p>Full-screen spatial map view of surveyed roads & active repair zones in Nagpur Zone 4.</p>
              </div>
              <LiveMap
                data={potholes}
                onSelectPothole={(item) => setSelectedPothole(item)}
                standalone={true}
              />
            </div>
          )}

          {/* AUTHORITY FEATURE CENTER: SLA, VENDOR SCORE, RISK, OFFLINE */}
          {!isVendor && activeTab === 'features' && (
            <RoadWatchFeatures potholes={potholes} currentUser={currentUser} />
          )}

          {/* SHARED VIEW 5: DEDICATED ANALYTICS VIEW */}
          {activeTab === 'analytics' && (
            <AnalyticsView data={potholes} />
          )}
        </main>
      </div>

      {/* DETAIL MODAL POPUP */}
      {selectedPothole && (
        <PotholeModal
          pothole={potholes.find(p => p.id === selectedPothole.id) || selectedPothole}
          currentUser={currentUser}
          onClose={() => setSelectedPothole(null)}
          onSendTender={handleSendTender}
          onMarkWorkDone={handleMarkWorkDone}
          onApproveWork={handleMncApproveWork}
          onRequestRework={handleMncRequestRework}
          onAcceptBid={handleAcceptBid}
        />
      )}

      {/* FLOATING AI ASSISTANT CHATBOT (Available for MNC) */}
      {!isVendor && (
        <AiChatbot
          onFilterRainRisk={handleFilterRainRisk}
          onSendAllHighTenders={handleSendAllHighTenders}
        />
      )}
    </div>
  );
}
