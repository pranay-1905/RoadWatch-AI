import realPotholeDefectImg from '../assets/real_pothole_defect.jpg';
import repairPatchImg from '../assets/repair_patch.jpg';
import repairRollerImg from '../assets/repair_roller.jpg';
import repairSmoothImg from '../assets/repair_smooth.jpg';
import repairEdgeSealImg from '../assets/repair_edge_seal.jpg';

// Initial Mock Dataset for Nagpur Zone 4 Survey Route with Real Defect & Repair Imagery
export const initialPotholes = [
  {
    id: "POT-1095",
    lat: 21.1472,
    lng: 79.0835,
    locationName: "Ramdaspeth Central Boulevard, opposite Hotel Centre Point",
    severity: "HIGH",
    confidence: "95%",
    imuGForce: 2.74,
    speedKmh: 31.2,
    timestamp: "2026-08-16 11:20:45",
    status: "PENDING",
    estimatedCost: 38000,
    tenderDeadline: "2026-08-25",
    assignedVendor: null,
    urgencyLevel: "High Traffic Commercial Zone",
    dimensions: "1.6m × 1.1m × 14cm",
    imgUrl: realPotholeDefectImg,
    repairProofImg: null,
    bids: []
  },
  {
    id: "POT-1094",
    lat: 21.1412,
    lng: 79.0820,
    locationName: "Ambazari Road, near University Square",
    severity: "MEDIUM",
    confidence: "89%",
    imuGForce: 1.92,
    speedKmh: 28.1,
    timestamp: "2026-08-15 18:42:05",
    status: "VERIFICATION_PENDING",
    estimatedCost: 22000,
    tenderDeadline: "2026-08-22",
    assignedVendor: "Apex Infrastructure Ltd",
    urgencyLevel: "Standard",
    dimensions: "0.9m × 0.7m × 10cm",
    imgUrl: realPotholeDefectImg,
    repairProofImg: repairPatchImg,
    repairProofImages: [
      repairPatchImg,
      repairRollerImg,
      repairEdgeSealImg,
      repairSmoothImg
    ],
    asphaltThickness: "12 cm (2-layer compacted)",
    materialUsed: "Hot-Mix Bitumen VG-30 with Emulsion Tack Coat",
    repairCompletionNotes: "Milling, bitumen bonding coat and heavy vibratory rolling completed per IRC-SP-98 guidelines.",
    completedAt: "2026-08-16 10:30:15 IST",
    bids: [
      {
        id: "BID-802",
        vendorId: "user-vendor-1",
        vendorName: "Apex Infrastructure Ltd",
        amount: 22000,
        timelineDays: 2,
        notes: "Hot-mix asphalt patch with vibratory roller compaction.",
        submittedAt: "2026-08-15 20:10:00",
        status: "ACCEPTED"
      }
    ]
  },
  {
    id: "POT-1092",
    lat: 21.1458,
    lng: 79.0882,
    locationName: "Wardha Road, near Flyover Pillar #14",
    severity: "HIGH",
    confidence: "94%",
    imuGForce: 2.85,
    speedKmh: 32.4,
    timestamp: "2026-08-15 18:50:12",
    status: "TENDER_ISSUED",
    estimatedCost: 35000,
    tenderDeadline: "2026-08-20",
    assignedVendor: null,
    urgencyLevel: "Emergency (Rainfall Risk)",
    dimensions: "1.4m × 0.9m × 12cm",
    imgUrl: realPotholeDefectImg,
    repairProofImg: null,
    bids: [
      {
        id: "BID-801",
        vendorId: "user-vendor-1",
        vendorName: "Apex Infrastructure Ltd",
        amount: 32000,
        timelineDays: 2,
        notes: "Hot-mix asphalt patch with waterproofing sealant. Crew on standby.",
        submittedAt: "2026-08-16 09:30:00",
        status: "PENDING_REVIEW"
      }
    ]
  },
  {
    id: "POT-1091",
    lat: 21.1425,
    lng: 79.0845,
    locationName: "Dharampeth Main Commercial Road",
    severity: "MEDIUM",
    confidence: "86%",
    imuGForce: 2.10,
    speedKmh: 30.0,
    timestamp: "2026-08-15 18:35:10",
    status: "IN_PROGRESS",
    estimatedCost: 26000,
    tenderDeadline: "2026-08-22",
    assignedVendor: "Apex Infrastructure Ltd",
    urgencyLevel: "Commercial District Corridor",
    dimensions: "1.0m × 0.8m × 9cm",
    imgUrl: realPotholeDefectImg,
    repairProofImg: null,
    bids: [
      {
        id: "BID-805",
        vendorId: "user-vendor-1",
        vendorName: "Apex Infrastructure Ltd",
        amount: 25500,
        timelineDays: 2,
        notes: "Polymer modified bitumen with tack coat bonding.",
        submittedAt: "2026-08-15 21:00:00",
        status: "ACCEPTED"
      }
    ]
  },
  {
    id: "POT-1090",
    lat: 21.1505,
    lng: 79.0950,
    locationName: "Sitabuldi Main Road, Metro Station Gate 2",
    severity: "HIGH",
    confidence: "96%",
    imuGForce: 3.10,
    speedKmh: 22.0,
    timestamp: "2026-08-15 18:30:40",
    status: "PENDING",
    estimatedCost: 45000,
    tenderDeadline: "2026-08-19",
    assignedVendor: null,
    urgencyLevel: "Critical Metro Traffic Route",
    dimensions: "2.1m × 1.2m × 15cm",
    imgUrl: realPotholeDefectImg,
    repairProofImg: null,
    bids: []
  },
  {
    id: "POT-1089",
    lat: 21.1380,
    lng: 79.0750,
    locationName: "Subhash Nagar Ring Road Junction",
    severity: "LOW",
    confidence: "82%",
    imuGForce: 1.25,
    speedKmh: 40.5,
    timestamp: "2026-08-15 18:15:10",
    status: "WORK_DONE",
    estimatedCost: 15000,
    tenderDeadline: "2026-08-18",
    assignedVendor: "Nagpur Roadworks & Asphalting Corp",
    urgencyLevel: "Low Priority",
    dimensions: "0.5m × 0.4m × 5cm",
    imgUrl: realPotholeDefectImg,
    repairProofImg: repairRollerImg,
    repairProofImages: [
      repairRollerImg,
      repairPatchImg
    ],
    asphaltThickness: "10 cm Standard Roller Finish",
    materialUsed: "Hot-Mix Bitumen VG-30",
    repairCompletionNotes: "Edge cut cleanly and hot-mix compacted with vibratory plate.",
    completedAt: "2026-08-16 08:20:00 IST",
    bids: [
      {
        id: "BID-799",
        vendorId: "user-vendor-2",
        vendorName: "Nagpur Roadworks & Asphalting Corp",
        amount: 14000,
        timelineDays: 1,
        notes: "Quick hot-mix patch application completed.",
        submittedAt: "2026-08-15 18:30:00",
        status: "ACCEPTED"
      }
    ]
  },
  {
    id: "POT-1088",
    lat: 21.1560,
    lng: 79.0810,
    locationName: "Civil Lines, Near High Court Gate 3",
    severity: "MEDIUM",
    confidence: "88%",
    imuGForce: 1.85,
    speedKmh: 35.0,
    timestamp: "2026-08-15 17:55:00",
    status: "WORK_DONE",
    estimatedCost: 28000,
    tenderDeadline: "2026-08-17",
    assignedVendor: "Shree Highway Infra Solutions",
    urgencyLevel: "VIP Corridor",
    dimensions: "1.1m × 0.8m × 9cm",
    imgUrl: realPotholeDefectImg,
    repairProofImg: repairSmoothImg,
    repairProofImages: [
      repairSmoothImg,
      repairEdgeSealImg
    ],
    asphaltThickness: "12 cm IRC Highway Standard",
    materialUsed: "Bitumen Mastic Pavement with Seal Coat (IRC:SP:98)",
    repairCompletionNotes: "High grade bitumen mastic with edge sealant and roller compaction.",
    completedAt: "2026-08-16 09:10:00 IST",
    bids: [
      {
        id: "BID-798",
        vendorId: "user-vendor-3",
        vendorName: "Shree Highway Infra Solutions",
        amount: 27500,
        timelineDays: 2,
        notes: "High grade bitumen mastic with edge sealant.",
        submittedAt: "2026-08-15 18:00:00",
        status: "ACCEPTED"
      }
    ]
  }
];
