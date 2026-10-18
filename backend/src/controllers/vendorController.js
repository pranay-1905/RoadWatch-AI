/**
 * Master list of registered Nagpur Municipal Corporation (NMC) road contractors
 * with real-time composite reliability rating (35% SLA + 45% Quality + 20% Cost)
 */
export const VENDORS_MASTER = [
  {
    id: 'VND-001',
    name: 'Nagpur Infra Roads Ltd.',
    contact: '+91 98230 11223',
    tier: 'Tier-1 A-Class',
    activeWorks: 3,
    completedWorks: 42,
    slaOnTimeRate: 94,        // 35% weight
    qualityPassRate: 92,      // 45% weight
    budgetCompliance: 96,     // 20% weight
  },
  {
    id: 'VND-002',
    name: 'Vidarbha Highway Constr.',
    contact: '+91 98231 44556',
    tier: 'Tier-1 A-Class',
    activeWorks: 5,
    completedWorks: 61,
    slaOnTimeRate: 88,
    qualityPassRate: 95,
    budgetCompliance: 90,
  },
  {
    id: 'VND-003',
    name: 'Mahal Civic Works Pvt Ltd',
    contact: '+91 98222 77889',
    tier: 'Tier-2 B-Class',
    activeWorks: 2,
    completedWorks: 19,
    slaOnTimeRate: 74,
    qualityPassRate: 80,
    budgetCompliance: 85,
  },
  {
    id: 'VND-004',
    name: 'Orange City Bitumen Corp',
    contact: '+91 98900 33445',
    tier: 'Tier-2 B-Class',
    activeWorks: 4,
    completedWorks: 33,
    slaOnTimeRate: 82,
    qualityPassRate: 88,
    budgetCompliance: 91,
  }
];

export const getVendorsWithScores = async (req, res, next) => {
  try {
    // Calculate composite score using 35/45/20 formula
    const ratedVendors = VENDORS_MASTER.map(v => {
      const overallScore = Math.round(
        (v.slaOnTimeRate * 0.35) + 
        (v.qualityPassRate * 0.45) + 
        (v.budgetCompliance * 0.20)
      );

      return {
        ...v,
        overallScore,
        rankTier: overallScore >= 90 ? 'Gold' : overallScore >= 80 ? 'Silver' : 'Bronze',
        riskFlag: overallScore < 75 ? 'HIGH_RISK_SUSPEND_BIDDING' : 'GOOD_STANDING'
      };
    }).sort((a, b) => b.overallScore - a.overallScore);

    res.json({
      success: true,
      count: ratedVendors.length,
      data: ratedVendors
    });
  } catch (error) {
    next(error);
  }
};
