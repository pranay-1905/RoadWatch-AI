// =========================================================================
// ROADWATCH AI — DOMAIN-DRIVEN COMPONENT ARCHITECTURE EXPORTS
// =========================================================================

// 1. Municipal (MNC) Authority Module
export { default as DamageInventory } from './mnc/DamageInventory';
export { default as IncidentFeed } from './mnc/IncidentFeed';
export { default as KpiCards } from './mnc/KpiCards';
export { default as AnalyticsView } from './mnc/AnalyticsView';
export { default as PotholeModal } from './mnc/PotholeModal';
export { default as LiveMap } from './mnc/LiveMap';

// 2. Road Contractor & Vendor Module
export { default as VendorPortal } from './vendor/VendorPortal';
export { default as VendorMaster } from './vendor/VendorMaster';
export { default as TenderBiddingModal } from './vendor/TenderBiddingModal';

// 3. Citizen Grievance Module
export { default as CitizenReportForm } from './citizen/CitizenReportForm';

// 4. Operations Command & Intelligence Suite (SLA, Scores, Risk, Offline)
export { default as RoadWatchFeatures } from './operations/RoadWatchFeatures';

// 5. Layout & Core Navigation Module
export { default as Sidebar } from './layout/Sidebar';
export { default as TopHeader } from './layout/TopHeader';
export { default as AiChatbot } from './layout/AiChatbot';
export { default as ErrorBoundary } from './layout/ErrorBoundary';

// 6. Security & Authentication Module
export { default as AuthScreen } from './auth/AuthScreen';
