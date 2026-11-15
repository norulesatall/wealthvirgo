export interface Income {
  id: string;
  name: string;
  amount: number;
  frequency: 'Monthly' | 'Quarterly' | 'Yearly';
  currency: string;
  startYear?: number;
  endYear?: number;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  frequency: 'Monthly' | 'Quarterly' | 'Yearly';
  currency: string;
  startMonth?: number;
  startYear?: number;
  lastPaymentMonth?: number;
  lastPaymentYear?: number;
}

export interface TaxBracket {
  id: string;
  minIncome: number;
  maxIncome?: number | null;
  rate: number;
}

export interface TaxDeduction {
  id: string;
  name: string;
  category: 'Deduction' | 'Credit';
  amount: number;
  frequency: 'Monthly' | 'Yearly';
  currency: string;
}

export interface TaxConfig {
  enabled: boolean;
  mode: 'Progressive Brackets' | 'Flat Effective Rate';
  flatTaxRate: number;
  standardDeduction: number;
  surchargeRate: number;
  payrollSocialTaxRate: number;
  payrollCap: number;
  indexBracketsToInflation: boolean;
  taxRetirementIncome: boolean;
  brackets: TaxBracket[];
  deductions: TaxDeduction[];
}

export const DEFAULT_TAX_CONFIG: TaxConfig = {
  enabled: true,
  mode: 'Progressive Brackets',
  flatTaxRate: 0,
  standardDeduction: 0,
  surchargeRate: 0,
  payrollSocialTaxRate: 0,
  payrollCap: 0,
  indexBracketsToInflation: true,
  taxRetirementIncome: true,
  brackets: [],
  deductions: [],
};

export interface Asset {
  id: string;
  name: string;
  valueMode?: 'Asset Inventory' | 'Real Estate & Insurance';
  type: string;
  amount: number; // Market value (Scenario 1) or Final maturity payout (Scenario 2)
  currency: string;
  yield?: number; // Annual appreciation % (Scenario 1, and Scenario 2 starting 1 year after maturity)
  appreciationStartYear?: number; // Year when Scenario 1 annual appreciation begins
  currentInvestment?: number; // Invested till date (Scenario 2)
  contribution?: number; // Ongoing installment (Scenario 2)
  contributionFrequency?: 'None' | 'Monthly' | 'Quarterly' | 'Semi-Yearly' | 'Yearly';
  lastPaymentMonth?: number;
  lastPaymentYear?: number;
  maturityMonth?: number;
  maturityYear?: number;
}

export interface Investment {
  id: string;
  name: string;
  currentBalance: number;
  contribution: number;
  contributionFrequency: 'None' | 'Monthly' | 'Quarterly' | 'Semi-Yearly' | 'Yearly';
  expectedReturn: number; // Annual CAGR %
  lastContributionMonth?: number;
  lastContributionYear?: number;
  maturityYear?: number;
  currency: string;
}

export interface Goal {
  id: string;
  name: string;
  amount: number;
  frequency: 'Lump Sum' | 'Monthly' | 'Quarterly' | 'Yearly';
  startYear: number;
  endYear?: number;
  currency: string;
}

export interface RetirementExpense {
  id: string;
  name: string;
  amount: number;
  type: 'Monthly' | 'Quarterly' | 'Yearly' | 'Lump Sum';
  currency: string;
}

export interface FinancialState {
  baseCurrency: string;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  inflationRate: number;
  incomeGrowthRate: number;
  postRetirementReturn: number;
  safeWithdrawalRate: number;
  incomes: Income[];
  expenses: Expense[];
  retirementExpenses: RetirementExpense[];
  goals: Goal[];
  assets: Asset[];
  investments: Investment[];
  taxConfig: TaxConfig;
  currencyChangeRates?: Record<string, number>;
}

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'AED', 'SGD', 'NZD'];
export const ASSET_TYPES = ['Cash', 'Real Estate', 'Equities', 'Bonds', 'Crypto', 'Commodities', 'Other'];
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const safeFloat = (val: any): number => {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: currency, 
    maximumFractionDigits: 0 
  }).format(amount || 0);
};
