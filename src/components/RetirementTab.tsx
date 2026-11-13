import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Plus, 
  Trash2, 
  Pencil, 
  X, 
  Check, 
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FinancialState, RetirementExpense, CURRENCIES, formatCurrency, safeFloat } from '../types/finance';

interface RetirementTabProps {
  data: FinancialState;
  updateData: (key: keyof FinancialState, value: any) => void;
  theme: 'light' | 'dark';
  convertToBase: (amount: number, currency: string) => number;
  projection?: any;
}

export default function RetirementTab({ data, updateData, theme, convertToBase, projection }: RetirementTabProps) {
  const isDark = theme === 'dark';

  // State for recurring retirement budget form
  const [recurringName, setRecurringName] = useState('');
  const [recurringAmount, setRecurringAmount] = useState<string>('');
  const [recurringFrequency, setRecurringFrequency] = useState<'Monthly' | 'Quarterly' | 'Yearly'>('Monthly');
  const [recurringCurrency, setRecurringCurrency] = useState(data.baseCurrency || 'USD');
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);

  // State for lump sum retirement dreams form
  const [lumpName, setLumpName] = useState('');
  const [lumpAmount, setLumpAmount] = useState<string>('');
  const [lumpCurrency, setLumpCurrency] = useState(data.baseCurrency || 'USD');
  const [editingLumpId, setEditingLumpId] = useState<string | null>(null);

  // Split recurring vs lump sum retirement expenses
  const recurringExpenses = useMemo(() => {
    return (data.retirementExpenses || []).filter(e => e.type !== 'Lump Sum');
  }, [data.retirementExpenses]);

  const lumpSumExpenses = useMemo(() => {
    return (data.retirementExpenses || []).filter(e => e.type === 'Lump Sum');
  }, [data.retirementExpenses]);

  // Calculations for retirement budget
  const getMultiplier = (freq: string) => {
    if (freq === 'Monthly') return 12;
    if (freq === 'Quarterly') return 4;
    return 1;
  };

  const monthlyRetirementBudget = useMemo(() => {
    return recurringExpenses.reduce((sum, item) => {
      const annualBase = convertToBase(item.amount * getMultiplier(item.type), item.currency);
      return sum + (annualBase / 12);
    }, 0);
  }, [recurringExpenses, convertToBase]);

  const annualRetirementBudget = monthlyRetirementBudget * 12;

  const totalLumpSumRetirement = useMemo(() => {
    return lumpSumExpenses.reduce((sum, item) => {
      return sum + convertToBase(item.amount, item.currency);
    }, 0);
  }, [lumpSumExpenses, convertToBase]);

  // SWR Nest Egg Calculation
  const swrRate = data.safeWithdrawalRate || 4.0;
  const targetNestEgg = swrRate > 0 ? (annualRetirementBudget / (swrRate / 100)) + totalLumpSumRetirement : 0;

  // Handlers for Recurring
  const handleSaveRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = safeFloat(recurringAmount);
    if (!recurringName.trim() || amt <= 0) return;

    if (editingRecurringId) {
      const updated = (data.retirementExpenses || []).map(exp => 
        exp.id === editingRecurringId
          ? { ...exp, name: recurringName.trim(), amount: amt, type: recurringFrequency, currency: recurringCurrency }
          : exp
      );
      updateData('retirementExpenses', updated);
      setEditingRecurringId(null);
    } else {
      const newItem: RetirementExpense = {
        id: Date.now().toString(),
        name: recurringName.trim(),
        amount: amt,
        type: recurringFrequency,
        currency: recurringCurrency
      };
      updateData('retirementExpenses', [...(data.retirementExpenses || []), newItem]);
    }

    setRecurringName('');
    setRecurringAmount('');
  };

  const startEditRecurring = (exp: RetirementExpense) => {
    setEditingRecurringId(exp.id);
    setRecurringName(exp.name);
    setRecurringAmount(exp.amount.toString());
    setRecurringFrequency((exp.type === 'Lump Sum' ? 'Monthly' : exp.type) as any);
    setRecurringCurrency(exp.currency || data.baseCurrency);
  };

  const cancelEditRecurring = () => {
    setEditingRecurringId(null);
    setRecurringName('');
    setRecurringAmount('');
  };

  // Handlers for Lump Sum
  const handleSaveLump = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = safeFloat(lumpAmount);
    if (!lumpName.trim() || amt <= 0) return;

    if (editingLumpId) {
      const updated = (data.retirementExpenses || []).map(exp => 
        exp.id === editingLumpId
          ? { ...exp, name: lumpName.trim(), amount: amt, type: 'Lump Sum' as const, currency: lumpCurrency }
          : exp
      );
      updateData('retirementExpenses', updated);
      setEditingLumpId(null);
    } else {
      const newItem: RetirementExpense = {
        id: Date.now().toString(),
        name: lumpName.trim(),
        amount: amt,
        type: 'Lump Sum',
        currency: lumpCurrency
      };
      updateData('retirementExpenses', [...(data.retirementExpenses || []), newItem]);
    }

    setLumpName('');
    setLumpAmount('');
  };

  const startEditLump = (exp: RetirementExpense) => {
    setEditingLumpId(exp.id);
    setLumpName(exp.name);
    setLumpAmount(exp.amount.toString());
    setLumpCurrency(exp.currency || data.baseCurrency);
  };

  const cancelEditLump = () => {
    setEditingLumpId(null);
    setLumpName('');
    setLumpAmount('');
  };

  const deleteRetirementExpense = (id: string) => {
    updateData('retirementExpenses', (data.retirementExpenses || []).filter(e => e.id !== id));
    if (editingRecurringId === id) cancelEditRecurring();
    if (editingLumpId === id) cancelEditLump();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header & Conversational Premise */}
      <div className={`p-6 md:p-8 rounded-3xl border transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-black uppercase tracking-widest ${
                isDark ? 'text-indigo-400' : 'text-indigo-600'
              }`}>
                Step 5 · Freedom Blueprint
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs text-slate-500">Retirement Strategy</span>
            </div>
            <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              What does your dream retirement look like?
            </h2>
            <p className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
              Design the monthly lifestyle budget you need and any extra bucket-list dreams or reserves starting at age <strong>{data.retirementAge}</strong>.
            </p>
          </div>

          {/* SWR Target Nest Egg Card */}
          <div className={`w-full lg:w-auto min-w-[280px] p-5 rounded-2xl border ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              <span>Target FI/RE Nest Egg</span>
              <span className="text-indigo-400">@{swrRate}% SWR</span>
            </div>
            <div className="text-2xl font-black font-mono tabular-nums tracking-tight text-indigo-500">
              {formatCurrency(targetNestEgg, data.baseCurrency)}
            </div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
              <span>Monthly Freedom Budget:</span>
              <span className="font-bold font-mono">{formatCurrency(monthlyRetirementBudget, data.baseCurrency)}/mo</span>
            </div>
          </div>
        </div>
      </div>

      {/* QUESTION 1 & 2: RECURRING BUDGET & LUMP SUMS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* ================= QUESTION 1: RECURRING LIFESTYLE BUDGET ================= */}
        <section className={`p-6 md:p-8 rounded-3xl border flex flex-col transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="space-y-1 mb-6">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                <DollarSign size={18} />
              </div>
              <h3 className={`text-lg md:text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Question 1: What monthly lifestyle budget will give you peace of mind?
              </h3>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
              Ongoing core retirement living expenses (housing, groceries, utilities, travel, health). These only activate once you reach age <strong>{data.retirementAge}</strong> and adjust for inflation each year.
            </p>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5 mb-5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block w-full mb-1">Quick ideas:</span>
            {['Retirement Housing & Utilities', 'Groceries & Fine Dining', 'Private Healthcare & Insurance', 'Travel & Hobbies Allowance'].map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => setRecurringName(preset)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                  isDark
                    ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                }`}
              >
                + {preset}
              </button>
            ))}
          </div>

          {/* Recurring Form */}
          <form onSubmit={handleSaveRecurring} className={`p-5 rounded-2xl border mb-6 ${
            isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-[11px] font-black uppercase tracking-wider ${
                isDark ? 'text-indigo-400' : 'text-indigo-600'
              }`}>
                {editingRecurringId ? 'Edit Recurring Budget Item' : 'Add Recurring Budget Item'}
              </span>
              {editingRecurringId && (
                <button type="button" onClick={cancelEditRecurring} className="text-[10px] text-slate-500 hover:text-rose-400 uppercase font-bold flex items-center gap-1">
                  <X size={12} /> Cancel
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Expense Description
                </label>
                <input
                  type="text"
                  value={recurringName}
                  onChange={(e) => setRecurringName(e.target.value)}
                  placeholder="e.g., Comfortable Housing & Living Buffer"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Amount
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={recurringAmount}
                  onChange={(e) => setRecurringAmount(e.target.value)}
                  placeholder="3500"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Currency
                </label>
                <select
                  value={recurringCurrency}
                  onChange={(e) => setRecurringCurrency(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                  }`}
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Frequency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Monthly', 'Quarterly', 'Yearly'] as const).map(freq => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setRecurringFrequency(freq)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        recurringFrequency === freq
                          ? isDark ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' : 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
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
              disabled={!recurringName.trim() || !recurringAmount}
              className={`w-full mt-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                isDark ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20'
              }`}
            >
              {editingRecurringId ? <Check size={14} /> : <Plus size={14} />}
              <span>{editingRecurringId ? 'Save Item Changes' : 'Add Budget Item'}</span>
            </button>
          </form>

          {/* List */}
          <div className="space-y-3 flex-1">
            <div className="flex justify-between items-center text-xs text-slate-500 pb-1">
              <span className="font-bold uppercase tracking-wider text-[10px]">Active Retirement Expenses ({recurringExpenses.length})</span>
              <span className="font-mono tabular-nums">
                Total: {formatCurrency(monthlyRetirementBudget, data.baseCurrency)} / mo
              </span>
            </div>

            <AnimatePresence>
              {recurringExpenses.map(exp => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                    editingRecurringId === exp.id
                      ? isDark ? 'border-indigo-500/50 bg-indigo-950/20' : 'border-indigo-500/50 bg-indigo-50/50'
                      : isDark ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <span className={`font-bold text-sm block ${isDark ? 'text-white' : 'text-slate-900'}`}>{exp.name}</span>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-bold tabular-nums text-indigo-500">
                        {formatCurrency(exp.amount, exp.currency)} / {exp.type.toLowerCase().replace('ly', '')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[11px]">Starts at age {data.retirementAge}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEditRecurring(exp)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deleteRetirementExpense(exp.id)} className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {recurringExpenses.length === 0 && (
              <div className={`p-8 rounded-2xl border border-dashed text-center text-xs ${
                isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
              }`}>
                No retirement living expenses entered yet. Add your projected post-work budget above!
              </div>
            )}
          </div>
        </section>

        {/* ================= QUESTION 2: LUMP SUM DREAMS & BUFFERS ================= */}
        <section className={`p-6 md:p-8 rounded-3xl border flex flex-col transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="space-y-1 mb-6">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                <Sparkles size={18} />
              </div>
              <h3 className={`text-lg md:text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Question 2: Any extra bucket-list dreams or healthcare buffers?
              </h3>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
              One-off capital deducts that take place exactly on the year you enter retirement at age <strong>{data.retirementAge}</strong> (e.g. world voyage, vacation cottage, medical reserve, debt clearance).
            </p>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5 mb-5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block w-full mb-1">Quick ideas:</span>
            {['World Cruise Celebration', 'Holiday Cottage Upgrade', 'Healthcare Safety Buffer', 'Legacy Family Gift'].map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => setLumpName(preset)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                  isDark
                    ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900'
                }`}
              >
                + {preset}
              </button>
            ))}
          </div>

          {/* Lump Sum Form */}
          <form onSubmit={handleSaveLump} className={`p-5 rounded-2xl border mb-6 ${
            isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-[11px] font-black uppercase tracking-wider ${
                isDark ? 'text-emerald-400' : 'text-emerald-600'
              }`}>
                {editingLumpId ? 'Edit Lump Sum Item' : 'Add Lump Sum Dream'}
              </span>
              {editingLumpId && (
                <button type="button" onClick={cancelEditLump} className="text-[10px] text-slate-500 hover:text-rose-400 uppercase font-bold flex items-center gap-1">
                  <X size={12} /> Cancel
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Dream Item Name
                </label>
                <input
                  type="text"
                  value={lumpName}
                  onChange={(e) => setLumpName(e.target.value)}
                  placeholder="e.g., Around-the-World Voyage"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500 shadow-sm'
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    Amount (Today&apos;s Value)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={lumpAmount}
                    onChange={(e) => setLumpAmount(e.target.value)}
                    placeholder="30000"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500 shadow-sm'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    Currency
                  </label>
                  <select
                    value={lumpCurrency}
                    onChange={(e) => setLumpCurrency(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={!lumpName.trim() || !lumpAmount}
                className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                  isDark ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20'
                }`}
              >
                {editingLumpId ? <Check size={14} /> : <Plus size={14} />}
                <span>{editingLumpId ? 'Save Dream Changes' : 'Add Lump Sum Dream'}</span>
              </button>
            </div>
          </form>

          {/* List */}
          <div className="space-y-3 flex-1">
            <div className="flex justify-between items-center text-xs text-slate-500 pb-1">
              <span className="font-bold uppercase tracking-wider text-[10px]">Lump Sum Reserves ({lumpSumExpenses.length})</span>
              <span className="font-mono tabular-nums">
                Total: {formatCurrency(totalLumpSumRetirement, data.baseCurrency)}
              </span>
            </div>

            <AnimatePresence>
              {lumpSumExpenses.map(exp => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                    editingLumpId === exp.id
                      ? isDark ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-emerald-500/50 bg-emerald-50/50'
                      : isDark ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <span className={`font-bold text-sm block ${isDark ? 'text-white' : 'text-slate-900'}`}>{exp.name}</span>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-bold tabular-nums text-emerald-500">
                        {formatCurrency(exp.amount, exp.currency)} (Lump Sum)
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[11px]">Paid at age {data.retirementAge}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEditLump(exp)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deleteRetirementExpense(exp.id)} className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {lumpSumExpenses.length === 0 && (
              <div className={`p-8 rounded-2xl border border-dashed text-center text-xs ${
                isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
              }`}>
                No one-time retirement dreams entered yet. Add bucket list trips or medical buffers above!
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
