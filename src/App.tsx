/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import CryptoJS from 'crypto-js';
import { 
  LayoutDashboard, 
  Settings, 
  DollarSign, 
  TrendingUp, 
  Briefcase, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Pencil,
  Menu,
  X,
  History,
  Sun,
  Moon,
  Shield,
  Lock,
  Unlock,
  HelpCircle,
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ArrowRight,
  MessageSquareText,
  Sparkles
} from 'lucide-react';
import { Chart, registerables } from 'chart.js';
import { motion, AnimatePresence } from 'motion/react';
import CashflowTab from './components/CashflowTab';
import PortfolioTab from './components/PortfolioTab';
import GoalsTab from './components/GoalsTab';
import RetirementTab from './components/RetirementTab';

const logoImg = '/wealth_virgo_logo.jpg';

// Register Chart.js components
Chart.register(...registerables);

// --- CONFIGURATION & CONSTANTS ---
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'AED', 'SGD', 'NZD'];
const ASSET_TYPES = ['Cash', 'Real Estate', 'Equities', 'Bonds', 'Crypto', 'Commodities', 'Other'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DEFAULT_STATE = {
  baseCurrency: 'USD',
  currentAge: 30,
  retirementAge: 65,
  lifeExpectancy: 90,
  inflationRate: 2.5,
  incomeGrowthRate: 3.0,
  postRetirementReturn: 4.0,
  safeWithdrawalRate: 4.0,
  incomes: [],
  expenses: [],
  retirementExpenses: [],
  goals: [],
  assets: [],
  investments: []
};

// --- HELPER MATH FUNCTIONS ---
const safeFloat = (val: any) => {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(amount);
};

export default function App() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('profile');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [passwordModal, setPasswordModal] = useState<{ type: 'encrypt' | 'decrypt', fileData?: string } | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [data, setData] = useState(DEFAULT_STATE);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ [DEFAULT_STATE.baseCurrency]: 1 });
  const [isRatesLoading, setIsRatesLoading] = useState(false);

  // --- API & EXTERNAL LIBRARIES ---
  useEffect(() => {
    const fetchRates = async () => {
      setIsRatesLoading(true);
      try {
        const response = await fetch(`https://open.er-api.com/v6/latest/${data.baseCurrency}`);
        const result = await response.json();
        if (result && result.rates) {
          setExchangeRates(result.rates);
        }
      } catch (error) {
        console.error("Failed to fetch exchange rates", error);
      }
      setIsRatesLoading(false);
    };
    fetchRates();
  }, [data.baseCurrency]);

  // --- LOGIC: CURRENCY CONVERSION ---
  const convertToBase = (amount: number, currency: string) => {
    if (!currency || currency === data.baseCurrency) return safeFloat(amount);
    const rate = exchangeRates[currency];
    if (!rate) return safeFloat(amount); 
    return safeFloat(amount) / rate;
  };

  // --- LOGIC: PROJECTION ENGINE ---
  const projection = useMemo(() => {
    const currentYear = new Date().getFullYear();
    
    // Normalize pre-retirement flows
    const getFrequencyMultiplier = (f: string) => {
      switch (f) {
        case 'Monthly': return 12;
        case 'Quarterly': return 4;
        case 'Semi-Yearly': return 2;
        case 'Yearly': return 1;
        default: return 0;
      }
    };

    let liquidAssets = 0;
    const currentMonth = new Date().getMonth() + 1; // 1-12

    // Normalize Investments (Growth Portfolios)
    let activeInvestments: any[] = [];
    (data.investments || []).forEach(inv => {
      const baseBalance = convertToBase(inv.currentBalance, inv.currency);
      const baseContribution = convertToBase(inv.contribution || 0, inv.currency);
      const maturityYear = safeFloat(inv.maturityYear) || currentYear;
      
      if (maturityYear <= currentYear) {
        // Option "Liquid / Current" or in past -> immediately liquid cash!
        liquidAssets += baseBalance;
      } else {
        activeInvestments.push({
          ...inv,
          baseBalance,
          baseContribution,
          frequency: inv.contributionFrequency || 'None',
          maturityYear
        });
      }
    });

    // Normalize static assets and Real Estate / Insurance (Scenario 1 & 2)
    const futureAssets = (data.assets || []).map(a => {
      const maturityYear = safeFloat(a.maturityYear) || currentYear;
      const maturityMonth = safeFloat(a.maturityMonth) || 12;
      const isMaturityPortfolio = a.valueMode === 'Real Estate & Insurance' || a.valueMode === 'Final Value at Maturity';
      const isStaticAsset = a.valueMode === 'Asset Inventory' || !a.valueMode;
      
      const isAlreadyMatured = isStaticAsset || (maturityYear < currentYear || (maturityYear === currentYear && maturityMonth <= currentMonth));
      
      const baseAmount = isAlreadyMatured 
        ? convertToBase(a.amount, a.currency)
        : (isMaturityPortfolio ? convertToBase(a.currentInvestment || 0, a.currency) : convertToBase(a.amount, a.currency));

      const baseContribution = convertToBase(a.contribution || 0, a.currency);
      
      return {
        ...a,
        maturityYear,
        maturityMonth,
        baseAmount,
        baseContribution,
        isMaturityPortfolio,
        contributionFrequency: a.contributionFrequency || 'None'
      };
    }).filter(a => {
      const isStaticAsset = a.valueMode === 'Asset Inventory' || !a.valueMode;
      const isAlreadyMatured = isStaticAsset || (a.maturityYear < currentYear || (a.maturityYear === currentYear && a.maturityMonth <= currentMonth));
      if (isAlreadyMatured) {
        liquidAssets += a.baseAmount;
        return false;
      }
      return true;
    });

    let totalExpensesBase = (data.expenses || []).reduce((s, e) => s + convertToBase(e.amount * getFrequencyMultiplier(e.frequency), e.currency), 0);
    let totalIncomeBase = (data.incomes || []).reduce((s, e) => s + convertToBase(e.amount * getFrequencyMultiplier(e.frequency), e.currency), 0);

    const getYearlyExpenseOutlay = (targetYear: number) => {
      let activeExpensesSum = 0;
      (data.expenses || []).forEach((e: any) => {
        let activeMonths = 12;
        const eLastYear = safeFloat(e.lastPaymentYear);
        const eLastMonth = safeFloat(e.lastPaymentMonth);
        
        if (eLastYear > 0) {
          if (targetYear > eLastYear) {
            activeMonths = 0;
          } else if (targetYear === eLastYear) {
            if (e.frequency === 'Monthly' && eLastMonth > 0) {
              activeMonths = Math.min(12, Math.max(0, eLastMonth));
            } else {
              activeMonths = 12;
            }
          }
        }
        
        if (activeMonths > 0) {
          let yearMult = 1;
          if (e.frequency === 'Monthly') {
            yearMult = activeMonths;
          } else {
            yearMult = getFrequencyMultiplier(e.frequency);
          }
          activeExpensesSum += convertToBase(e.amount * yearMult, e.currency);
        }
      });
      return activeExpensesSum;
    };

    const activeGoals = (data.goals || []).map(g => ({
       ...g,
       baseAmount: convertToBase(g.amount, g.currency)
    }));

    // Normalize post-retirement flows
    let totalRetirementMonthlyBase = (data.retirementExpenses || [])
      .filter(e => e.type !== 'Lump Sum')
      .reduce((s, e) => s + convertToBase(e.amount * getFrequencyMultiplier(e.type), e.currency), 0);
    
    let totalRetirementLumpSumBase = (data.retirementExpenses || [])
      .filter(e => e.type === 'Lump Sum')
      .reduce((s, e) => s + convertToBase(e.amount, e.currency), 0);

    const yearlyData = [];
    let rollingBaseAssets = liquidAssets;
    let activeFutureAssets = [...futureAssets];
    let runwayEnded = false;
    let runwayYears = 0;
    let combinedPoolAtRetirement = 0;

    for (let age = data.currentAge; age <= data.lifeExpectancy; age++) {
      const yearIndex = age - data.currentAge;
      const targetYear = currentYear + yearIndex;
      const inflationMultiplier = Math.pow(1 + safeFloat(data.inflationRate) / 100, yearIndex);
      const incomeMultiplier = Math.pow(1 + safeFloat(data.incomeGrowthRate) / 100, yearIndex);

      const isRetired = age >= data.retirementAge;
      const isFirstYearRetirement = age === data.retirementAge;

      const startFutureAssetSum = activeFutureAssets.reduce((s, a) => s + a.baseAmount, 0);
      const startInvSum = activeInvestments.reduce((s, i) => s + i.baseBalance, 0);
      const startNominal = Math.max(0, rollingBaseAssets + startInvSum + startFutureAssetSum);
      
      let currentYearExpense = isRetired 
        ? totalRetirementMonthlyBase * inflationMultiplier 
        : getYearlyExpenseOutlay(targetYear) * inflationMultiplier;
      
      let currentYearIncome = isRetired ? 0 : totalIncomeBase * incomeMultiplier;
      let currentYearGoalExpense = 0;

      // 1. Calculate Goals (PV to Nominal)
      if (!isRetired) {
        activeGoals.forEach((goal: any) => {
          const start = safeFloat(goal.startYear);
          const end = safeFloat(goal.endYear) || start;
          if (targetYear >= start) {
            if (goal.frequency === 'Lump Sum') {
              if (targetYear === start) currentYearGoalExpense += goal.baseAmount * inflationMultiplier;
            } else if (targetYear <= end) {
              currentYearGoalExpense += (goal.baseAmount * getFrequencyMultiplier(goal.frequency)) * inflationMultiplier;
            }
          }
        });
      }

      let yearEndInvSum = 0;
      let maturedSum = 0;
      let yearlyContributionTotal = 0;

      // 2. Asset Maturity Check (processes for both working years and retirement years!)
      activeFutureAssets = activeFutureAssets.filter(asset => {
        if (targetYear >= asset.maturityYear) {
          maturedSum += asset.isMaturityPortfolio 
            ? convertToBase(asset.amount, asset.currency)
            : asset.baseAmount;
          return false;
        }
        
        if (!asset.isMaturityPortfolio) {
          // Annual appreciation happens at year end for standard assets (if any)
          asset.baseAmount *= (1 + (safeFloat(asset.yield) / 100));
        } else {
          // Maturity Portfolio / Real Estate & Insurance contribution logic
          const lastPayYear = safeFloat(asset.lastPaymentYear) || asset.maturityYear;
          const lastPayMonth = safeFloat(asset.lastPaymentMonth) !== 0 ? safeFloat(asset.lastPaymentMonth) : asset.maturityMonth;

          for (let m = 0; m < 12; m++) {
            const monthOfSimulation = m + 1;
            const withinPaymentPeriod = (targetYear < lastPayYear) || 
                                         (targetYear === lastPayYear && monthOfSimulation <= lastPayMonth);
            
            let contributionStep = 0;
            if (withinPaymentPeriod) {
              if (asset.contributionFrequency === 'Monthly') {
                contributionStep = asset.baseContribution;
              } else if (asset.contributionFrequency === 'Quarterly' && m % 3 === 0) {
                contributionStep = asset.baseContribution;
              } else if (asset.contributionFrequency === 'Semi-Yearly' && (m === 0 || m === 6)) {
                contributionStep = asset.baseContribution;
              } else if (asset.contributionFrequency === 'Yearly' && m === 0) {
                contributionStep = asset.baseContribution;
              }
              yearlyContributionTotal += contributionStep;
              asset.baseAmount += contributionStep;
            }
          }
        }
        return true;
      });

      if (!isRetired) {
        // 3. Investment Growth & Contributions (Only pre-retirement)
        activeInvestments.forEach((inv: any) => {
          const maturityYear = safeFloat(inv.maturityYear) || 9999;
          const rateMonthly = (safeFloat(inv.expectedReturn) / 100) / 12;
          
          for (let m = 0; m < 12; m++) {
            const monthOfSimulation = m + 1;
            const canContribute = (targetYear < (safeFloat(inv.lastContributionYear) || maturityYear)) || 
                               (targetYear === (safeFloat(inv.lastContributionYear) || maturityYear) && monthOfSimulation <= (inv.lastContributionMonth || 12));
            
            let contributionStep = 0;
            if (canContribute) {
              if (inv.frequency === 'Monthly') contributionStep = inv.baseContribution;
              else if (inv.frequency === 'Quarterly' && m % 3 === 0) contributionStep = inv.baseContribution;
              else if (inv.frequency === 'Semi-Yearly' && (m === 0 || m === 6)) contributionStep = inv.baseContribution;
              else if (inv.frequency === 'Yearly' && m === 0) contributionStep = inv.baseContribution;
            }
            
            inv.baseBalance = (inv.baseBalance * (1 + rateMonthly)) + contributionStep;
            yearlyContributionTotal += contributionStep;
          }

          if (targetYear >= maturityYear) {
            maturedSum += inv.baseBalance;
            inv.matured = true;
          } else {
            yearEndInvSum += inv.baseBalance;
          }
        });

        activeInvestments = activeInvestments.filter((i: any) => !i.matured);
        rollingBaseAssets += (currentYearIncome - currentYearExpense - currentYearGoalExpense - yearlyContributionTotal) + maturedSum;
      } else {
        // 4. Retirement Phase Transition & Depletion
        if (isFirstYearRetirement) {
          const finalInvSum = activeInvestments.reduce((s, i) => s + i.baseBalance, 0);
          rollingBaseAssets += finalInvSum - (totalRetirementLumpSumBase * inflationMultiplier);
          activeInvestments.forEach(inv => inv.baseBalance = 0);
          combinedPoolAtRetirement = rollingBaseAssets / inflationMultiplier;
        }

        const postRetirementYield = safeFloat(data.postRetirementReturn) / 100;
        rollingBaseAssets = (rollingBaseAssets * (1 + postRetirementYield)) - currentYearExpense;
        
        // Add matured assets and deduct remaining premium/contributions payments in retirement too
        rollingBaseAssets += maturedSum - yearlyContributionTotal;

        if (rollingBaseAssets <= 0) {
          rollingBaseAssets = 0;
          if (!runwayEnded) {
            runwayEnded = true;
            runwayYears = age - data.retirementAge;
          }
        }
        yearEndInvSum = 0;
      }

      const futureAssetSum = activeFutureAssets.reduce((s, a) => s + a.baseAmount, 0);
      const totalNominal = Math.max(0, rollingBaseAssets + yearEndInvSum + futureAssetSum);

      const lumpSumRetirement = (age === data.retirementAge) ? (totalRetirementLumpSumBase * inflationMultiplier) : 0;
      const netExternalFlow = isRetired ? (-currentYearExpense - lumpSumRetirement) : (currentYearIncome - currentYearExpense - currentYearGoalExpense);
      const actualChange = totalNominal - startNominal;
      const passiveGrowth = Math.max(0, actualChange - netExternalFlow);

      yearlyData.push({
        age,
        year: targetYear,
        nominal: totalNominal,
        real: totalNominal / inflationMultiplier,
        expense: currentYearExpense,
        income: currentYearIncome,
        goalExpense: currentYearGoalExpense,
        yearlyContributionTotal,
         passiveGrowth,
        isRetired
      });
    }

    if (!runwayEnded) {
      runwayYears = data.lifeExpectancy - data.retirementAge;
    }

    const assetAllocation: Record<string, number> = {};
    (data.assets || []).forEach(a => {
      const isMaturityPortfolio = a.valueMode === 'Real Estate & Insurance' || a.valueMode === 'Final Value at Maturity';
      const actualVal = isMaturityPortfolio ? (a.currentInvestment || 0) : a.amount;
      assetAllocation[a.type || 'Other'] = (assetAllocation[a.type || 'Other'] || 0) + convertToBase(actualVal, a.currency);
    });
    (data.investments || []).forEach(i => {
      assetAllocation['Investments'] = (assetAllocation['Investments'] || 0) + convertToBase(i.currentBalance, i.currency);
    });

    let annualContributions = 0;
    (data.investments || []).forEach(inv => {
      annualContributions += convertToBase(inv.contribution || 0, inv.currency) * getFrequencyMultiplier(inv.contributionFrequency || 'None');
    });

    // Add current year contributions from maturity portfolios/Real estate/Insurance in assets
    (data.assets || []).forEach(a => {
      if (a.valueMode === 'Real Estate & Insurance' || a.valueMode === 'Final Value at Maturity') {
        const maturityYear = safeFloat(a.maturityYear) || currentYear;
        const maturityMonth = safeFloat(a.maturityMonth) || 12;
        const runsThisYear = (currentYear < maturityYear) || (currentYear === maturityYear && currentMonth < maturityMonth);
        if (runsThisYear) {
          const lastPayYear = safeFloat(a.lastPaymentYear) || maturityYear;
          const lastPayMonth = safeFloat(a.lastPaymentMonth) !== 0 ? safeFloat(a.lastPaymentMonth) : maturityMonth;
          const stillPayingThisYear = (currentYear < lastPayYear) || (currentYear === lastPayYear && currentMonth < lastPayMonth);
          
          if (stillPayingThisYear) {
            annualContributions += convertToBase(a.contribution || 0, a.currency) * getFrequencyMultiplier(a.contributionFrequency || 'None');
          }
        }
      }
    });

    return { yearlyData, runwayYears, runwayEnded, assetAllocation, combinedPoolAtRetirement, annualContributions, activeFutureAssets, totalRetirementMonthlyBase, totalExpensesBase };
  }, [data, exchangeRates]);

  // --- HANDLERS ---
  const updateData = useCallback((key: string, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleExport = useCallback(() => {
    setPasswordModal({ type: 'encrypt' });
    setTempPassword('');
    setPasswordError('');
  }, []);

  const executeExport = (password: string) => {
    try {
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), password).toString();
      const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(encrypted);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `fin_plan_${data.baseCurrency}.enc.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      setPasswordModal(null);
    } catch (err) {
      setPasswordError("Failed to encrypt data.");
    }
  };

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setPasswordModal({ type: 'decrypt', fileData: event.target.result as string });
      setTempPassword('');
      setPasswordError('');
    };
    reader.readAsText(file);
    // Reset file input so same file can be imported again
    e.target.value = '';
  }, []);

  const executeImport = (password: string, fileData: string) => {
    try {
      const bytes = CryptoJS.AES.decrypt(fileData, password);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      setData({ ...DEFAULT_STATE, ...decryptedData });
      setPasswordModal(null);
    } catch (err) {
      // Check if it's a legacy unencrypted file
      try {
        const importedData = JSON.parse(fileData);
        setData({ ...DEFAULT_STATE, ...importedData });
        setPasswordModal(null);
      } catch (legacyErr) {
        setPasswordError("Decryption failed. Please check your password.");
      }
    }
  };




  return (
    <div className={`fixed inset-0 ${theme === 'dark' ? 'bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-900'} font-sans flex flex-col md:flex-row overflow-hidden transition-colors duration-300`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 w-64 ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'} border-r p-6 flex flex-col z-50 transition-all duration-200 ease-in-out`}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center space-x-2.5">
            <img 
              src={logoImg} 
              alt="Wealth Virgo" 
              className="w-10 h-10 rounded-xl object-cover shadow-sm bg-slate-900 border border-slate-700/50" 
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/wealth_virgo_logo.jpg';
              }}
              referrerPolicy="no-referrer"
            />
            <span className={`font-bold text-2xl tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Wealth Virgo</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <nav className="space-y-1 flex-1 overflow-y-auto overscroll-contain">
          {[
            { id: 'profile', icon: Settings, label: 'Parameters' },
            { id: 'cashflow', icon: DollarSign, label: 'Cash Flow' },
            { id: 'portfolio', icon: Briefcase, label: 'Portfolio' },
            { id: 'goals', icon: TrendingUp, label: 'Goals' },
            { id: 'retirement', icon: History, label: 'Retirement' },
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' }
          ].map(item => (
            <button
              id={`nav-${item.id}`}
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                activeTab === item.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                : theme === 'dark' ? 'text-slate-400 hover:bg-slate-800/50 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <item.icon size={16} />
              <span className="font-medium text-xs">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-4 pt-6 border-t border-slate-800/20">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium transition-all border ${
              theme === 'dark' 
              ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' 
              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
              <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'}`}>
              <div className={`w-3 h-3 bg-white rounded-full transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>

          <div className={`p-4 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'} rounded-2xl border`}>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Base Currency</label>
            <select 
              value={data.baseCurrency} 
              onChange={(e) => updateData('baseCurrency', e.target.value)}
              className={`w-full ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 border-slate-200'} border-none rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none`}
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col space-y-2">
            <button onClick={handleExport} className={`w-full flex items-center justify-center space-x-2 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'} px-4 py-2.5 rounded-xl text-xs font-medium transition-colors border`}>
              <Download size={14} /> <span>Download</span>
            </button>
            <label className={`w-full flex items-center justify-center space-x-2 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'} px-4 py-2.5 rounded-xl text-xs font-medium transition-colors border cursor-pointer`}>
              <Upload size={14} /> <span>Upload</span>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className={`md:hidden flex justify-between items-center p-4 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
           <button onClick={() => setIsMobileMenuOpen(true)} className={`p-2 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} rounded-xl`}><Menu size={20} /></button>
           <div className="flex items-center space-x-2">
             <img 
               src={logoImg} 
               alt="Wealth Virgo" 
               className="w-7 h-7 rounded-lg object-cover shadow-sm bg-slate-900 border border-slate-700/50" 
               onError={(e) => {
                 (e.currentTarget as HTMLImageElement).src = '/wealth_virgo_logo.jpg';
               }}
               referrerPolicy="no-referrer"
             />
             <span className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Wealth Virgo</span>
           </div>
           <div className="w-10"></div>
        </header>

        <main className={`flex-1 overflow-y-auto overscroll-contain p-4 md:p-8 lg:p-10 pb-32 md:pb-8 ${theme === 'light' ? 'bg-slate-50/50' : ''}`}>
          <div className="flex flex-col min-h-full justify-between">
            <div className="flex-1">
              <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="min-h-full"
            >
              {activeTab === 'dashboard' && <DashboardTab data={data} projection={projection} theme={theme} />}
              {activeTab === 'cashflow' && <CashflowTab data={data} updateData={updateData} theme={theme} convertToBase={convertToBase} />}
              {activeTab === 'portfolio' && <PortfolioTab data={data} updateData={updateData} theme={theme} convertToBase={convertToBase} />}
              {activeTab === 'goals' && <GoalsTab data={data} updateData={updateData} theme={theme} convertToBase={convertToBase} />}
              {activeTab === 'retirement' && <RetirementTab data={data} updateData={updateData} theme={theme} convertToBase={convertToBase} projection={projection} />}
              {activeTab === 'profile' && <ProfileTab data={data} updateData={updateData} theme={theme} />}
            </motion.div>
          </AnimatePresence>
            </div>
            <Footer theme={theme} />
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Password Modal */}
      <AnimatePresence>
        {passwordModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setPasswordModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-md ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border rounded-3xl p-8 shadow-2xl overflow-hidden`}
              onClick={e => e.stopPropagation()}
            >
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                    <Shield size={32} />
                  </div>
                  <button onClick={() => setPasswordModal(null)} className={`p-2 hover:bg-slate-500/10 rounded-xl transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    <X size={20} />
                  </button>
                </div>

                <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {passwordModal.type === 'encrypt' ? 'Secure Export' : 'Secure Import'}
                </h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed font-medium">
                  {passwordModal.type === 'encrypt' 
                    ? 'Enter a password to encrypt your financial data. You will need this password to import the file later.'
                    : 'This file is encrypted. Please enter the password used during export to decrypt and import your data.'}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Password</label>
                    <div className="relative group">
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-slate-600 group-focus-within:text-indigo-400' : 'text-slate-400 group-focus-within:text-indigo-600'} transition-colors`}>
                        <Lock size={18} />
                      </div>
                      <input 
                        type="password"
                        autoFocus
                        placeholder="••••••••"
                        className={`w-full ${theme === 'dark' ? 'bg-slate-950/50 border-slate-700 text-white focus:bg-slate-950 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600'} pl-12 pr-4 py-4 rounded-2xl border outline-none transition-all focus:ring-4 focus:ring-indigo-500/10 font-mono text-lg tracking-wider`}
                        value={tempPassword}
                        onChange={e => setTempPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (passwordModal.type === 'encrypt' ? executeExport(tempPassword) : executeImport(tempPassword, passwordModal.fileData!))}
                      />
                    </div>
                  </div>

                  {passwordError && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-bold p-3 rounded-xl flex items-center gap-2"
                    >
                      <X size={14} className="shrink-0" />
                      {passwordError}
                    </motion.div>
                  )}

                  <button 
                    onClick={() => passwordModal.type === 'encrypt' ? executeExport(tempPassword) : executeImport(tempPassword, passwordModal.fileData!)}
                    disabled={!tempPassword}
                    className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale transform active:scale-[0.98] mt-2 ${theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-200'}`}
                  >
                    {passwordModal.type === 'encrypt' ? <><Download size={18}/> Encrypt & Download</> : <><Unlock size={18}/> Decrypt & Import</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- SUB-COMPONENTS ---

const Tooltip = ({ text, theme, children }: { text: string; theme: 'light' | 'dark'; children: React.ReactNode }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 10, // 10px spacing
        left: rect.left + rect.width / 2
      });
    }
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible]);

  return (
    <div className="relative inline-flex items-center group/tooltip">
      <div 
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && createPortal(
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          <AnimatePresence>
            {isVisible && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                style={{ 
                  position: 'fixed',
                  top: coords.top,
                  left: coords.left,
                  transform: 'translate(-50%, -100%)'
                }}
                className={`w-72 p-4 rounded-2xl border shadow-2xl text-[13px] sm:text-[14px] leading-relaxed font-semibold transition-colors ${
                  theme === 'dark' 
                  ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-slate-950/50' 
                  : 'bg-white border-slate-200 text-slate-850 shadow-slate-200'
                }`}
              >
                <div className={`absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 border-r border-b rotate-45 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                }`} />
                {text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </div>
  );
};

function DashboardTab({ data, projection, theme }: { data: any, projection: any, theme: 'light' | 'dark' }) {
  const areaChartRef = useRef<HTMLCanvasElement>(null);
  const donutChartRef = useRef<HTMLCanvasElement>(null);
  const fiCrossoverChartRef = useRef<HTMLCanvasElement>(null);
  const compoundingChartRef = useRef<HTMLCanvasElement>(null);
  const areaInstance = useRef<Chart | null>(null);
  const donutInstance = useRef<Chart | null>(null);
  const fiCrossoverInstance = useRef<Chart | null>(null);
  const compoundingInstance = useRef<Chart | null>(null);

  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(() => {
    try {
      return localStorage.getItem('fire_pro_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [payPalPaymentState, setPayPalPaymentState] = useState<'idle' | 'linking' | 'authenticating' | 'authorized' | 'success'>('idle');
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([]);

  // PayPal Live Credentials & Environment State
  const [paypalClientId, setPaypalClientId] = useState(() => {
    try {
      return localStorage.getItem('paypal_client_id') || (import.meta as any).env.VITE_PAYPAL_CLIENT_ID || 'sb';
    } catch {
      return 'sb';
    }
  });
  const [paypalEnv, setPaypalEnv] = useState<'sandbox' | 'live'>(() => {
    try {
      return (localStorage.getItem('paypal_env') as 'sandbox' | 'live') || 'sandbox';
    } catch {
      return 'sandbox';
    }
  });
  const [isClientEditing, setIsClientEditing] = useState(false);
  const [clientIdInput, setClientIdInput] = useState(() => {
    try {
      return localStorage.getItem('paypal_client_id') || (import.meta as any).env.VITE_PAYPAL_CLIENT_ID || 'sb';
    } catch {
      return 'sb';
    }
  });

  const handleDownloadExcel = useCallback(() => {
    let csv = `=================================================================================\n`;
    csv += `                    GRAND FINANCIAL PLANNING & RETIREMENT MODEL                  \n`;
    csv += `=================================================================================\n\n`;

    csv += `1. RETIREMENT PLAN KEY PERFORMANCE INDICATORS\n`;
    csv += `---------------------------------------------------------------------------------\n`;
    csv += `Metric,Value,Unit,Definition\n`;
    csv += `Base Currency,${data.baseCurrency},ISO Code,Main baseline currency of all assets\n`;
    csv += `Current Net Worth,${projection.yearlyData[0]?.nominal || 0},${data.baseCurrency},Total valuation of liquid + invested assets today\n`;
    csv += `Annual Working Contributions,${projection.annualContributions || 0},${data.baseCurrency},Active yearly savings injected post-currency rates\n`;
    csv += `Retirement Age,${data.retirementAge},Years,Age when stopped work & begin withdrawal transition\n`;
    csv += `Retirement Pool Value (Nominal),${(projection.yearlyData.find((d: any) => d.age === data.retirementAge)?.nominal || 0).toFixed(0)},${data.baseCurrency},Asset pool scale at retirement day\n`;
    csv += `Retirement Pool Value (Real Today's Value),${(projection.yearlyData.find((d: any) => d.age === data.retirementAge)?.real || 0).toFixed(0)},${data.baseCurrency},Asset pool adjusted back to today's purchasing power\n`;
    csv += `Retirement Runway Lifespan,${projection.runwayYears},Years,Projected years assets will last post-retirement\n`;
    csv += `Runway Status,${projection.runwayEnded ? 'Depletes at Age ' + (data.retirementAge + projection.runwayYears) : 'Fully Sustainable'},Status,Longevity of assets relative to lifetime survival\n\n`;

    csv += `2. ACCREDITED ECONOMIC ASSUMPTIONS\n`;
    csv += `---------------------------------------------------------------------------------\n`;
    csv += `Assumption Parameter,Rate,Description\n`;
    csv += `Anticipated Annual Inflation,${data.inflationRate || 0}%,Projected yearly currency de-valuation coefficient\n`;
    csv += `Pre-Retirement Income Growth,${data.incomeGrowthRate || 0}%,Annual salary adjustment wage growth matrix\n`;
    csv += `Post-Retirement Return Rate,${data.postRetirementReturn || 0}%,Expected annual yield on combined wealth post-retirement\n\n`;

    const activeSWR = safeFloat(data.safeWithdrawalRate || 4.0);
    const swrMultiplier = activeSWR / 100;

    csv += `3. CHRONOLOGICAL YEAR-BY-YEAR COMPRESSION LEDGER\n`;
    csv += `---------------------------------------------------------------------------------\n`;
    csv += `Year,Age,Stage,Net Worth (Nominal),Net Worth (Real Today's Value),Annual Salary Income,Safe Withdrawal Income (${activeSWR}% SWR),Annual Expenses & Goals,Active Annual Savings,Passive Portfolio Growth,Survival Assessment\n`;

    projection.yearlyData.forEach((row: any) => {
      const stage = row.isRetired ? 'Retired' : 'Pre-Retirement';
      const swrVal = (row.nominal * swrMultiplier).toFixed(0);
      const activeExpenseTotal = (row.expense || 0) + (row.goalExpense || 0);
      
      let status = 'WORKING';
      if (row.isRetired) {
        status = row.nominal > 0 ? 'SURVIVING: Asset Positive' : 'DEPLETED: Funds Exhausted';
      }

      csv += `${row.year},${row.age},${stage},${row.nominal.toFixed(0)},${row.real.toFixed(0)},${row.income.toFixed(0)},${swrVal},${activeExpenseTotal.toFixed(0)},${row.yearlyContributionTotal.toFixed(0)},${row.passiveGrowth.toFixed(0)},${status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Financial_Model_Excel_Projections_${data.baseCurrency}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [projection, data]);

  const startPayPalSimulation = useCallback((bypass = false) => {
    if (bypass) {
      setPayPalPaymentState('success');
      setIsPremiumUnlocked(true);
      try {
        localStorage.setItem('fire_pro_unlocked', 'true');
      } catch {}
      handleDownloadExcel();
      return;
    }

    setPayPalPaymentState('linking');
    setSimulatedLogs(['[PayPal Gateway] Handshaking with secure checkout backend...', '[PayPal Gateway] Requesting v2/checkout/orders...']);

    setTimeout(() => {
      setPayPalPaymentState('authenticating');
      setSimulatedLogs(prev => [...prev, '[PayPal Gateway] Handshake payload status: SUCCESS.', '[PayPal Gateway] Directing secure sandbox payment terminal popup...', '[PayPal Gateway] Credentials resolved: Gaurav Paraswani (gaurav.paraswani@gmail.com)']);
    }, 1200);
  }, [handleDownloadExcel]);

  const authorizePayPalPayment = useCallback(() => {
    setPayPalPaymentState('authorized');
    setSimulatedLogs(prev => [...prev, '[PayPal Gateway] Client authorization token acknowledged.', '[PayPal Gateway] Routing payment settlement of $9.99 through sandbox card gateway...']);

    setTimeout(() => {
      setPayPalPaymentState('success');
      setIsPremiumUnlocked(true);
      try {
        localStorage.setItem('fire_pro_unlocked', 'true');
      } catch {}
      setSimulatedLogs(prev => [...prev, '[PayPal Gateway] Transaction Successful! Receipt ID: PAY-SANDBOX-7104812', '[PayPal Gateway] Premium Excel downloads permanently unlocked for user account.']);
      handleDownloadExcel();
    }, 1500);
  }, [handleDownloadExcel]);

  const resetPayPalState = useCallback(() => {
    setPayPalPaymentState('idle');
    setSimulatedLogs([]);
  }, []);

  const savePaypalCredentials = useCallback((newId: string, newEnv: 'sandbox' | 'live') => {
    setPaypalClientId(newId);
    setPaypalEnv(newEnv);
    try {
      localStorage.setItem('paypal_client_id', newId);
      localStorage.setItem('paypal_env', newEnv);
    } catch {}
    setIsClientEditing(false);
    setSimulatedLogs(prev => [
      ...prev,
      `[Config] Credentials updated! Environment set to: ${newEnv}`,
      `[Config] Client ID saved: ${newId.substring(0, 12)}...`
    ]);
  }, []);

  // Effect to load and initialize genuine PayPal Smart Payment Buttons
  useEffect(() => {
    if (!isExcelModalOpen || payPalPaymentState === 'success') return;

    let isMounted = true;
    const scriptId = 'paypal-sdk-script';

    const initButtons = () => {
      if (!isMounted) return;
      const paypalObj = (window as any).paypal;
      if (paypalObj && paypalObj.Buttons) {
        const container = document.getElementById('paypal-button-container');
        if (container) {
          container.innerHTML = ''; // clear any stale render
          try {
            paypalObj.Buttons({
              style: {
                layout: 'vertical',
                color: 'gold',
                shape: 'rect',
                label: 'paypal',
                tagline: false
              },
              createOrder: (data: any, actions: any) => {
                return actions.order.create({
                  purchase_units: [{
                    description: "Grand Financial Model Excel Planner Pro Report",
                    amount: {
                      currency_code: "USD",
                      value: "9.99"
                    }
                  }]
                });
              },
              onApprove: async (data: any, actions: any) => {
                if (!isMounted) return;
                setPayPalPaymentState('authorized');
                setSimulatedLogs(prev => [...prev, '[PayPal SDK] Client authorization received. Approving transaction...']);
                try {
                  const details = await actions.order.capture();
                  if (!isMounted) return;
                  setPayPalPaymentState('success');
                  setIsPremiumUnlocked(true);
                  try {
                    localStorage.setItem('fire_pro_unlocked', 'true');
                  } catch {}
                  setSimulatedLogs(prev => [
                    ...prev,
                    `[PayPal SDK] SUCCESS! Captured payment of $9.99 USD.`,
                    `[PayPal SDK] Transaction ID: ${details.id}`,
                    `[PayPal SDK] Payer Email: ${details.payer?.email_address || 'N/A'}`,
                    `[PayPal SDK] Status: COMPLETED`
                  ]);
                  handleDownloadExcel();
                } catch (err: any) {
                  console.error(err);
                  if (isMounted) {
                    setPayPalPaymentState('idle');
                    setSimulatedLogs(prev => [...prev, `[PayPal SDK] Capturing error: ${err.message || err.toString()}`]);
                  }
                }
              },
              onError: (err: any) => {
                console.error(err);
                if (isMounted) {
                  setPayPalPaymentState('idle');
                  setSimulatedLogs(prev => [...prev, `[PayPal SDK] Connection Error. Make sure Client ID matches your Environment: ${err.message || 'Check browser JavaScript logs.'}`]);
                }
              },
              onCancel: () => {
                if (isMounted) {
                  setPayPalPaymentState('idle');
                  setSimulatedLogs(prev => [...prev, '[PayPal SDK] Checkout cancelled by user.']);
                }
              }
            }).render('#paypal-button-container');
          } catch (e: any) {
            console.error(e);
            if (isMounted) {
              setSimulatedLogs(prev => [...prev, `[PayPal SDK] Initialization error: ${e.message || 'Buttons render failed'}`]);
            }
          }
        }
      }
    };

    // Stale Script Purging for Dynamic Switching
    const oldScript = document.getElementById(scriptId);
    if (oldScript) {
      oldScript.remove();
    }
    if ((window as any).paypal) {
      delete (window as any).paypal;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD`;
    script.async = true;
    script.onload = () => {
      if (isMounted) {
        setSimulatedLogs(prev => [...prev, `[PayPal SDK] Script mounted for Client ID: ${paypalClientId.substring(0, 10)}...`]);
        initButtons();
      }
    };
    script.onerror = () => {
      if (isMounted) {
        setSimulatedLogs(prev => [
          ...prev, 
          `[PayPal SDK] Error: Failed to script load. Either Client ID: "${paypalClientId}" is invalid or network block.`
        ]);
      }
    };

    setSimulatedLogs(prev => [...prev, `[PayPal SDK] Triggering connection to ${paypalEnv.toUpperCase()} server...`]);
    document.body.appendChild(script);

    return () => {
      isMounted = false;
      const el = document.getElementById(scriptId);
      if (el) el.remove();
      const container = document.getElementById('paypal-button-container');
      if (container) container.innerHTML = '';
    };
  }, [isExcelModalOpen, paypalClientId, paypalEnv]);

  const compoundingData = useMemo(() => {
    const startingNW = projection.yearlyData[0]?.nominal || 0;
    
    return projection.yearlyData.map((d: any) => {
      const contributionsUpToNow = projection.yearlyData
        .filter((y: any) => y.year <= d.year)
        .reduce((sum: number, y: any) => sum + (y.yearlyContributionTotal || 0), 0);
      
      const totalPrincipal = startingNW + contributionsUpToNow;
      const compoundedYield = Math.max(0, d.nominal - totalPrincipal);
      
      return {
        age: d.age,
        year: d.year,
        principal: totalPrincipal,
        growth: compoundedYield,
        total: d.nominal
      };
    });
  }, [projection.yearlyData]);

  useEffect(() => {
    const isDark = theme === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    const tooltipBg = isDark ? '#0f172a' : '#ffffff';
    const tooltipText = isDark ? '#cbd5e1' : '#1e293b';
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

    if (areaChartRef.current) {
      if (areaInstance.current) areaInstance.current.destroy();
      areaInstance.current = new Chart(areaChartRef.current, {
        type: 'line',
        data: {
          labels: projection.yearlyData.map((d: any) => d.age),
          datasets: [
            { 
              label: 'Nominal Value', 
              data: projection.yearlyData.map((d: any) => d.nominal), 
              borderColor: '#6366f1', 
              backgroundColor: 'rgba(99, 102, 241, 0.05)', 
              fill: true, 
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4
            },
            { 
              label: 'Real Value (Infl. Adj.)', 
              data: projection.yearlyData.map((d: any) => d.real), 
              borderColor: '#10b981', 
              backgroundColor: 'rgba(16, 185, 129, 0.05)', 
              fill: true, 
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4
            }
          ]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          interaction: { mode: 'index', intersect: false },
          plugins: { 
            legend: { 
              position: 'top',
              align: 'end',
              labels: { 
                color: textColor, 
                usePointStyle: true,
                pointStyle: 'line',
                boxWidth: 20,
                padding: 20,
                font: { size: 11, weight: 'bold' } 
              } 
            },
            tooltip: {
              backgroundColor: tooltipBg,
              titleColor: isDark ? '#fff' : '#1e293b',
              bodyColor: tooltipText,
              borderColor: tooltipBorder,
              borderWidth: 1,
              padding: 12,
              displayColors: true,
              yAlign: 'bottom',
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13, weight: 'bold' },
              footerFont: { size: 12, weight: 'bold' },
              callbacks: {
                title: (context) => {
                  const index = context[0].dataIndex;
                  const entry = projection.yearlyData[index];
                  if (entry) {
                    return `Age ${entry.age}. Year ${entry.year}`;
                  }
                  return `Age ${context[0].label}`;
                },
                label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y, data.baseCurrency)}`
              }
            }
          }, 
          scales: { 
            x: { 
              grid: { display: false },
              ticks: { color: textColor, font: { size: 10 } } 
            }, 
            y: { 
              ticks: { 
                color: textColor, 
                font: { size: 10 },
                callback: (value) => formatCurrency(value as number, data.baseCurrency).replace('$', '').replace('€', '').replace('£', '')
              }, 
              grid: { color: gridColor } 
            } 
          } 
        }
      });
    }

    if (donutChartRef.current) {
      if (donutInstance.current) donutInstance.current.destroy();
      const labels = Object.keys(projection.assetAllocation);
      const values = Object.values(projection.assetAllocation) as number[];

      donutInstance.current = new Chart(donutChartRef.current, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{ 
            data: values, 
            backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'], 
            borderWidth: 0,
            hoverOffset: 10
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          cutout: '75%',
          plugins: { 
            legend: { 
              position: 'bottom', 
              labels: { 
                color: textColor, 
                font: { size: 11 },
                usePointStyle: true,
                padding: 15
              } 
            },
            tooltip: {
              backgroundColor: tooltipBg,
              titleColor: isDark ? '#fff' : '#1e293b',
              bodyColor: tooltipText,
              borderColor: tooltipBorder,
              borderWidth: 1,
              padding: 12,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13, weight: 'bold' },
              footerFont: { size: 12, weight: 'bold' },
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = context.parsed as number;
                  const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${formatCurrency(value, data.baseCurrency)} (${percentage}%)`;
                }
              }
            }
          } 
        }
      });
    }

    if (fiCrossoverChartRef.current) {
      if (fiCrossoverInstance.current) fiCrossoverInstance.current.destroy();
      const filteredYearly = projection.yearlyData.filter((_: any, i: number) => i % 2 === 0);

      const totalRetirementMonthlyBase = projection.totalRetirementMonthlyBase || 0;
      const totalWorkingExpensesBase = projection.totalExpensesBase || 0;

      const baseRetirementCost = totalRetirementMonthlyBase > 0 ? totalRetirementMonthlyBase : totalWorkingExpensesBase;
      const activeSWRPrice = safeFloat(data.safeWithdrawalRate || 4.0);
      const swrFraction = activeSWRPrice / 100;

      fiCrossoverInstance.current = new Chart(fiCrossoverChartRef.current, {
        type: 'line',
        data: {
          labels: filteredYearly.map((d: any) => d.age),
          datasets: [
            {
              label: `Sustainable Passive Income (${activeSWRPrice}% SWR)`,
              data: filteredYearly.map((d: any) => d.nominal * swrFraction),
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.05)',
              borderWidth: 2,
              fill: true,
              tension: 0.3,
              pointRadius: 0,
              pointHoverRadius: 4
            },
            {
              label: 'Target Retirement Core Costs',
              data: filteredYearly.map((d: any) => {
                const yearIndex = d.age - data.currentAge;
                const inflationMultiplier = Math.pow(1 + safeFloat(data.inflationRate) / 100, yearIndex);
                // Draw target post-retirement core expenses tracking inflation
                return baseRetirementCost * inflationMultiplier;
              }),
              borderColor: '#f43f5e',
              backgroundColor: 'rgba(244, 63, 94, 0.03)',
              borderWidth: 2,
              fill: true,
              tension: 0.3,
              pointRadius: 0,
              pointHoverRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: {
                color: textColor,
                usePointStyle: true,
                padding: 15,
                font: { size: 10, weight: 'bold' }
              }
            },
            tooltip: {
              backgroundColor: tooltipBg,
              titleColor: isDark ? '#fff' : '#1e293b',
              bodyColor: tooltipText,
              borderColor: tooltipBorder,
              borderWidth: 1,
              padding: 12,
              yAlign: 'bottom',
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13, weight: 'bold' },
              footerFont: { size: 12, weight: 'bold' },
              callbacks: {
                title: (context) => {
                  const entry = filteredYearly[context[0].dataIndex];
                  return entry ? `Age ${entry.age}. Year ${entry.year}` : `Age ${context[0].label}`;
                },
                label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y, data.baseCurrency)}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: textColor, font: { size: 10 } }
            },
            y: {
              ticks: {
                color: textColor,
                font: { size: 10 },
                callback: (value) => formatCurrency(value as number, data.baseCurrency).replace('$', '').replace('€', '').replace('£', '')
              },
              grid: { color: gridColor }
            }
          }
        }
      });
    }

    if (compoundingChartRef.current) {
      if (compoundingInstance.current) compoundingInstance.current.destroy();

      compoundingInstance.current = new Chart(compoundingChartRef.current, {
        type: 'line',
        data: {
          labels: compoundingData.map((d: any) => d.age),
          datasets: [
            {
              label: 'Cumulative Principal Saved',
              data: compoundingData.map((d: any) => d.principal),
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99, 102, 241, 0.4)',
              borderWidth: 1.5,
              fill: true,
              tension: 0.3,
              pointRadius: 0,
              pointHoverRadius: 4
            },
            {
              label: 'Compounded Portfolio Growth',
              data: compoundingData.map((d: any) => d.growth),
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.4)',
              borderWidth: 1.5,
              fill: true,
              tension: 0.3,
              pointRadius: 0,
              pointHoverRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: {
                color: textColor,
                usePointStyle: true,
                padding: 15,
                font: { size: 10, weight: 'bold' }
              }
            },
            tooltip: {
              backgroundColor: tooltipBg,
              titleColor: isDark ? '#fff' : '#1e293b',
              bodyColor: tooltipText,
              borderColor: tooltipBorder,
              borderWidth: 1,
              padding: 12,
              yAlign: 'bottom',
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13, weight: 'bold' },
              footerFont: { size: 12, weight: 'bold' },
              callbacks: {
                title: (context) => {
                  const entry = compoundingData[context[0].dataIndex];
                  return entry ? `Age ${entry.age}. Year ${entry.year}` : `Age ${context[0].label}`;
                },
                label: (context) => {
                  const label = context.dataset.label || '';
                  const value = context.parsed.y;
                  return `${label}: ${formatCurrency(value, data.baseCurrency)}`;
                },
                footer: (context) => {
                  const entry = compoundingData[context[0].dataIndex];
                  if (entry) {
                    return `Total Wealth: ${formatCurrency(entry.total, data.baseCurrency)}`;
                  }
                  return '';
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: textColor, font: { size: 10 } }
            },
            y: {
              stacked: true,
              ticks: {
                color: textColor,
                font: { size: 10 },
                callback: (value) => formatCurrency(value as number, data.baseCurrency).replace('$', '').replace('€', '').replace('£', '')
              },
              grid: { color: gridColor }
            }
          }
        }
      });
    }

    return () => {
      areaInstance.current?.destroy();
      donutInstance.current?.destroy();
      fiCrossoverInstance.current?.destroy();
      compoundingInstance.current?.destroy();
    };
  }, [projection, compoundingData, data.baseCurrency, theme]);

  const latest = projection.yearlyData[0] || { nominal: 0 };
  const retired = projection.yearlyData.find((d: any) => d.age === data.retirementAge) || { real: 0 };

  return (
    <div className="space-y-8 relative">
      {/* Excel Export Pro Banner */}
      <div className={`p-6 md:p-8 rounded-3xl border shadow-xl transition-all duration-300 ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border-slate-700/50' 
          : 'bg-gradient-to-r from-slate-100 via-indigo-50/20 to-slate-100 border-slate-200'
      }`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div className={`p-3.5 rounded-2xl shrink-0 ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
              <Download size={22} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={`font-black text-sm uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Grand Financial Model Excel Planner
                </h4>
                <span className="bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-amber-500/20">
                  PRO FEATURE
                </span>
                <span className="bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-rose-500/20 animate-pulse">
                  COMING SOON
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
                Download the full year-by-year auditing ledgers, pre-retirement earnings vs Core Cash outflows, {data.safeWithdrawalRate || 4.0}% SWR post-retirement survivability forecasts, and asset allocation indexes. Fully compliant with Microsoft Excel, Apple Numbers, & Google Sheets.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto shrink-0">
            {isPremiumUnlocked ? (
              <button 
                onClick={handleDownloadExcel}
                className="w-full lg:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl shadow-lg hover:shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer"
              >
                <Download size={14} /> Download Excel Model
              </button>
            ) : (
              <button 
                disabled
                className="w-full lg:w-auto flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl cursor-not-allowed transition-all opacity-60"
              >
                <Lock size={12} /> Unlock Excel Sheet (Coming Soon)
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'} p-6 rounded-3xl border shadow-xl backdrop-blur-sm transition-colors duration-300 relative group`}>
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Net Worth</p>
            <Tooltip text="Your total wealth in your base currency. This includes liquid assets, future assets (at PV), and current investment balances." theme={theme}>
              <HelpCircle size={14} className="text-slate-500 hover:text-indigo-400 transition-colors" />
            </Tooltip>
          </div>
          <h3 className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(latest.nominal, data.baseCurrency)}</h3>
          <div className="mt-2 flex items-center text-xs text-slate-400">
            <span className={`${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'} px-2 py-1 rounded font-mono uppercase tracking-tighter`}>Liquid + Invested</span>
          </div>
        </div>
        <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'} p-6 rounded-3xl border shadow-xl backdrop-blur-sm transition-colors duration-300 relative group`}>
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Ann. Contributions</p>
            <Tooltip text="The total annual amount you are currently contributing to all growth portfolios/investments." theme={theme}>
              <HelpCircle size={14} className="text-slate-500 hover:text-indigo-500 transition-colors" />
            </Tooltip>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-emerald-500">{formatCurrency(projection.annualContributions, data.baseCurrency)}</h3>
          <div className="mt-2 flex items-center text-xs text-emerald-500/70">
            <span className="bg-emerald-500/10 px-2 py-1 rounded font-mono uppercase tracking-tighter">Towards Growth</span>
          </div>
        </div>
        <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'} p-6 rounded-3xl border shadow-xl backdrop-blur-sm transition-colors duration-300 relative group`}>
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Retirement Pool</p>
            <Tooltip text="The projected total nominal value of all assets on the day you retire, adjusted for inflation to show 'today's value' (Real Value)." theme={theme}>
              <HelpCircle size={14} className="text-slate-500 hover:text-indigo-505 transition-colors" />
            </Tooltip>
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-indigo-500">{formatCurrency(retired.real, data.baseCurrency)}</h3>
          <div className="mt-2 flex items-center text-xs text-indigo-500/70">
            <span className="bg-indigo-500/10 px-2 py-1 rounded font-mono uppercase tracking-tighter">Target at Age {data.retirementAge}</span>
          </div>
        </div>
        <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'} p-6 rounded-3xl border shadow-xl backdrop-blur-sm transition-colors duration-300 relative group`}>
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Retirement Runway</p>
            <Tooltip text="How many years your wealth will last after retirement while supporting your monthly lifestyle expenses and lump sums." theme={theme}>
              <HelpCircle size={14} className="text-slate-500 hover:text-indigo-500 transition-colors" />
            </Tooltip>
          </div>
          <h3 className={`text-2xl font-bold tracking-tight ${projection.runwayEnded ? 'text-rose-500' : 'text-emerald-500'}`}>
            {projection.runwayYears} Years
          </h3>
          <div className="mt-2 flex items-center text-xs text-slate-400">
            <span className={`${projection.runwayEnded ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'} px-2 py-1 rounded font-mono uppercase tracking-tighter`}>
              {projection.runwayEnded ? 'Depleted at age ' + (data.retirementAge + projection.runwayYears) : 'Sustainable lifestyle'}
            </span>
          </div>
        </div>
      </div>
      
      {/* 100% width Asset Projection */}
      <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'} p-6 md:p-8 rounded-3xl border flex flex-col shadow-xl transition-colors duration-300`}>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Asset Projection (Nominal vs Real)</h4>
            <Tooltip text="This chart tracks your cumulative wealth over time. Nominal Value represents the absolute future dollar balance. Real Value (Inflation Adjusted) scales those future balances back to today's purchasing power using your inflation rate parameter, showing if your growth genuinely beats inflation." theme={theme}>
              <HelpCircle size={14} className="text-slate-500 hover:text-indigo-400 cursor-help transition-colors" />
            </Tooltip>
          </div>
        </div>
        <div className="flex-1 h-[400px] min-h-[350px]">
          <canvas ref={areaChartRef}></canvas>
        </div>
      </div>

      {/* Allocation and FI/RE Crossover Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'} p-6 md:p-8 rounded-3xl border min-h-[350px] md:min-h-[400px] flex flex-col shadow-xl transition-colors duration-300`}>
          <div className="flex items-center gap-2 mb-6">
            <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Current Asset Allocation</h4>
            <Tooltip text="A physical breakdown of your current asset mixture. It categorizes your wealth between static cash, gold inventory, real estate maturity structures, and active compounding brokerage index funds. Strategic diversification lowers overall risk." theme={theme}>
              <HelpCircle size={14} className="text-slate-500 hover:text-indigo-400 cursor-help transition-colors" />
            </Tooltip>
          </div>
          <div className="flex-1 min-h-[250px] relative">
             <canvas ref={donutChartRef}></canvas>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1">Total Assets</p>
                <p className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(latest.nominal, data.baseCurrency)}</p>
             </div>
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'} p-6 md:p-8 rounded-3xl border min-h-[350px] md:min-h-[400px] flex flex-col shadow-xl transition-colors duration-300`}>
          <div className="flex items-center gap-2 mb-6">
            <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">FI/RE Crossover: Sustainable SWR Income vs. Core Costs</h4>
            <Tooltip text="The ultimate Financial Independence milestone chart. The green line is your Sustainable Passive Income computed using your defined Safe Withdrawal Rate (SWR) on your accumulated asset pool. The red line traces your active regular living expenses and goals. When the green line crosses above the red line, your assets can sustain your lifestyle!" theme={theme}>
              <HelpCircle size={14} className="text-slate-500 hover:text-indigo-400 cursor-help transition-colors" />
            </Tooltip>
          </div>
          <div className="flex-1 min-h-[250px]">
             <canvas ref={fiCrossoverChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* Power of Compounding Full Width */}
      <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'} p-6 md:p-8 rounded-3xl border flex flex-col shadow-xl transition-colors duration-300 pb-20`}>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Power of Compounding: Cumulative Principal vs. Investment Growth</h4>
            <Tooltip text="Tracks the building power of compounding interest over time. The solid principal block shows your self-funded seed balance and voluntary savings deposits. The green block captures accumulated passive interest, dividends, and market yields. This highlights how compound interest does the heavy lifting for your future self." theme={theme}>
              <HelpCircle size={14} className="text-slate-500 hover:text-indigo-400 cursor-help transition-colors" />
            </Tooltip>
          </div>
        </div>
        <div className="flex-1 h-[400px] min-h-[350px]">
          <canvas ref={compoundingChartRef}></canvas>
        </div>
      </div>

      {/* Premium Excel Modal with PayPal simulation */}
      <AnimatePresence>
        {isExcelModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (payPalPaymentState !== 'linking' && payPalPaymentState !== 'authorized') {
                  setIsExcelModalOpen(false);
                }
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-6 md:p-8 flex flex-col md:flex-row gap-8 transition-colors ${
                theme === 'dark' 
                  ? 'bg-slate-900 border-slate-700 text-white' 
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <button 
                onClick={() => setIsExcelModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/10 dark:hover:bg-slate-805 rounded-xl transition-all"
              >
                <X size={18} />
              </button>

              {/* Left Panel: Content / Marketing details */}
              <div className="flex-1 space-y-6">
                <div>
                  <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-indigo-500/20">
                    Pro Report Edition
                  </span>
                  <h3 className="text-xl md:text-2xl font-black tracking-tight mt-3">
                    Unlock Premium Excel Projections Sheet
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Unchain your financial planning limits with a fully compiled spreadsheet detailing every asset class growth cycle. Check exact SWR math and survivor matrices in offline spreadsheets.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-500">
                    Detailed Sections Included:
                  </h4>
                  <ul className="space-y-3">
                    {[
                      { title: "Summary KPI Dashboards", desc: "A summary table projecting your total nominal net worth, inflation-adjusted worth, and expected retirement target age payouts." },
                      { title: "Working vs Retired Cash Ledger", desc: "Full year-by-year auditing row mapping active salary wages, cash inflows, and goal living values concurrently." },
                      { title: "Compounding Growth Yield Analysis", desc: "Witness real-time separation coefficients tracking pure base cash deposits versus portfolio interests generated." },
                      { title: `${data.safeWithdrawalRate || 4.0}% SWR Safe Survival Index`, desc: "Accredited safe withdrawal formula displaying asset survival status, warning flag triggers, or resource exhausts." }
                    ].map((feat, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <div className={`p-1 mt-0.5 rounded-full ${theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                          <CheckCircle2 size={12} />
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-normal">{feat.title}</p>
                          <p className="text-[11px] text-slate-400 leading-normal mt-0.5">{feat.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right Panel: PayPal Checkout Terminal */}
              <div className={`w-full md:w-[350px] shrink-0 p-6 rounded-2xl flex flex-col justify-between border ${
                theme === 'dark' 
                  ? 'bg-slate-950/40 border-slate-800' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-800/10 dark:border-slate-800/50">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selected Package</p>
                      <p className="text-xs font-bold mt-0.5">Grand Excel Financial Plan</p>
                    </div>
                    <div className="text-right">
                      <p className="text-indigo-500 font-extrabold text-sm">$9.99</p>
                      <p className="text-[9px] text-slate-500 uppercase">One-Time Fee</p>
                    </div>
                  </div>

                  {/* Environment Selector and Client ID Configuration */}
                  <div className="p-3 bg-indigo-500/5 dark:bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-[11px] text-slate-400 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold flex items-center gap-1.5 uppercase text-[9px] text-indigo-400 tracking-wider">
                        <Settings size={11} /> Gateway: {paypalEnv === 'live' ? '🟢 LIVE PRODUCTION' : '🟡 SANDBOX'}
                      </span>
                      <button 
                        onClick={() => {
                          setIsClientEditing(!isClientEditing);
                          setClientIdInput(paypalClientId);
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer text-[10px]"
                      >
                        {isClientEditing ? 'Cancel' : 'Configure Custom Credentials'}
                      </button>
                    </div>

                    {isClientEditing ? (
                      <div className="space-y-2 pt-1.5 border-t border-indigo-500/10">
                        <p className="text-[10px] text-zinc-400 leading-normal">
                          Login to <strong>developer.paypal.com</strong> using your business account. Create an App under <em>My Apps & Credentials</em>, copy the <strong>Client ID</strong>, and paste it below.
                        </p>
                        <div>
                          <label className="block text-[9px] uppercase font-black tracking-widest text-slate-500 mb-1">
                            Environment Toggle
                          </label>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setClientIdInput('sb');
                              }}
                              className={`flex-1 py-1 rounded text-center text-[9px] font-bold border transition-all ${
                                clientIdInput === 'sb' ? 'bg-amber-600/10 border-amber-500/30 text-amber-500' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                              }`}
                            >
                              Demo (Sandbox)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (clientIdInput === 'sb') {
                                  setClientIdInput('');
                                }
                              }}
                              className={`flex-1 py-1 rounded text-center text-[9px] font-bold border transition-all ${
                                clientIdInput !== 'sb' ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                              }`}
                            >
                              Live Production
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">
                            Public Client ID
                          </label>
                          <input 
                            type="text"
                            value={clientIdInput}
                            onChange={(e) => setClientIdInput(e.target.value)}
                            placeholder="Enter Client ID or 'sb'"
                            className="w-full bg-slate-950 border border-slate-850 px-2 py-1.5 rounded font-mono text-[9px] text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const targetEnv = clientIdInput === 'sb' ? 'sandbox' : 'live';
                              savePaypalCredentials(clientIdInput, targetEnv);
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-1.5 rounded text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                          >
                            Save Settings & Reload
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 leading-normal">
                        <p>
                          Currently connected using <code className="text-slate-300 font-mono text-[9px]">{paypalClientId === 'sb' ? 'Standard Demo Sandbox' : `${paypalClientId.substring(0, 16)}...`}</code>.
                        </p>
                        {paypalClientId === 'sb' ? (
                          <p className="mt-1 text-slate-500 text-[9px]">
                            Live Payments are disabled in Demomode. To collect real revenue under your balance, configure your Live Client ID above.
                          </p>
                        ) : (
                          <p className="mt-1 text-emerald-500 text-[9px] font-bold">
                            ✔ Customer transaction routing goes live under your custom Client ID.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Payment terminal window states */}
                  {payPalPaymentState === 'idle' && (
                    <div className="space-y-4">
                      {/* True SDK buttons container target */}
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-400 leading-normal text-center">
                          Pay using Secure PayPal checkout or standard credit cards directly:
                        </p>
                        <div id="paypal-button-container" className="min-h-[140px] bg-slate-950/10 p-2 rounded-xl border border-slate-900/10 dark:border-slate-800/50" />
                      </div>

                      {/* Dev Sandbox Pass */}
                      <div className="pt-2 border-t border-slate-800/10 dark:border-slate-800/50">
                        <button 
                          onClick={() => startPayPalSimulation(true)}
                          className="w-full flex items-center justify-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold text-[9px] uppercase tracking-widest py-2 rounded-xl border border-indigo-500/20 transition-all cursor-pointer"
                        >
                          <Unlock size={10} /> Bypass Payment (Demo Mode)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Linking / Handshaking State */}
                  {payPalPaymentState === 'linking' && (
                    <div className="space-y-4 py-8 flex flex-col items-center justify-center text-center">
                      <Loader2 className="animate-spin text-indigo-500" size={32} />
                      <div>
                        <p className="text-xs font-bold">Contacting secure gateway...</p>
                        <p className="text-[10px] text-zinc-500 animate-pulse mt-1">
                          Authorizing secure session handshake...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Authenticated Approval Screen */}
                  {payPalPaymentState === 'authenticating' && (
                    <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3 mt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-amber-500 tracking-widest">SANDBOX ACCESS</span>
                        <span className="text-[9px] text-slate-500">v2/checkout</span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-300">
                        Authenticate as: <strong className="text-white">gaurav.paraswani@gmail.com</strong>
                      </p>
                      <button
                        onClick={authorizePayPalPayment}
                        className="w-full bg-[#0079c1] hover:bg-[#00457c] text-white font-black text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer"
                      >
                        Authorize & Pay $9.99
                      </button>
                    </div>
                  )}

                  {/* Approved / Clearing State */}
                  {payPalPaymentState === 'authorized' && (
                    <div className="space-y-4 py-8 flex flex-col items-center justify-center text-center animate-pulse">
                      <Loader2 className="animate-spin text-emerald-500" size={32} />
                      <div>
                        <p className="text-xs font-bold text-emerald-400">Transaction Approved!</p>
                        <p className="text-[10px] text-zinc-500 mt-1">Clearing funds and writing receipt token...</p>
                      </div>
                    </div>
                  )}

                  {/* Success Screen */}
                  {payPalPaymentState === 'success' && (
                    <div className="space-y-4 text-center py-6">
                      <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase text-emerald-400 tracking-wider">Purchase Approved!</p>
                        <p className="text-[10px] text-slate-400 mt-1">We successfully processed your PayPal payment of $9.99 USD.</p>
                      </div>
                      
                      <button
                        onClick={handleDownloadExcel}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl shadow-lg transition-all cursor-pointer animate-pulse"
                      >
                        <Download size={12} /> Save Excel File
                      </button>

                      <button
                        onClick={() => {
                          setIsExcelModalOpen(false);
                          resetPayPalState();
                        }}
                        className="text-[10px] text-slate-500 hover:text-slate-400 uppercase tracking-widest mt-2 block mx-auto underline"
                      >
                        Close Window
                      </button>
                    </div>
                  )}

                  {/* Connected Gateway Log Output console */}
                  {simulatedLogs.length > 0 && (
                    <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-805 font-mono text-[9px] text-slate-500 space-y-1 max-h-[140px] overflow-y-auto leading-normal">
                      <div className="flex items-center gap-1.5 pb-1 border-b border-slate-800/50 mb-1 text-slate-500 font-sans font-black tracking-wider text-[8px] uppercase">
                        <span>GATEWAY_STATUS</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                      </div>
                      {simulatedLogs.map((log, i) => (
                        <p key={i} className={log.includes('SUCCESS!') || log.includes('Captured') ? 'text-emerald-400 font-bold' : 'text-slate-400'}>{log}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ParameterInput = memo(({ label, help, value, min, max, step, suffix, onChange, theme }: any) => {
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    // Sync local text when value changes from outside (e.g. slider moves)
    setInputValue(value.toString());
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setInputValue(rawValue);
    const parsed = parseFloat(rawValue);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      if (clamped !== value) {
        onChange(clamped);
      }
    }
  };

  const handleBlur = () => {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed) || parsed < min) {
      onChange(min);
      setInputValue(min.toString());
    } else if (parsed > max) {
      onChange(max);
      setInputValue(max.toString());
    } else {
      setInputValue(parsed.toString());
    }
  };

  return (
    <div className="mb-8 group">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <label className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500 group-hover:text-slate-400' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`}>
            {label}
          </label>
          {help && (
            <Tooltip text={help} theme={theme}>
              <HelpCircle size={12} className="text-slate-600 hover:text-indigo-400 transition-colors" />
            </Tooltip>
          )}
        </div>
        <div className={`flex items-center gap-1 ${theme === 'dark' ? 'bg-slate-950/50 border-slate-700/50' : 'bg-slate-100 border-slate-200'} px-3 py-1.5 rounded-xl border focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all`}>
          <input 
            type="number"
            value={inputValue}
            step={step}
            onChange={handleTextChange}
            onBlur={handleBlur}
            className={`w-14 bg-transparent text-right font-black ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} text-sm outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          />
          <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 select-none">{suffix.trim()}</span>
        </div>
      </div>
      <div className="relative flex items-center">
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step} 
          value={value} 
          onChange={e => onChange(parseFloat(e.target.value))} 
          className={`w-full h-1.5 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'} rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all`} 
        />
      </div>
    </div>
  );
});

function GuideTab({ theme, setActiveTab }: { theme: 'light' | 'dark', setActiveTab: (tab: any) => void }) {
  const steps = [
    {
      num: '1',
      title: 'Timeline & Forecast (Parameters)',
      tabId: 'profile',
      desc: 'Set up your baseline timeline. Input your Current Age, planned Retirement Age, and overall Life Expectancy. Set realistic assumptions for Inflation Rate, income adjustments, and expected yield.',
      tip: '💡 Setting a higher inflation rate simulates conservative budgets, while expected yield determines your drawdown speed.'
    },
    {
      num: '2',
      title: 'Monthly Cash Flow (Income & Expenses)',
      tabId: 'cashflow',
      desc: 'List your current recurring pre-retirement revenue streams (salary, rent, dividend) and living expenses. This shapes your yearly working-years net budget.',
      tip: '💡 Enter monthly living expenses like rent, utilities, and groceries. For expenses with specific end months or years, configure those optional end dates inside the Living Expenses section!'
    },
    {
      num: '3',
      title: 'Financial Assets & Investments (Portfolio)',
      tabId: 'portfolio',
      desc: 'Document your active portfolio ecosystem. Split into current static asset inventory (Cash, Gold, Real Estate) and Growth Portfolios/Brokerage accounts with regular contribution streams and expected yields.',
      tip: '💡 Portfolio compounding is what fuels your long-term wealth curves.'
    },
    {
      num: '4',
      title: 'Pre-Retirement Milestones (Goals)',
      tabId: 'goals',
      desc: 'Specify any prospective capital outflows (down payments, vehicle replacement, study funds) before you stop working. These target precise future years.',
      tip: '💡 Goals deduct directly from your liquid savings pool in their allocated year of occurrence.'
    },
    {
      num: '5',
      title: 'Golden Years Budget (Retirement)',
      tabId: 'retirement',
      desc: 'Delineate your post-retirement comfortable living cost. Define monthly lifestyle budgets or one-time lump-sum retirement rewards (like travel, mortgage payoff).',
      tip: '💡 Post-retirement monthly outlays automatically activate on your retirement year index, adjusting for lifetime compounding inflation.'
    }
  ];

  const results = [
    {
      title: 'Liquid Net Worth Growth Curve',
      desc: 'Shows how your lifetime capital compounds over time. Watch for the turning point on your retirement age mark, indicating when active savings stop and investment harvesting/drawdowns begin.'
    },
    {
      title: 'Financial Independence Crossover Point',
      desc: 'Look at the crossover intersection. This is the precise age where your passive portfolio yields safely cover 100% of your ongoing lifestyle and inflation-adjusted living expenses.'
    },
    {
      title: 'Compounding Investment Split',
      desc: 'Visualizes the absolute strength of compound interest. It breaks down the total wealth slice into your self-funded principal versus growth from compounding interest.'
    },
    {
      title: 'Runway Years & Capital Exhaustion',
      desc: 'Instantly highlights if and when your portfolio runs out of balance during your retired twilight years. If your runway covers past your life expectancy, your plan is 100% safe!'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-12">
      <div className={`${theme === 'dark' ? 'bg-indigo-950/10 border-indigo-505/20' : 'bg-indigo-50 border-indigo-100'} p-8 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm`}>
        <div className="space-y-2">
          <h2 className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Welcome to your Financial Blueprint Planner
          </h2>
          <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} leading-relaxed max-w-3xl`}>
            Follow this structured workbook methodology to model your path to early retirement. Each section layers variables onto our high-resolution projection engine to calculate precise timeline success rates.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('dashboard')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase px-5 py-3 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all shrink-0 cursor-pointer"
        >
          Go to Dashboard
        </button>
      </div>


      {/* Data Sovereignty & Privacy Banner Card */}
      <div className={`${theme === 'dark' ? 'bg-emerald-950/15 border-emerald-500/20' : 'bg-emerald-50/40 border-emerald-100'} p-6 rounded-3xl border flex flex-col md:flex-row items-start gap-4 transition-colors duration-300`}>
        <div className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'} shrink-0`}>
          <Shield size={22} />
        </div>
        <div className="space-y-1">
          <h4 className={`text-sm font-black uppercase tracking-wider ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-800'}`}>
            Data Privacy & Sovereignty Guard
          </h4>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
            We respect your financial secrets. <strong>Wealth Virgo does not store, collect, or transmit any of your personal information, active investments, or retirement profiles on our servers</strong>. Everything is secure and calculated 100% locally in your device's browser memory. You have absolute ownership of your financial blueprints: you can download your custom configuration file locally at any time and securely re-upload it to resume planning.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Inputs Checklist */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black text-sm select-none">
              ✔
            </span>
            <h3 className={`text-lg font-black uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Checklist & Order of Input
            </h3>
          </div>

          <div className="space-y-4 relative pl-4 border-l border-indigo-500/20 ml-4">
            {steps.map((s, idx) => (
              <div 
                key={idx}
                className={`${theme === 'dark' ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60' : 'bg-white border-slate-200 hover:bg-slate-50'} p-5 rounded-2xl border transition-all duration-200 relative group`}
              >
                {/* Number Badge */}
                <span className="absolute -left-7 top-5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-[10px] shadow">
                  {s.num}
                </span>

                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1.5">
                    <h4 className={`text-xs md:text-sm font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                      {s.title}
                    </h4>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                      {s.desc}
                    </p>
                    <p className={`text-[11px] italic ${theme === 'dark' ? 'text-slate-500' : 'text-indigo-600/80'} leading-relaxed pt-1`}>
                      {s.tip}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setActiveTab(s.tabId)}
                    className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border flex items-center gap-1 shrink-0 ${
                      theme === 'dark'
                      ? 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10'
                      : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                    } transition-all`}
                  >
                    Open <ArrowRight size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Decode Results */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-sm select-none">
              📊
            </span>
            <h3 className={`text-lg font-black uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              How to Decode Dashboard Results
            </h3>
          </div>

          <div className={`${theme === 'dark' ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'} p-6 rounded-3xl border space-y-5 transition-colors`}>
            {results.map((r, idx) => (
              <div key={idx} className="space-y-1.5">
                <h4 className={`text-xs md:text-sm font-extrabold uppercase tracking-wide flex items-center gap-2 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  ✨ {r.title}
                </h4>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                  {r.desc}
                </p>
                {idx < results.length - 1 && <hr className={`${theme === 'dark' ? 'border-slate-800/50' : 'border-slate-100'} my-4`} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <footer className={`mt-16 pt-8 pb-12 border-t ${theme === 'dark' ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-600'} text-xs leading-relaxed transition-colors duration-300`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center space-x-2.5">
            <img 
              src={logoImg} 
              alt="Wealth Virgo" 
              className="w-10 h-10 rounded-xl object-cover shadow-sm bg-slate-900 border border-slate-700/50" 
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/wealth_virgo_logo.jpg';
              }}
              referrerPolicy="no-referrer"
            />
            <span className={`font-black text-base tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Wealth Virgo
            </span>
          </div>
          <p className="text-slate-400 max-w-sm mt-2 text-[11px] leading-relaxed">
            Wealth Virgo is an advanced, client-centric secure mathematical workspace designed to draft, simulate, and stress-test highly robust financial blueprints and early retirement portfolios.
          </p>
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Zero Server-Log Custody Mode
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <h4 className={`text-[10px] uppercase font-black tracking-widest ${theme === 'dark' ? 'text-slate-300' : 'text-slate-800'}`}>
            Data Privacy & Client-Side Security Policy
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-1">
              <span className="block font-bold text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                1. 100% Sovereign Calculations
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                We respect your personal information. None of your earnings, cashflows, assets, or goals are ever sent to, parsed by, or stored on standard cloud databases or server tracking nodes.
              </p>
            </div>
            <div className="space-y-1">
              <span className="block font-bold text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                2. On-Demand File Serialization
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                You exercise complete custody of your financial blueprint records. Download your active ledger data instantly via text-safe JSON backups and securely load them back when updating.
              </p>
            </div>
            <div className="space-y-1">
              <span className="block font-bold text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                3. Browser AES Encryption
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Secure your exported files with client-side block ciphers. All key hashes and password verifications compile straight inside browser sandboxes, preventing leakages.
              </p>
            </div>
            <div className="space-y-1">
              <span className="block font-bold text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                4. Zero Profiling or Ad Trackers
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                There are no marketing cookies, behavioral crawlers, or sales triggers. Your model calculations are treated with the highest degree of cryptographic privacy.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-dashed border-slate-800/10 dark:border-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        <span>© {new Date().getFullYear()} Wealth Virgo. All rights reserved.</span>
        <span className="normal-case tracking-normal text-slate-400 dark:text-slate-500 text-xs text-center">
          For any queries, contact: <a href="mailto:help@wealthvirgo.com" className="hover:text-indigo-500 underline font-medium transition-colors">help@wealthvirgo.com</a>
        </span>
        <span>Processed Securely locally inside client sandbox environment</span>
      </div>
    </footer>
  );
}

function ProfileTab({ data, updateData, theme }: { data: any, updateData: any, theme: 'light' | 'dark' }) {
  const isDark = theme === 'dark';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className={`p-6 md:p-8 rounded-3xl border transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-black uppercase tracking-widest ${
              isDark ? 'text-indigo-400' : 'text-indigo-600'
            }`}>
              Step 1 · Baseline Parameters
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-xs text-slate-500">Ages {data.currentAge} to {data.lifeExpectancy}</span>
          </div>
          <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            What is your timeline and economic outlook?
          </h2>
          <p className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
            Configure your age milestones, expected inflation, income growth, post-retirement yield, and Safe Withdrawal Rate (SWR) to power every projection across your plan.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className={`${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'} p-8 rounded-3xl border shadow-xl backdrop-blur-sm transition-colors duration-300`}>
          <h3 className={`text-lg font-bold mb-8 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Settings size={22} className="text-indigo-500" /> Timeline Parameters
          </h3>
          <ParameterInput label="Current Age" help="Your age at the start of the projection." value={data.currentAge} min={18} max={80} step={1} suffix=" yrs" onChange={(v: number) => updateData('currentAge', v)} theme={theme} />
          <ParameterInput label="Retirement Age" help="The age at which you plan to stop working and start living off your assets." value={data.retirementAge} min={data.currentAge} max={90} step={1} suffix=" yrs" onChange={(v: number) => updateData('retirementAge', v)} theme={theme} />
          <ParameterInput label="Life Expectancy" help="The final age used for the projection. Calculations will run until this year." value={data.lifeExpectancy} min={data.retirementAge} max={110} step={1} suffix=" yrs" onChange={(v: number) => updateData('lifeExpectancy', v)} theme={theme} />
        </div>
        <div className={`${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'} p-8 rounded-3xl border shadow-xl backdrop-blur-sm transition-colors duration-300`}>
          <h3 className={`text-lg font-bold mb-8 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <TrendingUp size={22} className="text-emerald-500" /> Economic Forecast
          </h3>
          <ParameterInput label="Annual Inflation Rate" help="The expected annual increase in the cost of living. Default is 2.5%." value={data.inflationRate} min={0} max={15} step={0.1} suffix="%" onChange={(v: number) => updateData('inflationRate', v)} theme={theme} />
          <ParameterInput label="Income Growth (Pre-Retirement)" help="The annual percentage increase you expect in your income streams." value={data.incomeGrowthRate} min={0} max={15} step={0.1} suffix="%" onChange={(v: number) => updateData('incomeGrowthRate', v)} theme={theme} />
          <ParameterInput label="Portfolio Return (Post-Retirement)" help="Expected annual yield on your combined wealth after you retire." value={data.postRetirementReturn} min={0} max={15} step={0.1} suffix="%" onChange={(v: number) => updateData('postRetirementReturn', v)} theme={theme} />
          <ParameterInput label="Safe Withdrawal Rate (SWR)" help="The annual percentage of your retirement nest egg that you plan to withdraw each year. Default is 4.0%." value={data.safeWithdrawalRate || 4.0} min={1} max={10} step={0.1} suffix="%" onChange={(v: number) => updateData('safeWithdrawalRate', v)} theme={theme} />
        </div>
      </div>
    </div>
  );
}
