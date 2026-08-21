export interface AdpostInputs {
  monthlyViews: number;
  ctrPercent: number;
  cpc: number;
}

export interface AdpostEstimate {
  monthlyViews: number;
  ctrPercent: number;
  cpc: number;
  estimatedClicks: number;
  monthlyRevenue: number;
}

export function estimateAdpostRevenue(inputs: AdpostInputs): AdpostEstimate {
  const monthlyViews = Math.max(0, inputs.monthlyViews);
  const ctrPercent = Math.min(100, Math.max(0, inputs.ctrPercent));
  const cpc = Math.max(0, inputs.cpc);

  const estimatedClicks = Math.round(monthlyViews * (ctrPercent / 100));
  const monthlyRevenue = Math.round(estimatedClicks * cpc);

  return {
    monthlyViews,
    ctrPercent,
    cpc,
    estimatedClicks,
    monthlyRevenue,
  };
}
