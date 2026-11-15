import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  ShieldCheck,
  Layers,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FinancialState,
  TaxConfig,
  TaxBracket,
  TaxDeduction,
  DEFAULT_TAX_CONFIG,
  CURRENCIES,
  formatCurrency,
  safeFloat
} from '../types/finance';
import { calculateAnnualTax, getActiveAnnualGrossIncome } from '../utils/taxCalculator';

interface TaxTabProps {
  data: FinancialState;
  updateData: (key: keyof FinancialState, value: any) => void;
  theme: 'light' | 'dark';
  convertToBase: (amount: number, currency: string) => number;
}

export default function TaxTab({ data, updateData, theme, convertToBase }: TaxTabProps) {
  const isDark = theme === 'dark';
  const taxConfig: TaxConfig = useMemo(
    () => ({ ...DEFAULT_TAX_CONFIG, ...(data.taxConfig || {}) }),
    [data.taxConfig]
  );

  const updateTaxConfig = (patch: Partial<TaxConfig>) => {
    updateData('taxConfig', { ...taxConfig, ...patch });
  };

  // Current annual gross income from Cash Flow
  const currentYear = new Date().getFullYear();
  const cashflowGrossAnnual = useMemo(
    () => getActiveAnnualGrossIncome(data.incomes, convertToBase, currentYear),
    [data.incomes, convertToBase, currentYear]
  );

  // Optional test gross income when user hasn't added any incomes yet
  const [sampleGrossInput, setSampleGrossInput] = useState<string>('100000');
  const [useSampleIncome, setUseSampleIncome] = useState<boolean>(false);

  const previewGrossIncome =
    cashflowGrossAnnual > 0 && !useSampleIncome
      ? cashflowGrossAnnual
      : useSampleIncome
        ? Math.max(0, safeFloat(sampleGrossInput))
        : 0;

  const taxPreview = useMemo(
    () => calculateAnnualTax(previewGrossIncome, taxConfig, convertToBase, 1),
    [previewGrossIncome, taxConfig, convertToBase]
  );

  // Bracket form state
  const sortedBrackets = useMemo(
    () => [...(taxConfig.brackets || [])].sort((a, b) => safeFloat(a.minIncome) - safeFloat(b.minIncome)),
    [taxConfig.brackets]
  );

  const suggestedNextMin = useMemo(() => {
    if (sortedBrackets.length === 0) return '0';
    const last = sortedBrackets[sortedBrackets.length - 1];
    return last.maxIncome && last.maxIncome > 0 ? String(last.maxIncome) : String(last.minIncome);
  }, [sortedBrackets]);

  const [bracketMin, setBracketMin] = useState<string>(suggestedNextMin);
  const [bracketMax, setBracketMax] = useState<string>('');
  const [bracketNoCap, setBracketNoCap] = useState<boolean>(false);
  const [bracketRate, setBracketRate] = useState<string>('');
  const [editingBracketId, setEditingBracketId] = useState<string | null>(null);

  // Deduction / Tax Benefit form state
  const [dedName, setDedName] = useState('');
  const [dedCategory, setDedCategory] = useState<'Deduction' | 'Credit'>('Deduction');
  const [dedAmount, setDedAmount] = useState<string>('');
  const [dedFrequency, setDedFrequency] = useState<'Monthly' | 'Yearly'>('Yearly');
  const [dedCurrency, setDedCurrency] = useState<string>(data.baseCurrency || 'USD');
  const [editingDedId, setEditingDedId] = useState<string | null>(null);

  // Bracket handlers
  const handleSaveBracket = (e: React.FormEvent) => {
    e.preventDefault();
    const minVal = Math.max(0, safeFloat(bracketMin));
    const maxVal = bracketNoCap || !bracketMax.trim() ? null : Math.max(minVal, safeFloat(bracketMax));
    const rateVal = Math.max(0, Math.min(100, safeFloat(bracketRate)));

    if (bracketRate === '' || isNaN(parseFloat(bracketRate))) return;

    if (editingBracketId) {
      const updated = (taxConfig.brackets || []).map((b) =>
        b.id === editingBracketId
          ? { ...b, minIncome: minVal, maxIncome: maxVal, rate: rateVal }
          : b
      );
      updateTaxConfig({ brackets: updated, enabled: true });
      setEditingBracketId(null);
    } else {
      const newBracket: TaxBracket = {
        id: Date.now().toString(),
        minIncome: minVal,
        maxIncome: maxVal,
        rate: rateVal,
      };
      updateTaxConfig({
        brackets: [...(taxConfig.brackets || []), newBracket],
        enabled: true,
      });
    }

    setBracketMin(maxVal ? String(maxVal) : '0');
    setBracketMax('');
    setBracketNoCap(false);
    setBracketRate('');
  };

  const startEditBracket = (b: TaxBracket) => {
    setEditingBracketId(b.id);
    setBracketMin(String(b.minIncome));
    if (b.maxIncome === null || b.maxIncome === undefined || b.maxIncome <= 0) {
      setBracketNoCap(true);
      setBracketMax('');
    } else {
      setBracketNoCap(false);
      setBracketMax(String(b.maxIncome));
    }
    setBracketRate(String(b.rate));
  };

  const cancelEditBracket = () => {
    setEditingBracketId(null);
    setBracketMin(suggestedNextMin);
    setBracketMax('');
    setBracketNoCap(false);
    setBracketRate('');
  };

  const deleteBracket = (id: string) => {
    updateTaxConfig({ brackets: (taxConfig.brackets || []).filter((b) => b.id !== id) });
    if (editingBracketId === id) cancelEditBracket();
  };

  // Deduction / Credit handlers
  const handleSaveDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = safeFloat(dedAmount);
    if (!dedName.trim() || amountNum <= 0) return;

    if (editingDedId) {
      const updated = (taxConfig.deductions || []).map((d) =>
        d.id === editingDedId
          ? {
              ...d,
              name: dedName.trim(),
              category: dedCategory,
              amount: amountNum,
              frequency: dedFrequency,
              currency: dedCurrency,
            }
          : d
      );
      updateTaxConfig({ deductions: updated });
      setEditingDedId(null);
    } else {
      const newItem: TaxDeduction = {
        id: Date.now().toString(),
        name: dedName.trim(),
        category: dedCategory,
        amount: amountNum,
        frequency: dedFrequency,
        currency: dedCurrency,
      };
      updateTaxConfig({ deductions: [...(taxConfig.deductions || []), newItem] });
    }

    setDedName('');
    setDedAmount('');
  };

  const startEditDeduction = (d: TaxDeduction) => {
    setEditingDedId(d.id);
    setDedName(d.name);
    setDedCategory(d.category);
    setDedAmount(String(d.amount));
    setDedFrequency(d.frequency);
    setDedCurrency(d.currency || data.baseCurrency);
  };

  const cancelEditDeduction = () => {
    setEditingDedId(null);
    setDedName('');
    setDedAmount('');
  };

  const deleteDeduction = (id: string) => {
    updateTaxConfig({ deductions: (taxConfig.deductions || []).filter((d) => d.id !== id) });
    if (editingDedId === id) cancelEditDeduction();
  };

  // Presets
  const applyPreset = (preset: 'us' | 'india' | 'uk' | 'flat20' | 'clear') => {
    if (preset === 'us') {
      updateTaxConfig({
        enabled: true,
        mode: 'Progressive Brackets',
        standardDeduction: 15000,
        payrollSocialTaxRate: 7.65,
        payrollCap: 176100,
        surchargeRate: 0,
        brackets: [
          { id: 'us-1', minIncome: 0, maxIncome: 11925, rate: 10 },
          { id: 'us-2', minIncome: 11925, maxIncome: 48475, rate: 12 },
          { id: 'us-3', minIncome: 48475, maxIncome: 103350, rate: 22 },
          { id: 'us-4', minIncome: 103350, maxIncome: 197300, rate: 24 },
          { id: 'us-5', minIncome: 197300, maxIncome: 250525, rate: 32 },
          { id: 'us-6', minIncome: 250525, maxIncome: 626350, rate: 35 },
          { id: 'us-7', minIncome: 626350, maxIncome: null, rate: 37 },
        ],
      });
    } else if (preset === 'india') {
      updateTaxConfig({
        enabled: true,
        mode: 'Progressive Brackets',
        standardDeduction: 75000,
        payrollSocialTaxRate: 0,
        payrollCap: 0,
        surchargeRate: 4,
        brackets: [
          { id: 'in-1', minIncome: 0, maxIncome: 400000, rate: 0 },
          { id: 'in-2', minIncome: 400000, maxIncome: 800000, rate: 5 },
          { id: 'in-3', minIncome: 800000, maxIncome: 1200000, rate: 10 },
          { id: 'in-4', minIncome: 1200000, maxIncome: 1600000, rate: 15 },
          { id: 'in-5', minIncome: 1600000, maxIncome: 2000000, rate: 20 },
          { id: 'in-6', minIncome: 2000000, maxIncome: 2400000, rate: 25 },
          { id: 'in-7', minIncome: 2400000, maxIncome: null, rate: 30 },
        ],
      });
    } else if (preset === 'uk') {
      updateTaxConfig({
        enabled: true,
        mode: 'Progressive Brackets',
        standardDeduction: 12570,
        payrollSocialTaxRate: 8,
        payrollCap: 50270,
        surchargeRate: 0,
        brackets: [
          { id: 'uk-1', minIncome: 0, maxIncome: 37700, rate: 20 },
          { id: 'uk-2', minIncome: 37700, maxIncome: 112570, rate: 40 },
          { id: 'uk-3', minIncome: 112570, maxIncome: null, rate: 45 },
        ],
      });
    } else if (preset === 'flat20') {
      updateTaxConfig({
        enabled: true,
        mode: 'Flat Effective Rate',
        flatTaxRate: 20,
        standardDeduction: 0,
        payrollSocialTaxRate: 0,
        payrollCap: 0,
        surchargeRate: 0,
      });
    } else {
      updateTaxConfig({
        enabled: true,
        mode: 'Progressive Brackets',
        flatTaxRate: 0,
        standardDeduction: 0,
        payrollSocialTaxRate: 0,
        payrollCap: 0,
        surchargeRate: 0,
        brackets: [],
        deductions: [],
      });
    }
  };

  const keepPercentage =
    taxPreview.grossIncome > 0
      ? Math.max(0, Math.min(100, (taxPreview.netIncome / taxPreview.grossIncome) * 100))
      : 100;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header & Live Tax Pulse Card */}
      <div
        className={`p-6 md:p-8 rounded-3xl border transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] font-black uppercase tracking-widest ${
                  isDark ? 'text-indigo-400' : 'text-indigo-600'
                }`}
              >
                Step 4 · Tax &amp; Deductions
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-[11px] text-slate-500">After-Tax Income Engine</span>
            </div>
            <h2
              className={`text-lg md:text-xl font-bold tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              How much of your income do you keep after taxes?
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
              Configure progressive tax brackets or a flat rate, standard and itemized deductions, direct tax benefits/credits, payroll taxes, and surcharges. Every year&apos;s projection uses your <strong>after-tax final income</strong>.
            </p>

            {/* Quick Presets + Master Toggle */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <label
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-colors ${
                  taxConfig.enabled
                    ? isDark
                      ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : isDark
                      ? 'bg-slate-950/50 border-slate-800 text-slate-400'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={taxConfig.enabled}
                  onChange={(e) => updateTaxConfig({ enabled: e.target.checked })}
                  className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Apply Taxation to Final Income</span>
              </label>

              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">
                Starter Templates:
              </span>
              {[
                { id: 'us', label: 'US Federal' },
                { id: 'india', label: 'India New Regime' },
                { id: 'uk', label: 'UK Income Tax' },
                { id: 'flat20', label: 'Flat 20%' },
                { id: 'clear', label: 'Reset 0%' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id as any)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    isDark
                      ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white hover:border-slate-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* After-Tax Income Pulse Card */}
          <div
            className={`w-full lg:w-auto min-w-[300px] p-5 rounded-2xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Final Net Income (Annual)
              </span>
              <span
                className={`text-[11px] font-bold font-mono tabular-nums px-2 py-0.5 rounded-full ${
                  taxPreview.effectiveRate > 0
                    ? isDark
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                    : isDark
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {taxPreview.effectiveRate.toFixed(1)}% Eff. Tax
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2 mb-3">
              <span className="text-lg md:text-xl font-black font-mono tabular-nums tracking-tight text-emerald-500">
                {formatCurrency(taxPreview.netIncome, data.baseCurrency)}
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {formatCurrency(taxPreview.netIncome / 12, data.baseCurrency)}/mo
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Take-Home Share</span>
                <span className="font-mono font-bold text-indigo-500">
                  {keepPercentage.toFixed(1)}%
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <div
                  className="h-full transition-all duration-500 rounded-full bg-indigo-500"
                  style={{ width: `${keepPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 pt-1 font-mono tabular-nums gap-2">
                <span>Gross: {formatCurrency(taxPreview.grossIncome, data.baseCurrency)}</span>
                <span>Tax: -{formatCurrency(taxPreview.totalTax, data.baseCurrency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Tax Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* ================= LEFT COLUMN: REGIME, STATUTORY INPUTS & BRACKETS ================= */}
        <div
          className={`p-6 md:p-8 rounded-3xl border flex flex-col transition-colors ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-xl ${
                  isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                <Layers size={18} />
              </div>
              <h3
                className={`text-sm md:text-base font-bold tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Tax Rates, Statutory Inputs &amp; Brackets
              </h3>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
              Choose progressive marginal brackets or a flat effective tax rate, and configure standard allowances, payroll/social taxes, and surcharges.
            </p>
          </div>

          {/* Calculation Mode Selector */}
          <div className="mb-6">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
              Tax Calculation Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Progressive Brackets', 'Flat Effective Rate'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateTaxConfig({ mode })}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    taxConfig.mode === mode
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : isDark
                        ? 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Statutory / Other Tax Inputs */}
          <div
            className={`p-5 rounded-2xl border mb-6 space-y-4 ${
              isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span
              className={`block text-[11px] font-black uppercase tracking-wider ${
                isDark ? 'text-indigo-400' : 'text-indigo-600'
              }`}
            >
              Core Tax Parameters ({data.baseCurrency})
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Standard Deduction / Free Allowance
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={taxConfig.standardDeduction || ''}
                  onChange={(e) =>
                    updateTaxConfig({ standardDeduction: Math.max(0, safeFloat(e.target.value)) })
                  }
                  placeholder="0"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none transition-all ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'
                  }`}
                />
              </div>

              {taxConfig.mode === 'Flat Effective Rate' ? (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    Flat Income Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxConfig.flatTaxRate || ''}
                    onChange={(e) =>
                      updateTaxConfig({
                        flatTaxRate: Math.max(0, Math.min(100, safeFloat(e.target.value))),
                      })
                    }
                    placeholder="20"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none transition-all ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'
                    }`}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    Surtax / Surcharge / Cess (% of Tax)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxConfig.surchargeRate || ''}
                    onChange={(e) =>
                      updateTaxConfig({
                        surchargeRate: Math.max(0, Math.min(100, safeFloat(e.target.value))),
                      })
                    }
                    placeholder="0"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none transition-all ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'
                    }`}
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Payroll / Social Tax (% of Gross)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.05"
                  value={taxConfig.payrollSocialTaxRate || ''}
                  onChange={(e) =>
                    updateTaxConfig({
                      payrollSocialTaxRate: Math.max(0, Math.min(100, safeFloat(e.target.value))),
                    })
                  }
                  placeholder="0"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none transition-all ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Payroll Tax Wage Cap (0 = No Cap)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={taxConfig.payrollCap || ''}
                  onChange={(e) =>
                    updateTaxConfig({ payrollCap: Math.max(0, safeFloat(e.target.value)) })
                  }
                  placeholder="0 (Uncapped)"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none transition-all ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'
                  }`}
                />
              </div>

              {taxConfig.mode === 'Flat Effective Rate' && (
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    Surtax / Surcharge / Cess (% of Tax)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxConfig.surchargeRate || ''}
                    onChange={(e) =>
                      updateTaxConfig({
                        surchargeRate: Math.max(0, Math.min(100, safeFloat(e.target.value))),
                      })
                    }
                    placeholder="0"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none transition-all ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'
                    }`}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/10 dark:border-slate-800/50">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                <input
                  type="checkbox"
                  checked={taxConfig.indexBracketsToInflation}
                  onChange={(e) =>
                    updateTaxConfig({ indexBracketsToInflation: e.target.checked })
                  }
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                  Index tax brackets &amp; deductions to annual inflation ({data.inflationRate || 2.5}%/yr)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                <input
                  type="checkbox"
                  checked={taxConfig.taxRetirementIncome}
                  onChange={(e) => updateTaxConfig({ taxRetirementIncome: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                  Also apply tax rules to post-retirement income streams
                </span>
              </label>
            </div>
          </div>

          {/* Progressive Tax Brackets Editor */}
          {taxConfig.mode === 'Progressive Brackets' && (
            <>
              <form
                onSubmit={handleSaveBracket}
                className={`p-5 rounded-2xl border mb-6 ${
                  isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider ${
                      isDark ? 'text-indigo-400' : 'text-indigo-600'
                    }`}
                  >
                    {editingBracketId ? 'Edit Tax Bracket' : 'Add Tax Bracket Slab'}
                  </span>
                  {editingBracketId && (
                    <button
                      type="button"
                      onClick={cancelEditBracket}
                      className="text-[10px] text-slate-500 hover:text-rose-400 uppercase font-bold flex items-center gap-1"
                    >
                      <X size={12} /> Cancel
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      From Income
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={bracketMin}
                      onChange={(e) => setBracketMin(e.target.value)}
                      placeholder="0"
                      className={`w-full px-3 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none transition-all ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                          : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      To Income
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      disabled={bracketNoCap}
                      value={bracketNoCap ? '' : bracketMax}
                      onChange={(e) => setBracketMax(e.target.value)}
                      placeholder={bracketNoCap ? 'No Limit (+)' : 'e.g. 50000'}
                      className={`w-full px-3 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none transition-all disabled:opacity-50 ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                          : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={bracketRate}
                      onChange={(e) => setBracketRate(e.target.value)}
                      placeholder="22"
                      className={`w-full px-3 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none transition-all ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                          : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'
                      }`}
                      required
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none text-xs mt-3">
                  <input
                    type="checkbox"
                    checked={bracketNoCap}
                    onChange={(e) => setBracketNoCap(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                    Open-ended top bracket (&quot;and above&quot;)
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={bracketRate === ''}
                  className={`w-full mt-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-indigo-600 hover:bg-indigo-500'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20'
                  }`}
                >
                  {editingBracketId ? <Check size={14} /> : <Plus size={14} />}
                  <span>{editingBracketId ? 'Save Bracket Changes' : 'Add Tax Bracket'}</span>
                </button>
              </form>

              {/* Brackets List */}
              <div className="space-y-3 flex-1">
                <div className="flex justify-between items-center text-xs text-slate-500 pb-1">
                  <span className="font-bold uppercase tracking-wider text-[10px]">
                    Configured Brackets ({sortedBrackets.length})
                  </span>
                  <span className="font-mono tabular-nums">
                    Marginal: {taxPreview.marginalRate.toFixed(1)}%
                  </span>
                </div>

                <AnimatePresence>
                  {sortedBrackets.map((b) => {
                    const slice = taxPreview.bracketBreakdown.find((s) => s.id === b.id);
                    return (
                      <motion.div
                        key={b.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                          editingBracketId === b.id
                            ? isDark
                              ? 'border-indigo-500/50 bg-indigo-950/20'
                              : 'border-indigo-500/50 bg-indigo-50/50'
                            : isDark
                              ? 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`font-mono font-bold tabular-nums text-[13px] ${
                                isDark ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {formatCurrency(b.minIncome, data.baseCurrency)} –{' '}
                              {b.maxIncome && b.maxIncome > 0
                                ? formatCurrency(b.maxIncome, data.baseCurrency)
                                : 'Above'}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {b.rate}%
                            </span>
                          </div>
                          {slice && slice.taxedAmount > 0 ? (
                            <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                              {formatCurrency(slice.taxedAmount, data.baseCurrency)} taxed →{' '}
                              <span className="text-amber-500 font-semibold">
                                {formatCurrency(slice.taxAmount, data.baseCurrency)} tax
                              </span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400">
                              Applies on taxable income above{' '}
                              {formatCurrency(b.minIncome, data.baseCurrency)}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditBracket(b)}
                            className={`p-2 rounded-xl transition-colors ${
                              isDark
                                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                            }`}
                            title="Edit bracket"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBracket(b.id)}
                            className={`p-2 rounded-xl transition-colors ${
                              isDark
                                ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/30'
                                : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title="Delete bracket"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {sortedBrackets.length === 0 && (
                  <div
                    className={`p-8 rounded-2xl border border-dashed text-center text-xs ${
                      isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
                    }`}
                  >
                    No tax brackets added yet. Add custom marginal slabs above or choose a Starter Template.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ================= RIGHT COLUMN: DEDUCTIONS, TAX BENEFITS & LIVE BREAKDOWN ================= */}
        <div className="space-y-8">
          {/* Card 1: Deductions & Tax Benefits */}
          <div
            className={`p-6 md:p-8 rounded-3xl border flex flex-col transition-colors ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-xl ${
                    isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <ShieldCheck size={18} />
                </div>
                <h3
                  className={`text-sm md:text-base font-bold tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Tax Deductions &amp; Tax Benefits
                </h3>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                Add <strong>Pre-Tax Deductions</strong> (401k, HSA, 80C/80D, mortgage interest) to reduce taxable income, and <strong>Tax Benefits / Credits</strong> (child credit, rebates, EV/solar credits) to lower final tax directly.
              </p>
            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Quick suggestions:
              </span>
              {[
                { name: '401(k) / Retirement Deduction', cat: 'Deduction' as const },
                { name: 'Health Insurance / HSA', cat: 'Deduction' as const },
                { name: 'Mortgage Interest', cat: 'Deduction' as const },
                { name: 'Child / Dependent Tax Credit', cat: 'Credit' as const },
                { name: 'Tax Rebate / Section 87A', cat: 'Credit' as const },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setDedName(preset.name);
                    setDedCategory(preset.cat);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                    isDark
                      ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white hover:border-slate-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  + {preset.name}
                </button>
              ))}
            </div>

            {/* Deduction / Credit Form */}
            <form
              onSubmit={handleSaveDeduction}
              className={`p-5 rounded-2xl border mb-6 ${
                isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`text-[11px] font-black uppercase tracking-wider ${
                    isDark ? 'text-emerald-400' : 'text-emerald-600'
                  }`}
                >
                  {editingDedId ? 'Edit Deduction / Benefit' : 'Add Deduction or Tax Benefit'}
                </span>
                {editingDedId && (
                  <button
                    type="button"
                    onClick={cancelEditDeduction}
                    className="text-[10px] text-slate-500 hover:text-rose-400 uppercase font-bold flex items-center gap-1"
                  >
                    <X size={12} /> Cancel
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    Benefit / Deduction Name
                  </label>
                  <input
                    type="text"
                    value={dedName}
                    onChange={(e) => setDedName(e.target.value)}
                    placeholder="e.g., Traditional 401(k) Contribution"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none transition-all ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500 shadow-sm'
                    }`}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    How It Applies
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDedCategory('Deduction')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        dedCategory === 'Deduction'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : isDark
                            ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Pre-Tax Deduction
                    </button>
                    <button
                      type="button"
                      onClick={() => setDedCategory('Credit')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        dedCategory === 'Credit'
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : isDark
                            ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Direct Tax Credit / Benefit
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={dedAmount}
                    onChange={(e) => setDedAmount(e.target.value)}
                    placeholder="5000"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none transition-all ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500 shadow-sm'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    Currency
                  </label>
                  <select
                    value={dedCurrency}
                    onChange={(e) => setDedCurrency(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none transition-all ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    Frequency
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Yearly', 'Monthly'] as const).map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setDedFrequency(freq)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          dedFrequency === freq
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : isDark
                              ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!dedName.trim() || !dedAmount}
                className={`w-full mt-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20'
                }`}
              >
                {editingDedId ? <Check size={14} /> : <Plus size={14} />}
                <span>{editingDedId ? 'Save Changes' : 'Add Deduction / Benefit'}</span>
              </button>
            </form>

            {/* List of Deductions & Benefits */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-500 pb-1">
                <span className="font-bold uppercase tracking-wider text-[10px]">
                  Active Reliefs ({(taxConfig.deductions || []).length})
                </span>
                <span className="font-mono tabular-nums">
                  Deductions: {formatCurrency(taxPreview.itemizedDeductions, data.baseCurrency)} · Credits:{' '}
                  {formatCurrency(taxPreview.totalCreditsAvailable, data.baseCurrency)}
                </span>
              </div>

              <AnimatePresence>
                {(taxConfig.deductions || []).map((d) => {
                  const annualInBase = convertToBase(
                    d.amount * (d.frequency === 'Monthly' ? 12 : 1),
                    d.currency
                  );
                  return (
                    <motion.div
                      key={d.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                        editingDedId === d.id
                          ? isDark
                            ? 'border-emerald-500/50 bg-emerald-950/20'
                            : 'border-emerald-500/50 bg-emerald-50/50'
                          : isDark
                            ? 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-bold text-[13px] truncate ${
                              isDark ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {d.name}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              d.category === 'Credit'
                                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            }`}
                          >
                            {d.category === 'Credit' ? 'Tax Benefit / Credit' : 'Pre-Tax Deduction'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                          <span className="font-mono font-bold tabular-nums text-emerald-500">
                            {formatCurrency(d.amount, d.currency)} / {d.frequency === 'Monthly' ? 'mo' : 'yr'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-[11px]">
                            ~{formatCurrency(annualInBase, data.baseCurrency)} / yr
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditDeduction(d)}
                          className={`p-2 rounded-xl transition-colors ${
                            isDark
                              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                          }`}
                          title="Edit entry"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteDeduction(d.id)}
                          className={`p-2 rounded-xl transition-colors ${
                            isDark
                              ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/30'
                              : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title="Delete entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {(!taxConfig.deductions || taxConfig.deductions.length === 0) && (
                <div
                  className={`p-6 rounded-2xl border border-dashed text-center text-xs ${
                    isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
                  }`}
                >
                  No extra deductions or tax credits added yet.
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Live Tax Calculation & Final Income Breakdown */}
          <div
            className={`p-6 md:p-8 rounded-3xl border transition-colors ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-xl ${
                    isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  <Calculator size={18} />
                </div>
                <h3
                  className={`text-sm md:text-base font-bold tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Final Income Tax Breakdown
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setUseSampleIncome((v) => !v)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  useSampleIncome
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : isDark
                      ? 'border-slate-700 text-slate-400 hover:text-white'
                      : 'border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                {useSampleIncome ? 'Using Test Income' : 'Test Custom Gross'}
              </button>
            </div>

            {(useSampleIncome || cashflowGrossAnnual === 0) && (
              <div
                className={`p-4 rounded-2xl border mb-5 ${
                  isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    {cashflowGrossAnnual === 0 && !useSampleIncome
                      ? 'No active income in Step 2 (Cash Flow) yet. Toggle "Test Custom Gross" to preview brackets.'
                      : `Simulated Annual Gross (${data.baseCurrency}):`}
                  </span>
                  {useSampleIncome && (
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={sampleGrossInput}
                      onChange={(e) => setSampleGrossInput(e.target.value)}
                      className={`w-36 px-3 py-1.5 rounded-xl text-xs font-mono tabular-nums text-right border outline-none ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                          : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500'
                      }`}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1.5">
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                  Annual Gross Income
                </span>
                <span className={`font-mono font-bold tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(taxPreview.grossIncome, data.baseCurrency)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 text-slate-500">
                <span>Less: Standard Deduction</span>
                <span className="font-mono tabular-nums text-emerald-500">
                  -{formatCurrency(taxPreview.standardDeduction, data.baseCurrency)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 text-slate-500">
                <span>Less: Pre-Tax Deductions</span>
                <span className="font-mono tabular-nums text-emerald-500">
                  -{formatCurrency(taxPreview.itemizedDeductions, data.baseCurrency)}
                </span>
              </div>

              <div
                className={`flex justify-between items-center py-2.5 border-t border-b font-semibold ${
                  isDark ? 'border-slate-800 text-slate-200' : 'border-slate-200 text-slate-800'
                }`}
              >
                <span>Taxable Income</span>
                <span className="font-mono font-bold tabular-nums">
                  {formatCurrency(taxPreview.taxableIncome, data.baseCurrency)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 text-slate-500">
                <span>Base Income Tax ({taxConfig.mode})</span>
                <span className="font-mono tabular-nums text-amber-500">
                  {formatCurrency(taxPreview.baseIncomeTax, data.baseCurrency)}
                </span>
              </div>

              {taxPreview.taxCreditsApplied > 0 && (
                <div className="flex justify-between items-center py-1 text-slate-500">
                  <span>Less: Tax Benefits &amp; Credits</span>
                  <span className="font-mono tabular-nums text-emerald-500">
                    -{formatCurrency(taxPreview.taxCreditsApplied, data.baseCurrency)}
                  </span>
                </div>
              )}

              {taxPreview.surchargeAmount > 0 && (
                <div className="flex justify-between items-center py-1 text-slate-500">
                  <span>Plus: Surcharge / Cess ({taxConfig.surchargeRate}%)</span>
                  <span className="font-mono tabular-nums text-amber-500">
                    +{formatCurrency(taxPreview.surchargeAmount, data.baseCurrency)}
                  </span>
                </div>
              )}

              {taxPreview.payrollTax > 0 && (
                <div className="flex justify-between items-center py-1 text-slate-500">
                  <span>Plus: Payroll / Social Tax ({taxConfig.payrollSocialTaxRate}%)</span>
                  <span className="font-mono tabular-nums text-amber-500">
                    +{formatCurrency(taxPreview.payrollTax, data.baseCurrency)}
                  </span>
                </div>
              )}

              <div
                className={`flex justify-between items-center py-2.5 border-t ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}
              >
                <span className="font-bold text-rose-500">
                  Total Annual Tax ({taxPreview.effectiveRate.toFixed(1)}%)
                </span>
                <span className="font-mono font-bold tabular-nums text-rose-500">
                  -{formatCurrency(taxPreview.totalTax, data.baseCurrency)}
                </span>
              </div>

              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark
                    ? 'bg-emerald-950/20 border-emerald-500/20'
                    : 'bg-emerald-50/70 border-emerald-200'
                }`}
              >
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block">
                    Final After-Tax Income
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                    {formatCurrency(taxPreview.netIncome / 12, data.baseCurrency)} / month
                  </span>
                </div>
                <span className="text-lg md:text-xl font-black font-mono tabular-nums text-emerald-500">
                  {formatCurrency(taxPreview.netIncome, data.baseCurrency)} / yr
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
