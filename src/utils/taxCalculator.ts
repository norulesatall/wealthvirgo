import { DEFAULT_TAX_CONFIG, Income, TaxConfig, safeFloat } from '../types/finance';

export interface BracketSliceResult {
  id: string;
  minIncome: number;
  maxIncome: number | null;
  rate: number;
  taxedAmount: number;
  taxAmount: number;
}

export interface TaxCalculationResult {
  grossIncome: number;
  standardDeduction: number;
  itemizedDeductions: number;
  totalDeductions: number;
  taxableIncome: number;
  baseIncomeTax: number;
  totalCreditsAvailable: number;
  taxCreditsApplied: number;
  taxAfterCredits: number;
  surchargeAmount: number;
  payrollTax: number;
  totalTax: number;
  netIncome: number;
  effectiveRate: number;
  marginalRate: number;
  bracketBreakdown: BracketSliceResult[];
}

export function getActiveAnnualGrossIncome(
  incomes: Income[] | undefined,
  convertToBase: (amount: number, currency: string) => number,
  currentYear: number = new Date().getFullYear()
): number {
  const getMultiplier = (freq: string) => {
    if (freq === 'Monthly') return 12;
    if (freq === 'Quarterly') return 4;
    return 1;
  };

  return (incomes || []).reduce((sum, item) => {
    const startYr = safeFloat(item.startYear);
    const endYr = safeFloat(item.endYear);
    if ((startYr > 0 && currentYear < startYr) || (endYr > 0 && currentYear > endYr)) {
      return sum;
    }
    return sum + convertToBase(item.amount * getMultiplier(item.frequency), item.currency);
  }, 0);
}

export function calculateAnnualTax(
  grossAnnualIncome: number,
  rawTaxConfig: Partial<TaxConfig> | undefined,
  convertToBase: (amount: number, currency: string) => number,
  inflationMultiplier: number = 1
): TaxCalculationResult {
  const gross = Math.max(0, safeFloat(grossAnnualIncome));
  const taxConfig: TaxConfig = { ...DEFAULT_TAX_CONFIG, ...(rawTaxConfig || {}) };

  if (!taxConfig.enabled || gross <= 0) {
    return {
      grossIncome: gross,
      standardDeduction: 0,
      itemizedDeductions: 0,
      totalDeductions: 0,
      taxableIncome: gross,
      baseIncomeTax: 0,
      totalCreditsAvailable: 0,
      taxCreditsApplied: 0,
      taxAfterCredits: 0,
      surchargeAmount: 0,
      payrollTax: 0,
      totalTax: 0,
      netIncome: gross,
      effectiveRate: 0,
      marginalRate: 0,
      bracketBreakdown: [],
    };
  }

  const scale = taxConfig.indexBracketsToInflation ? Math.max(1, inflationMultiplier) : 1;

  // 1. Standard Deduction & Pre-Tax Itemized Deductions
  const standardDeduction = Math.max(0, safeFloat(taxConfig.standardDeduction) * scale);

  let itemizedDeductions = 0;
  let totalCreditsAvailable = 0;

  (taxConfig.deductions || []).forEach((item) => {
    const mult = item.frequency === 'Monthly' ? 12 : 1;
    const annualBase = Math.max(0, convertToBase(safeFloat(item.amount) * mult, item.currency) * scale);
    if (item.category === 'Credit') {
      totalCreditsAvailable += annualBase;
    } else {
      itemizedDeductions += annualBase;
    }
  });

  const totalDeductions = standardDeduction + itemizedDeductions;
  const taxableIncome = Math.max(0, gross - totalDeductions);

  // 2. Base Income Tax Calculation
  let baseIncomeTax = 0;
  let marginalRate = 0;
  const bracketBreakdown: BracketSliceResult[] = [];

  if (taxConfig.mode === 'Flat Effective Rate') {
    const flatRate = Math.max(0, Math.min(100, safeFloat(taxConfig.flatTaxRate)));
    baseIncomeTax = taxableIncome * (flatRate / 100);
    marginalRate = taxableIncome > 0 ? flatRate : 0;
  } else {
    const sortedBrackets = [...(taxConfig.brackets || [])].sort(
      (a, b) => safeFloat(a.minIncome) - safeFloat(b.minIncome)
    );

    sortedBrackets.forEach((b) => {
      const minBound = Math.max(0, safeFloat(b.minIncome) * scale);
      const hasMax = b.maxIncome !== undefined && b.maxIncome !== null && safeFloat(b.maxIncome) > 0;
      const maxBound = hasMax ? safeFloat(b.maxIncome) * scale : Infinity;
      const rate = Math.max(0, Math.min(100, safeFloat(b.rate)));

      const taxedAmount =
        maxBound > minBound && taxableIncome > minBound
          ? Math.max(0, Math.min(taxableIncome, maxBound) - minBound)
          : 0;
      const taxAmount = taxedAmount * (rate / 100);

      baseIncomeTax += taxAmount;
      if (taxedAmount > 0) {
        marginalRate = rate;
      }

      bracketBreakdown.push({
        id: b.id,
        minIncome: minBound,
        maxIncome: hasMax ? maxBound : null,
        rate,
        taxedAmount,
        taxAmount,
      });
    });
  }

  // 3. Direct Tax Benefits & Credits (dollar-for-dollar offset on income tax)
  const taxAfterCredits = Math.max(0, baseIncomeTax - totalCreditsAvailable);
  const taxCreditsApplied = baseIncomeTax - taxAfterCredits;

  // 4. Surcharge / Cess (percentage applied to income tax after credits)
  const surchargePct = Math.max(0, safeFloat(taxConfig.surchargeRate));
  const surchargeAmount = taxAfterCredits * (surchargePct / 100);

  // 5. Payroll / Social Security Tax (percentage applied to gross income up to optional cap)
  const payrollPct = Math.max(0, Math.min(100, safeFloat(taxConfig.payrollSocialTaxRate)));
  const payrollCap = safeFloat(taxConfig.payrollCap) * scale;
  const payrollSubjectIncome = payrollCap > 0 ? Math.min(gross, payrollCap) : gross;
  const payrollTax = payrollSubjectIncome * (payrollPct / 100);

  // 6. Final Totals
  const totalTax = Math.min(gross, taxAfterCredits + surchargeAmount + payrollTax);
  const netIncome = Math.max(0, gross - totalTax);
  const effectiveRate = gross > 0 ? (totalTax / gross) * 100 : 0;

  return {
    grossIncome: gross,
    standardDeduction,
    itemizedDeductions,
    totalDeductions,
    taxableIncome,
    baseIncomeTax,
    totalCreditsAvailable,
    taxCreditsApplied,
    taxAfterCredits,
    surchargeAmount,
    payrollTax,
    totalTax,
    netIncome,
    effectiveRate,
    marginalRate,
    bracketBreakdown,
  };
}
