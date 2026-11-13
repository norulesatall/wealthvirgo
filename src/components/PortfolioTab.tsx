import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  TrendingUp, 
  Building2, 
  Coins, 
  Plus, 
  Trash2, 
  Pencil, 
  X, 
  Check, 
  HelpCircle,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FinancialState, 
  Asset, 
  Investment, 
  CURRENCIES, 
  ASSET_TYPES, 
  MONTHS, 
  formatCurrency, 
  safeFloat 
} from '../types/finance';

interface PortfolioTabProps {
  data: FinancialState;
  updateData: (key: keyof FinancialState, value: any) => void;
  theme: 'light' | 'dark';
  convertToBase: (amount: number, currency: string) => number;
}

export default function PortfolioTab({ data, updateData, theme, convertToBase }: PortfolioTabProps) {
  const currentYear = new Date().getFullYear();
  const isDark = theme === 'dark';

  // Scenario active filter: 'all' | '1' | '2' | '3'
  const [activeScenarioFilter, setActiveScenarioFilter] = useState<'all' | '1' | '2' | '3'>('all');

  // Year options for maturity & contributions
  const yearOptions = useMemo(() => {
    const opts = [{ label: 'Liquid / Current Year', value: currentYear }];
    const maxYear = currentYear + Math.max(10, (data.lifeExpectancy || 90) - (data.currentAge || 30));
    for (let y = currentYear + 1; y <= maxYear; y++) {
      opts.push({ label: y.toString(), value: y });
    }
    return opts;
  }, [currentYear, data.lifeExpectancy, data.currentAge]);

  const yearOptionsOnly = useMemo(() => {
    const opts = [];
    const maxYear = currentYear + Math.max(10, (data.lifeExpectancy || 90) - (data.currentAge || 30));
    for (let y = currentYear; y <= maxYear; y++) {
      opts.push(y);
    }
    return opts;
  }, [currentYear, data.lifeExpectancy, data.currentAge]);

  // ================= SCENARIO 1 FORM STATE =================
  const [s1Name, setS1Name] = useState('');
  const [s1Type, setS1Type] = useState('Real Estate');
  const [s1Amount, setS1Amount] = useState<string>('');
  const [s1Yield, setS1Yield] = useState<string>('2.5');
  const [s1Currency, setS1Currency] = useState(data.baseCurrency || 'USD');
  const [editingS1Id, setEditingS1Id] = useState<string | null>(null);

  // ================= SCENARIO 2 FORM STATE =================
  const [s2Name, setS2Name] = useState('');
  const [s2Type, setS2Type] = useState('Real Estate');
  const [s2CurrentInvestment, setS2CurrentInvestment] = useState<string>('');
  const [s2Amount, setS2Amount] = useState<string>('');
  const [s2Contribution, setS2Contribution] = useState<string>('');
  const [s2ContributionFreq, setS2ContributionFreq] = useState<'None' | 'Monthly' | 'Quarterly' | 'Semi-Yearly' | 'Yearly'>('Monthly');
  const [s2LastPaymentMonth, setS2LastPaymentMonth] = useState<number>(12);
  const [s2LastPaymentYear, setS2LastPaymentYear] = useState<number>(currentYear + 5);
  const [s2MaturityMonth, setS2MaturityMonth] = useState<number>(12);
  const [s2MaturityYear, setS2MaturityYear] = useState<number>(currentYear + 10);
  const [s2Currency, setS2Currency] = useState(data.baseCurrency || 'USD');
  const [editingS2Id, setEditingS2Id] = useState<string | null>(null);

  // ================= SCENARIO 3 FORM STATE =================
  const [s3Name, setS3Name] = useState('');
  const [s3CurrentBalance, setS3CurrentBalance] = useState<string>('');
  const [s3Contribution, setS3Contribution] = useState<string>('');
  const [s3ContributionFreq, setS3ContributionFreq] = useState<'None' | 'Monthly' | 'Quarterly' | 'Semi-Yearly' | 'Yearly'>('Monthly');
  const [s3ExpectedReturn, setS3ExpectedReturn] = useState<string>('8.0');
  const [s3LastContribMonth, setS3LastContribMonth] = useState<number>(12);
  const [s3LastContribYear, setS3LastContribYear] = useState<number>(currentYear + Math.max(1, (data.retirementAge || 60) - (data.currentAge || 30)));
  const [s3MaturityYear, setS3MaturityYear] = useState<number>(currentYear);
  const [s3Currency, setS3Currency] = useState(data.baseCurrency || 'USD');
  const [editingS3Id, setEditingS3Id] = useState<string | null>(null);

  // Split assets by scenario
  const scenario1Assets = useMemo(() => {
    return (data.assets || []).filter(a => a.valueMode === 'Asset Inventory' || !a.valueMode);
  }, [data.assets]);

  const scenario2Assets = useMemo(() => {
    return (data.assets || []).filter(a => a.valueMode === 'Real Estate & Insurance');
  }, [data.assets]);

  const scenario3Investments = data.investments || [];

  // Summary figures
  const totalS1Value = useMemo(() => {
    return scenario1Assets.reduce((sum, a) => sum + convertToBase(safeFloat(a.amount), a.currency), 0);
  }, [scenario1Assets, convertToBase]);

  const totalS2Invested = useMemo(() => {
    return scenario2Assets.reduce((sum, a) => sum + convertToBase(safeFloat(a.currentInvestment || 0), a.currency), 0);
  }, [scenario2Assets, convertToBase]);

  const totalS2MaturityValue = useMemo(() => {
    return scenario2Assets.reduce((sum, a) => sum + convertToBase(safeFloat(a.amount), a.currency), 0);
  }, [scenario2Assets, convertToBase]);

  const totalS3Balance = useMemo(() => {
    return scenario3Investments.reduce((sum, i) => sum + convertToBase(safeFloat(i.currentBalance), i.currency), 0);
  }, [scenario3Investments, convertToBase]);

  const startingNetWorth = totalS1Value + totalS2Invested + totalS3Balance;

  // Handlers for Scenario 1
  const handleSaveS1 = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = safeFloat(s1Amount);
    if (!s1Name.trim() || amountVal <= 0) return;

    if (editingS1Id) {
      const updated = (data.assets || []).map(a => 
        a.id === editingS1Id 
          ? { 
              ...a, 
              name: s1Name.trim(), 
              type: s1Type, 
              amount: amountVal, 
              yield: safeFloat(s1Yield), 
              currency: s1Currency,
              valueMode: 'Asset Inventory' as const
            }
          : a
      );
      updateData('assets', updated);
      setEditingS1Id(null);
    } else {
      const newAsset: Asset = {
        id: Date.now().toString(),
        name: s1Name.trim(),
        valueMode: 'Asset Inventory',
        type: s1Type,
        amount: amountVal,
        yield: safeFloat(s1Yield),
        currency: s1Currency
      };
      updateData('assets', [...(data.assets || []), newAsset]);
    }
    setS1Name('');
    setS1Amount('');
    setS1Yield('2.5');
  };

  const startEditS1 = (a: Asset) => {
    setEditingS1Id(a.id);
    setS1Name(a.name);
    setS1Type(a.type || 'Real Estate');
    setS1Amount(a.amount.toString());
    setS1Yield((a.yield ?? 2.5).toString());
    setS1Currency(a.currency || data.baseCurrency);
  };

  const cancelEditS1 = () => {
    setEditingS1Id(null);
    setS1Name('');
    setS1Amount('');
  };

  // Handlers for Scenario 2
  const handleSaveS2 = (e: React.FormEvent) => {
    e.preventDefault();
    const payout = safeFloat(s2Amount);
    if (!s2Name.trim() || payout <= 0) return;

    const currentInv = safeFloat(s2CurrentInvestment);
    const contrib = safeFloat(s2Contribution);

    if (editingS2Id) {
      const updated = (data.assets || []).map(a => 
        a.id === editingS2Id 
          ? { 
              ...a, 
              name: s2Name.trim(), 
              valueMode: 'Real Estate & Insurance' as const,
              type: s2Type, 
              currentInvestment: currentInv,
              amount: payout, 
              contribution: contrib,
              contributionFrequency: s2ContributionFreq,
              lastPaymentMonth: s2LastPaymentMonth,
              lastPaymentYear: s2LastPaymentYear,
              maturityMonth: s2MaturityMonth,
              maturityYear: s2MaturityYear,
              currency: s2Currency
            }
          : a
      );
      updateData('assets', updated);
      setEditingS2Id(null);
    } else {
      const newAsset: Asset = {
        id: Date.now().toString(),
        name: s2Name.trim(),
        valueMode: 'Real Estate & Insurance',
        type: s2Type,
        currentInvestment: currentInv,
        amount: payout,
        contribution: contrib,
        contributionFrequency: s2ContributionFreq,
        lastPaymentMonth: s2LastPaymentMonth,
        lastPaymentYear: s2LastPaymentYear,
        maturityMonth: s2MaturityMonth,
        maturityYear: s2MaturityYear,
        currency: s2Currency
      };
      updateData('assets', [...(data.assets || []), newAsset]);
    }
    setS2Name('');
    setS2CurrentInvestment('');
    setS2Amount('');
    setS2Contribution('');
  };

  const startEditS2 = (a: Asset) => {
    setEditingS2Id(a.id);
    setS2Name(a.name);
    setS2Type(a.type || 'Real Estate');
    setS2CurrentInvestment((a.currentInvestment || 0).toString());
    setS2Amount(a.amount.toString());
    setS2Contribution((a.contribution || 0).toString());
    setS2ContributionFreq(a.contributionFrequency || 'Monthly');
    setS2LastPaymentMonth(a.lastPaymentMonth || 12);
    setS2LastPaymentYear(a.lastPaymentYear || currentYear + 5);
    setS2MaturityMonth(a.maturityMonth || 12);
    setS2MaturityYear(a.maturityYear || currentYear + 10);
    setS2Currency(a.currency || data.baseCurrency);
  };

  const cancelEditS2 = () => {
    setEditingS2Id(null);
    setS2Name('');
    setS2CurrentInvestment('');
    setS2Amount('');
    setS2Contribution('');
  };

  // Handlers for Scenario 3
  const handleSaveS3 = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = safeFloat(s3CurrentBalance);
    if (!s3Name.trim() || balance < 0) return;

    const contrib = safeFloat(s3Contribution);
    const cagr = safeFloat(s3ExpectedReturn);

    if (editingS3Id) {
      const updated = (data.investments || []).map(inv => 
        inv.id === editingS3Id 
          ? { 
              ...inv, 
              name: s3Name.trim(), 
              currentBalance: balance, 
              contribution: contrib, 
              contributionFrequency: s3ContributionFreq, 
              expectedReturn: cagr, 
              lastContributionMonth: s3LastContribMonth, 
              lastContributionYear: s3LastContribYear, 
              maturityYear: s3MaturityYear, 
              currency: s3Currency 
            }
          : inv
      );
      updateData('investments', updated);
      setEditingS3Id(null);
    } else {
      const newInv: Investment = {
        id: Date.now().toString(),
        name: s3Name.trim(),
        currentBalance: balance,
        contribution: contrib,
        contributionFrequency: s3ContributionFreq,
        expectedReturn: cagr,
        lastContributionMonth: s3LastContribMonth,
        lastContributionYear: s3LastContribYear,
        maturityYear: s3MaturityYear,
        currency: s3Currency
      };
      updateData('investments', [...(data.investments || []), newInv]);
    }
    setS3Name('');
    setS3CurrentBalance('');
    setS3Contribution('');
    setS3ExpectedReturn('8.0');
  };

  const startEditS3 = (inv: Investment) => {
    setEditingS3Id(inv.id);
    setS3Name(inv.name);
    setS3CurrentBalance(inv.currentBalance.toString());
    setS3Contribution((inv.contribution || 0).toString());
    setS3ContributionFreq(inv.contributionFrequency || 'Monthly');
    setS3ExpectedReturn((inv.expectedReturn || 8.0).toString());
    setS3LastContribMonth(inv.lastContributionMonth || 12);
    setS3LastContribYear(inv.lastContributionYear || currentYear + 15);
    setS3MaturityYear(inv.maturityYear || currentYear);
    setS3Currency(inv.currency || data.baseCurrency);
  };

  const cancelEditS3 = () => {
    setEditingS3Id(null);
    setS3Name('');
    setS3CurrentBalance('');
    setS3Contribution('');
  };

  const deleteAsset = (id: string) => {
    updateData('assets', (data.assets || []).filter(a => a.id !== id));
    if (editingS1Id === id) cancelEditS1();
    if (editingS2Id === id) cancelEditS2();
  };

  const deleteInvestment = (id: string) => {
    updateData('investments', (data.investments || []).filter(i => i.id !== id));
    if (editingS3Id === id) cancelEditS3();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Tab Header & Conversational Premise */}
      <div className={`p-6 md:p-8 rounded-3xl border transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-black uppercase tracking-widest ${
                isDark ? 'text-indigo-400' : 'text-indigo-600'
              }`}>
                Step 3 · Wealth Architecture
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs text-slate-500">3 Comprehensive Scenarios</span>
            </div>
            <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Where is your wealth stored and compounding?
            </h2>
            <p className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
              We divide your assets into 3 distinct, intuitive scenarios: <strong>Assets you own outright today</strong>, <strong>Policies or properties that mature with a lump sum payout</strong>, and <strong>Active compounding growth portfolios</strong>.
            </p>
          </div>

          {/* Portfolio Net Worth Snapshot */}
          <div className={`w-full lg:w-auto min-w-[280px] p-5 rounded-2xl border ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
              Current Starting Net Worth
            </span>
            <div className="text-2xl font-black font-mono tabular-nums tracking-tight text-indigo-500">
              {formatCurrency(startingNetWorth, data.baseCurrency)}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/10 dark:border-slate-800/50 text-[10px]">
              <div>
                <span className="text-slate-500 block">Outright:</span>
                <span className="font-bold font-mono tabular-nums">{formatCurrency(totalS1Value, data.baseCurrency)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Invested:</span>
                <span className="font-bold font-mono tabular-nums">{formatCurrency(totalS2Invested, data.baseCurrency)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Growth:</span>
                <span className="font-bold font-mono tabular-nums">{formatCurrency(totalS3Balance, data.baseCurrency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Navigation for the 3 Scenarios */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-800/10 dark:border-slate-800/50 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-2">Filter view:</span>
          {[
            { id: 'all', label: 'All 3 Scenarios' },
            { id: '1', label: 'Scenario 1: Outright Assets' },
            { id: '2', label: 'Scenario 2: Maturity Policies' },
            { id: '3', label: 'Scenario 3: Growth Portfolios' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setActiveScenarioFilter(btn.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                activeScenarioFilter === btn.id
                  ? isDark
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= SCENARIO 1: OUTRIGHT ASSETS ================= */}
      {(activeScenarioFilter === 'all' || activeScenarioFilter === '1') && (
        <section className={`p-6 md:p-8 rounded-3xl border transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-sky-500/10 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
                  <Building2 size={18} />
                </div>
                <h3 className={`text-lg md:text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Scenario 1: What valuable assets do you own outright today?
                </h3>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                <strong>Static Wealth Inventory:</strong> Properties you own with no mortgage, gold coins/bars, emergency cash reserves, or collectibles. They immediately count into your starting net worth and appreciate year-over-year.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Outright Valuation</span>
              <span className="text-base font-bold font-mono tabular-nums text-sky-500">
                {formatCurrency(totalS1Value, data.baseCurrency)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Input Form */}
            <form onSubmit={handleSaveS1} className={`lg:col-span-5 p-5 rounded-2xl border ${
              isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[11px] font-black uppercase tracking-wider ${
                  isDark ? 'text-sky-400' : 'text-sky-600'
                }`}>
                  {editingS1Id ? 'Edit Outright Asset' : 'Add Outright Asset'}
                </span>
                {editingS1Id && (
                  <button type="button" onClick={cancelEditS1} className="text-[10px] text-slate-500 hover:text-rose-400 uppercase font-bold flex items-center gap-1">
                    <X size={12} /> Cancel
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    Asset Identifier / Name
                  </label>
                  <input
                    type="text"
                    value={s1Name}
                    onChange={(e) => setS1Name(e.target.value)}
                    placeholder="e.g., Primary Residence, Physical Gold Vault"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-sky-500' : 'bg-white border-slate-200 text-slate-900 focus:border-sky-500 shadow-sm'
                    }`}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      Current Market Value
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={s1Amount}
                      onChange={(e) => setS1Amount(e.target.value)}
                      placeholder="450000"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-sky-500' : 'bg-white border-slate-200 text-slate-900 focus:border-sky-500 shadow-sm'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      Currency
                    </label>
                    <select
                      value={s1Currency}
                      onChange={(e) => setS1Currency(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                      }`}
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      Asset Category
                    </label>
                    <select
                      value={s1Type}
                      onChange={(e) => setS1Type(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                      }`}
                    >
                      {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      Ann. Appreciation %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={s1Yield}
                      onChange={(e) => setS1Yield(e.target.value)}
                      placeholder="2.5"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-sky-500' : 'bg-white border-slate-200 text-slate-900 focus:border-sky-500 shadow-sm'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!s1Name.trim() || !s1Amount}
                  className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                    isDark ? 'bg-sky-600 hover:bg-sky-500' : 'bg-sky-600 hover:bg-sky-700 shadow-md shadow-sky-600/20'
                  }`}
                >
                  {editingS1Id ? <Check size={14} /> : <Plus size={14} />}
                  <span>{editingS1Id ? 'Save Asset' : 'Add Outright Asset'}</span>
                </button>
              </div>
            </form>

            {/* List */}
            <div className="lg:col-span-7 space-y-3">
              <AnimatePresence>
                {scenario1Assets.map(a => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                      editingS1Id === a.id
                        ? isDark ? 'border-sky-500/50 bg-sky-950/20' : 'border-sky-500/50 bg-sky-50/50'
                        : isDark ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{a.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium">({a.type || 'Asset'})</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        <span className="font-mono font-bold tabular-nums text-sky-500">
                          {formatCurrency(a.amount, a.currency)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[11px]">Appreciates: {a.yield ?? 2.5}% / yr</span>
                        {a.currency !== data.baseCurrency && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-[11px]">~{formatCurrency(convertToBase(a.amount, a.currency), data.baseCurrency)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEditS1(a)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteAsset(a.id)} className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {scenario1Assets.length === 0 && (
                <div className={`p-8 rounded-2xl border border-dashed text-center text-xs ${
                  isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
                }`}>
                  No outright assets entered yet. Add primary homes, cash reserves, or gold above!
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================= SCENARIO 2: MATURITY POLICIES ================= */}
      {(activeScenarioFilter === 'all' || activeScenarioFilter === '2') && (
        <section className={`p-6 md:p-8 rounded-3xl border transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                  <Briefcase size={18} />
                </div>
                <h3 className={`text-lg md:text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Scenario 2: Do you have policies or properties with ongoing installments that mature into cash?
                </h3>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                <strong>Real Estate & Insurance Maturity Policies:</strong> Installment schemes (e.g. endowment life plans, pre-construction condos) where you pay regular premiums until an end year, and receive a lump sum payout when it matures.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Expected Future Payouts</span>
              <span className="text-base font-bold font-mono tabular-nums text-amber-500">
                {formatCurrency(totalS2MaturityValue, data.baseCurrency)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Input Form with ALL fields */}
            <form onSubmit={handleSaveS2} className={`lg:col-span-6 p-5 rounded-2xl border ${
              isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[11px] font-black uppercase tracking-wider ${
                  isDark ? 'text-amber-400' : 'text-amber-600'
                }`}>
                  {editingS2Id ? 'Edit Maturity Policy' : 'Add Maturity Policy'}
                </span>
                {editingS2Id && (
                  <button type="button" onClick={cancelEditS2} className="text-[10px] text-slate-500 hover:text-rose-400 uppercase font-bold flex items-center gap-1">
                    <X size={12} /> Cancel
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    Policy / Property Name
                  </label>
                  <input
                    type="text"
                    value={s2Name}
                    onChange={(e) => setS2Name(e.target.value)}
                    placeholder="e.g., 15-Year Endowment Life Plan, City Center Flat"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-500' : 'bg-white border-slate-200 text-slate-900 focus:border-amber-500 shadow-sm'
                    }`}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      Invested Till Date
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={s2CurrentInvestment}
                      onChange={(e) => setS2CurrentInvestment(e.target.value)}
                      placeholder="25000 (adds to Net Worth)"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-500' : 'bg-white border-slate-200 text-slate-900 focus:border-amber-500 shadow-sm'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      Maturity Payout Value
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={s2Amount}
                      onChange={(e) => setS2Amount(e.target.value)}
                      placeholder="120000 (final payout)"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-500' : 'bg-white border-slate-200 text-slate-900 focus:border-amber-500 shadow-sm'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      Installment
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={s2Contribution}
                      onChange={(e) => setS2Contribution(e.target.value)}
                      placeholder="500"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-amber-500' : 'bg-white border-slate-200 text-slate-900 focus:border-amber-500 shadow-sm'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      Frequency
                    </label>
                    <select
                      value={s2ContributionFreq}
                      onChange={(e) => setS2ContributionFreq(e.target.value as any)}
                      className={`w-full px-2.5 py-2.5 rounded-xl text-xs border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                      }`}
                    >
                      {['None', 'Monthly', 'Quarterly', 'Semi-Yearly', 'Yearly'].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      Currency
                    </label>
                    <select
                      value={s2Currency}
                      onChange={(e) => setS2Currency(e.target.value)}
                      className={`w-full px-2.5 py-2.5 rounded-xl text-xs border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                      }`}
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/10 dark:border-slate-800/50">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                      Last Payment Month & Year
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={s2LastPaymentMonth}
                        onChange={(e) => setS2LastPaymentMonth(parseInt(e.target.value))}
                        className={`w-full p-2 rounded-xl text-xs border ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                        }`}
                      >
                        {MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m.substring(0, 3)}</option>)}
                      </select>
                      <select
                        value={s2LastPaymentYear}
                        onChange={(e) => setS2LastPaymentYear(parseInt(e.target.value))}
                        className={`w-full p-2 rounded-xl text-xs border ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                        }`}
                      >
                        {yearOptionsOnly.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                      Maturity Month & Year
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={s2MaturityMonth}
                        onChange={(e) => setS2MaturityMonth(parseInt(e.target.value))}
                        className={`w-full p-2 rounded-xl text-xs border ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                        }`}
                      >
                        {MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m.substring(0, 3)}</option>)}
                      </select>
                      <select
                        value={s2MaturityYear}
                        onChange={(e) => setS2MaturityYear(parseInt(e.target.value))}
                        className={`w-full p-2 rounded-xl text-xs border ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                        }`}
                      >
                        {yearOptionsOnly.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!s2Name.trim() || !s2Amount}
                  className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                    isDark ? 'bg-amber-600 hover:bg-amber-500' : 'bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20'
                  }`}
                >
                  {editingS2Id ? <Check size={14} /> : <Plus size={14} />}
                  <span>{editingS2Id ? 'Save Policy Changes' : 'Add Maturity Policy'}</span>
                </button>
              </div>
            </form>

            {/* List */}
            <div className="lg:col-span-6 space-y-3">
              <AnimatePresence>
                {scenario2Assets.map(a => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                      editingS2Id === a.id
                        ? isDark ? 'border-amber-500/50 bg-amber-950/20' : 'border-amber-500/50 bg-amber-50/50'
                        : isDark ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{a.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        <span className="font-mono font-bold tabular-nums text-amber-500">
                          Payout: {formatCurrency(a.amount, a.currency)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-[11px]">Invested: {formatCurrency(a.currentInvestment || 0, a.currency)}</span>
                        {a.contribution && a.contribution > 0 ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[11px]">
                              {formatCurrency(a.contribution, a.currency)} / {a.contributionFrequency?.toLowerCase()}
                            </span>
                          </>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-0.5">
                        <span>Pays until: {MONTHS[(a.lastPaymentMonth || 12) - 1]} {a.lastPaymentYear}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-500 font-medium">Matures: {MONTHS[(a.maturityMonth || 12) - 1]} {a.maturityYear}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEditS2(a)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteAsset(a.id)} className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {scenario2Assets.length === 0 && (
                <div className={`p-8 rounded-2xl border border-dashed text-center text-xs ${
                  isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
                }`}>
                  No maturity policies or installment assets entered yet. Add endowment or installment plans above!
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================= SCENARIO 3: GROWTH PORTFOLIOS ================= */}
      {(activeScenarioFilter === 'all' || activeScenarioFilter === '3') && (
        <section className={`p-6 md:p-8 rounded-3xl border transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                  <TrendingUp size={18} />
                </div>
                <h3 className={`text-lg md:text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Scenario 3: Where are you actively compounding your long-term wealth?
                </h3>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                <strong>Growth Portfolios & Compounding Engines:</strong> S&P 500 index funds, ETF portfolios, 401(k), IRAs, or brokerage accounts where your capital compounds continuously at an expected CAGR with regular savings injections.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Active Growth Balance</span>
              <span className="text-base font-bold font-mono tabular-nums text-indigo-500">
                {formatCurrency(totalS3Balance, data.baseCurrency)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Input Form with ALL fields */}
            <form onSubmit={handleSaveS3} className={`lg:col-span-6 p-5 rounded-2xl border ${
              isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[11px] font-black uppercase tracking-wider ${
                  isDark ? 'text-indigo-400' : 'text-indigo-600'
                }`}>
                  {editingS3Id ? 'Edit Growth Portfolio' : 'Add Growth Portfolio'}
                </span>
                {editingS3Id && (
                  <button type="button" onClick={cancelEditS3} className="text-[10px] text-slate-500 hover:text-rose-400 uppercase font-bold flex items-center gap-1">
                    <X size={12} /> Cancel
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    Fund / Portfolio Name
                  </label>
                  <input
                    type="text"
                    value={s3Name}
                    onChange={(e) => setS3Name(e.target.value)}
                    placeholder="e.g., S&P 500 Index Fund, Vanguard Global All-Cap"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'
                    }`}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      Current Balance Today
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={s3CurrentBalance}
                      onChange={(e) => setS3CurrentBalance(e.target.value)}
                      placeholder="60000 (starting seed)"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      Expected Annual CAGR %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={s3ExpectedReturn}
                      onChange={(e) => setS3ExpectedReturn(e.target.value)}
                      placeholder="8.0"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      Contribution
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={s3Contribution}
                      onChange={(e) => setS3Contribution(e.target.value)}
                      placeholder="1000"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      Frequency
                    </label>
                    <select
                      value={s3ContributionFreq}
                      onChange={(e) => setS3ContributionFreq(e.target.value as any)}
                      className={`w-full px-2.5 py-2.5 rounded-xl text-xs border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                      }`}
                    >
                      {['None', 'Monthly', 'Quarterly', 'Semi-Yearly', 'Yearly'].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      Currency
                    </label>
                    <select
                      value={s3Currency}
                      onChange={(e) => setS3Currency(e.target.value)}
                      className={`w-full px-2.5 py-2.5 rounded-xl text-xs border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                      }`}
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/10 dark:border-slate-800/50">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                      Last Contrib. Month & Year
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={s3LastContribMonth}
                        onChange={(e) => setS3LastContribMonth(parseInt(e.target.value))}
                        className={`w-full p-2 rounded-xl text-xs border ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                        }`}
                      >
                        {MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m.substring(0, 3)}</option>)}
                      </select>
                      <select
                        value={s3LastContribYear}
                        onChange={(e) => setS3LastContribYear(parseInt(e.target.value))}
                        className={`w-full p-2 rounded-xl text-xs border ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                        }`}
                      >
                        {yearOptionsOnly.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                      Maturity / Liquid Access Year
                    </label>
                    <select
                      value={s3MaturityYear}
                      onChange={(e) => setS3MaturityYear(parseInt(e.target.value))}
                      className={`w-full p-2 rounded-xl text-xs border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                      }`}
                    >
                      {yearOptions.map(y => (
                        <option key={y.value} value={y.value}>{y.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!s3Name.trim() || !s3CurrentBalance}
                  className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                    isDark ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20'
                  }`}
                >
                  {editingS3Id ? <Check size={14} /> : <Plus size={14} />}
                  <span>{editingS3Id ? 'Save Growth Vehicle' : 'Add Growth Portfolio'}</span>
                </button>
              </div>
            </form>

            {/* List */}
            <div className="lg:col-span-6 space-y-3">
              <AnimatePresence>
                {scenario3Investments.map(inv => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                      editingS3Id === inv.id
                        ? isDark ? 'border-indigo-500/50 bg-indigo-950/20' : 'border-indigo-500/50 bg-indigo-50/50'
                        : isDark ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{inv.name}</span>
                        <span className="text-[11px] font-mono font-bold text-indigo-400">
                          {inv.expectedReturn || 8}% CAGR
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        <span className="font-mono font-bold tabular-nums text-indigo-500">
                          Balance: {formatCurrency(inv.currentBalance, inv.currency)}
                        </span>
                        {inv.contribution && inv.contribution > 0 ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[11px]">
                              +{formatCurrency(inv.contribution, inv.currency)} / {inv.contributionFrequency?.toLowerCase()}
                            </span>
                          </>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-0.5">
                        <span>Deposits stop: {MONTHS[(inv.lastContributionMonth || 12) - 1]} {inv.lastContributionYear}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-500 font-medium">
                          {inv.maturityYear && inv.maturityYear > currentYear ? `Matures: ${inv.maturityYear}` : 'Liquid access'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEditS3(inv)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteInvestment(inv.id)} className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {scenario3Investments.length === 0 && (
                <div className={`p-8 rounded-2xl border border-dashed text-center text-xs ${
                  isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
                }`}>
                  No compounding growth portfolios entered yet. Add index funds or brokerage accounts above!
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
