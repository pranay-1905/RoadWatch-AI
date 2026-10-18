import React from 'react';
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Layers, 
  MapPin, 
  BarChart3, 
  Radio, 
  LogOut, 
  Building2,
  Clock,
  CheckCircle2,
  IndianRupee,
  Activity
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  vendorTab,
  setVendorTab,
  potholes,
  isCollapsed, 
  setIsCollapsed, 
  currentUser, 
  onLogout 
}) {
  const isVendor = currentUser?.role === 'vendor';

  const mncNavItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'inventory', label: 'Road Damage Inventory', icon: Layers },
    { id: 'vendors', label: `Contractor & Vendor Master`, icon: Building2 },
    { id: 'map', label: 'Live GPS Map', icon: MapPin },
    { id: 'analytics', label: 'Analytics & Status', icon: BarChart3 },
    { id: 'features', label: 'Operations Center', icon: Activity }
  ];

  const availableTendersCount = potholes?.filter(p => p.status === 'TENDER_ISSUED')?.length || 0;
  const myActiveContractsCount = potholes?.filter(p => (p.status === 'IN_PROGRESS' || p.status === 'VERIFICATION_PENDING') && p.assignedVendor === currentUser?.organization)?.length || 0;
  const myCompletedCount = potholes?.filter(p => p.status === 'WORK_DONE' && p.assignedVendor === currentUser?.organization)?.length || 0;

  const vendorNavItems = [
    { id: 'vendor_marketplace', label: 'Open Tenders', count: availableTendersCount, icon: Building2 },
    { id: 'vendor_active', label: 'Active Contracts', count: myActiveContractsCount, icon: Clock },
    { id: 'vendor_completed', label: 'Completed & Verified', count: myCompletedCount, icon: CheckCircle2 },
    { id: 'vendor_billing', label: 'Payouts & Invoices', icon: IndianRupee },
    { id: 'map', label: 'Live Road Map', icon: MapPin }
  ];

  const navItems = isVendor ? vendorNavItems : mncNavItems;

  const handleNavClick = (tabId) => {
    if (tabId.startsWith('vendor_')) {
      setActiveTab('vendor_portal');
      if (setVendorTab) {
        setVendorTab(tabId.replace('vendor_', ''));
      }
    } else {
      setActiveTab(tabId);
    }
    // On mobile screens, auto-close sidebar after navigation
    if (window.innerWidth <= 768) {
      setIsCollapsed(true);
    }
  };

  const isItemActive = (itemId) => {
    if (isVendor) {
      if (activeTab === 'vendor_portal') {
        return itemId === `vendor_${vendorTab || 'marketplace'}`;
      }
      return activeTab === itemId;
    }
    return activeTab === itemId;
  };

  return (
    <aside className={`left-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header & Hamburger Button */}
      <div className="sidebar-top">
        <button
          className="hamburger-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Menu" : "Collapse Menu"}
        >
          {isCollapsed ? <Menu className="w-5 h-5 text-slate-700" /> : <X className="w-5 h-5 text-slate-700" />}
        </button>

        {!isCollapsed && (
          <div className="brand-logo">
            <div className={`logo-icon ${isVendor ? 'vendor-logo-icon' : ''}`}>
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div className="logo-text">
              <h2>RoadWatch AI</h2>
              <span>{isVendor ? 'CONTRACTOR PORTAL' : 'MUNICIPAL (MNC)'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = isItemActive(item.id);
          const hasCount = typeof item.count !== 'undefined' && item.count !== null;

          return (
            <button
              key={item.id}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
              title={item.label}
            >
              <div className="nav-item-left">
                <Icon className="w-5 h-5 nav-icon flex-shrink-0" />
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
              </div>
              {!isCollapsed && hasCount && (
                <span className={`nav-count-badge ${isActive ? 'active' : ''}`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer with User Details & Logout */}
      <div className="sidebar-footer">
        {!isCollapsed && currentUser && (
          <div className="sidebar-user-pill">
            <img src={currentUser.avatar} alt={currentUser.name} className="sidebar-user-avatar" />
            <div className="sidebar-user-info">
              <span className="user-name">{currentUser.organization || currentUser.name}</span>
              <span className="user-badge-tag">{currentUser.badge}</span>
            </div>
          </div>
        )}

        <button 
          className={`sidebar-logout-btn ${isCollapsed ? 'collapsed' : ''}`}
          onClick={onLogout}
          title="Sign Out / Switch Portal"
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
