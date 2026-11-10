import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Target, 
  Plus, 
  Trash2, 
  Pencil, 
  X, 
  Check, 
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FinancialState, Goal, CURRENCIES, formatCurrency, safeFloat } from '../types/finance';

interface GoalsTabProps {
  data: FinancialState;
  updateData: (key: keyof FinancialState, value: any) => void;
  theme: 'light' | 'dark';
  convertToBase: (amount: number, currency: string) => number;
}

export default function GoalsTab({ data, updateData, theme, convertToBase }: GoalsTabProps) {
  const currentYear = new Date().getFullYear();
  const isDark = theme === 'dark';

  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState<string>('');
  const [goalFrequency, setGoalFrequency] = useState<'Lump Sum' | 'Monthly' | 'Quarterly' | 'Yearly'>('Lump Sum');
  const [goalStartYear, setGoalStartYear] = useState<number>(currentYear + 3);
  const [goalEndYear, setGoalEndYear] = useState<number>(currentYear + 7);
  const [goalCurrency, setGoalCurrency] = useState(data.baseCurrency || 'USD');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  // Year options: current year to retirement age or life expectancy
  const yearOptions = useMemo(() => {
    const opts = [];
    const maxYear = currentYear + Math.max(5, (data.lifeExpectancy || 90) - (data.currentAge || 30));
    for (let y = currentYear; y <= maxYear; y++) {
      opts.push(y);
    }
    return opts;
  }, [currentYear, data.lifeExpectancy, data.currentAge]);

  // Total present value of all goals
  const totalGoalsPV = useMemo(() => {
    return (data.goals || []).reduce((sum, g) => {
      const baseAmt = convertToBase(g.amount, g.currency);
      if (g.frequency === 'Lump Sum') {
        return sum + baseAmt;
      }
      const mult = g.frequency === 'Monthly' ? 12 : (g.frequency === 'Quarterly' ? 4 : 1);
      const years = Math.max(1, ((g.endYear || g.startYear) - g.startYear) + 1);
      return sum + (baseAmt * mult * years);
    }, 0);
  }, [data.goals, convertToBase]);

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = safeFloat(goalAmount);
    if (!goalName.trim() || amountVal <= 0) return;

    if (editingGoalId) {
      const updated = (data.goals || []).map(g => 
        g.id === editingGoalId
          ? {
              ...g,
              name: goalName.trim(),
              amount: amountVal,
              frequency: goalFrequency,
              startYear: goalStartYear,
              endYear: goalFrequency !== 'Lump Sum' ? Math.max(goalStartYear, goalEndYear) : undefined,
              currency: goalCurrency
            }
          : g
      );
      updateData('goals', updated);
      setEditingGoalId(null);
    } else {
      const newGoal: Goal = {
        id: Date.now().toString(),
        name: goalName.trim(),
        amount: amountVal,
        frequency: goalFrequency,
        startYear: goalStartYear,
        endYear: goalFrequency !== 'Lump Sum' ? Math.max(goalStartYear, goalEndYear) : undefined,
        currency: goalCurrency
      };
      updateData('goals', [...(data.goals || []), newGoal]);
    }

    setGoalName('');
    setGoalAmount('');
  };

  const startEditGoal = (g: Goal) => {
    setEditingGoalId(g.id);
    setGoalName(g.name);
    setGoalAmount(g.amount.toString());
    setGoalFrequency(g.frequency);
    setGoalStartYear(g.startYear || currentYear);
    setGoalEndYear(g.endYear || g.startYear || currentYear + 4);
    setGoalCurrency(g.currency || data.baseCurrency);
  };

  const cancelEditGoal = () => {
    setEditingGoalId(null);
    setGoalName('');
    setGoalAmount('');
  };

  const deleteGoal = (id: string) => {
    updateData('goals', (data.goals || []).filter(g => g.id !== id));
    if (editingGoalId === id) cancelEditGoal();
  };

  // Helper to compute inflation adjusted future cost
  const getEstimatedFutureCost = (pv: number, startYr: number) => {
    const yearsAway = Math.max(0, startYr - currentYear);
    const inflation = safeFloat(data.inflationRate || 2.5) / 100;
    return pv * Math.pow(1 + inflation, yearsAway);
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
                Step 3 · Capital Milestones
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs text-slate-500">Working Life Goals</span>
            </div>
            <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              What major milestones are you planning before you retire?
            </h2>
            <p className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
              Large life events (home purchases, college tuition, dream weddings, starting a business) require dedicated capital. Enter values in today&apos;s purchasing power — we automatically adjust them for your <strong>{data.inflationRate || 2.5}%</strong> inflation rate when they occur.
            </p>
          </div>

          {/* Goals Commitment Summary Card */}
          <div className={`w-full lg:w-auto min-w-[280px] p-5 rounded-2xl border ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
              Total Capital Committed
            </span>
            <div className="text-2xl font-black font-mono tabular-nums tracking-tight text-indigo-500">
              {formatCurrency(totalGoalsPV, data.baseCurrency)}
            </div>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
              <span>Planned Milestones:</span>
              <span className="font-bold">{data.goals?.length || 0} events</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Form + Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Card */}
        <form onSubmit={handleSaveGoal} className={`lg:col-span-5 p-6 rounded-3xl border transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                <Target size={16} />
              </div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {editingGoalId ? 'Edit Milestone' : 'Add New Milestone'}
              </h3>
            </div>
            {editingGoalId && (
              <button type="button" onClick={cancelEditGoal} className="text-[10px] text-slate-500 hover:text-rose-400 uppercase font-bold flex items-center gap-1">
                <X size={12} /> Cancel
              </button>
            )}
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5 mb-5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block w-full mb-1">Quick ideas:</span>
            {['Home Down Payment', 'Children College Tuition', 'Dream Wedding', 'Sabbatical / World Tour', 'Vehicle Upgrade'].map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => setGoalName(preset)}
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

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                Milestone Name
              </label>
              <input
                type="text"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g., Mountain Cottage Down Payment"
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'
                }`}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Cost (Today&apos;s Value)
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value)}
                  placeholder="75000"
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
                  value={goalCurrency}
                  onChange={(e) => setGoalCurrency(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                  }`}
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                Frequency / Occurrence
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['Lump Sum', 'Monthly', 'Quarterly', 'Yearly'] as const).map(freq => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setGoalFrequency(freq)}
                    className={`py-2 px-2 text-center rounded-xl text-[11px] font-semibold border transition-all ${
                      goalFrequency === freq
                        ? isDark
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
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

            <div className={`grid ${goalFrequency !== 'Lump Sum' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  {goalFrequency === 'Lump Sum' ? 'Target Year of Event' : 'Starting Year'}
                </label>
                <select
                  value={goalStartYear}
                  onChange={(e) => setGoalStartYear(parseInt(e.target.value))}
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                  }`}
                >
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {goalFrequency !== 'Lump Sum' && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    Ending Year
                  </label>
                  <select
                    value={goalEndYear}
                    onChange={(e) => setGoalEndYear(parseInt(e.target.value))}
                    className={`w-full p-2.5 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    {yearOptions.filter(y => y >= goalStartYear).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!goalName.trim() || !goalAmount}
              className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                isDark ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20'
              }`}
            >
              {editingGoalId ? <Check size={14} /> : <Plus size={14} />}
              <span>{editingGoalId ? 'Save Milestone Changes' : 'Add Milestone Goal'}</span>
            </button>
          </div>
        </form>

        {/* Goals List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex justify-between items-center text-xs text-slate-500 pb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Your Life Goals ({data.goals?.length || 0})</span>
            <span className="text-[11px]">Indexed with {data.inflationRate || 2.5}% inflation</span>
          </div>

          <AnimatePresence>
            {(data.goals || []).map((g) => {
              const estFutureCost = getEstimatedFutureCost(g.amount, g.startYear);
              const yearsAway = Math.max(0, g.startYear - currentYear);

              return (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-5 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                    editingGoalId === g.id
                      ? isDark ? 'border-indigo-500/50 bg-indigo-950/20' : 'border-indigo-500/50 bg-indigo-50/50'
                      : isDark ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {g.name}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs font-semibold text-indigo-400">
                        {g.startYear}{g.endYear && g.endYear > g.startYear ? ` – ${g.endYear}` : ''}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        ({yearsAway === 0 ? 'This year' : `in ${yearsAway} yr${yearsAway > 1 ? 's' : ''}`})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span className="font-mono font-bold tabular-nums text-indigo-500">
                        {formatCurrency(g.amount, g.currency)} {g.frequency !== 'Lump Sum' ? `/ ${g.frequency.toLowerCase()}` : 'lump sum'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[11px]">
                        Est. future cost: ~{formatCurrency(estFutureCost, g.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEditGoal(g)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => deleteGoal(g.id)} className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {(!data.goals || data.goals.length === 0) && (
            <div className={`p-8 rounded-2xl border border-dashed text-center text-xs ${
              isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
            }`}>
              No pre-retirement goals added yet. Add university, down payment, or big adventures above!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
