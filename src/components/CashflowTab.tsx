import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Plus, 
  Trash2, 
  Pencil, 
  X, 
  Check, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FinancialState, Income, Expense, CURRENCIES, MONTHS, formatCurrency, safeFloat } from '../types/finance';

interface CashflowTabProps {
  data: FinancialState;
  updateData: (key: keyof FinancialState, value: any) => void;
  theme: 'light' | 'dark';
  convertToBase: (amount: number, currency: string) => number;
}

export default function CashflowTab({ data, updateData, theme, convertToBase }: CashflowTabProps) {
  const currentYear = new Date().getFullYear();

  // Income form state
  const [incomeName, setIncomeName] = useState('');
  const [incomeAmount, setIncomeAmount] = useState<string>('');
  const [incomeFrequency, setIncomeFrequency] = useState<'Monthly' | 'Quarterly' | 'Yearly'>('Monthly');
  const [incomeCurrency, setIncomeCurrency] = useState(data.baseCurrency || 'USD');
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);

  // Expense form state
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseFrequency, setExpenseFrequency] = useState<'Monthly' | 'Quarterly' | 'Yearly'>('Monthly');
  const [expenseCurrency, setExpenseCurrency] = useState(data.baseCurrency || 'USD');
  const [hasExpenseEndDate, setHasExpenseEndDate] = useState(false);
  const [expenseLastMonth, setExpenseLastMonth] = useState<number>(12);
  const [expenseLastYear, setExpenseLastYear] = useState<number>(currentYear + 3);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Year options for expense cutoff
  const yearOptions = useMemo(() => {
    const opts = [];
    const maxYear = currentYear + Math.max(5, (data.lifeExpectancy || 90) - (data.currentAge || 30));
    for (let y = currentYear; y <= maxYear; y++) {
      opts.push(y);
    }
    return opts;
  }, [currentYear, data.lifeExpectancy, data.currentAge]);

  // Calculations for pulse summary
  const getMultiplier = (freq: string) => {
    if (freq === 'Monthly') return 12;
    if (freq === 'Quarterly') return 4;
    return 1;
  };

  const monthlyGrossIncome = useMemo(() => {
    return (data.incomes || []).reduce((sum, item) => {
      const annualBase = convertToBase(item.amount * getMultiplier(item.frequency), item.currency);
      return sum + (annualBase / 12);
    }, 0);
  }, [data.incomes, convertToBase]);

  const monthlyLivingExpenses = useMemo(() => {
    return (data.expenses || []).reduce((sum, item) => {
      const annualBase = convertToBase(item.amount * getMultiplier(item.frequency), item.currency);
      return sum + (annualBase / 12);
    }, 0);
  }, [data.expenses, convertToBase]);

  const monthlySurplus = monthlyGrossIncome - monthlyLivingExpenses;
  const savingsRate = monthlyGrossIncome > 0 
    ? Math.max(0, Math.min(100, (monthlySurplus / monthlyGrossIncome) * 100)) 
    : 0;

  // Handlers for Income
  const handleSaveIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = safeFloat(incomeAmount);
    if (!incomeName.trim() || amountNum <= 0) return;

    if (editingIncomeId) {
      const updated = (data.incomes || []).map(inc => 
        inc.id === editingIncomeId 
          ? { ...inc, name: incomeName.trim(), amount: amountNum, frequency: incomeFrequency, currency: incomeCurrency }
          : inc
      );
      updateData('incomes', updated);
      setEditingIncomeId(null);
    } else {
      const newItem: Income = {
        id: Date.now().toString(),
        name: incomeName.trim(),
        amount: amountNum,
        frequency: incomeFrequency,
        currency: incomeCurrency
      };
      updateData('incomes', [...(data.incomes || []), newItem]);
    }

    setIncomeName('');
    setIncomeAmount('');
  };

  const startEditIncome = (inc: Income) => {
    setEditingIncomeId(inc.id);
    setIncomeName(inc.name);
    setIncomeAmount(inc.amount.toString());
    setIncomeFrequency(inc.frequency);
    setIncomeCurrency(inc.currency || data.baseCurrency);
  };

  const cancelEditIncome = () => {
    setEditingIncomeId(null);
    setIncomeName('');
    setIncomeAmount('');
  };

  const deleteIncome = (id: string) => {
    updateData('incomes', (data.incomes || []).filter(i => i.id !== id));
    if (editingIncomeId === id) cancelEditIncome();
  };

  // Handlers for Expense
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = safeFloat(expenseAmount);
    if (!expenseName.trim() || amountNum <= 0) return;

    if (editingExpenseId) {
      const updated = (data.expenses || []).map(exp => 
        exp.id === editingExpenseId 
          ? { 
              ...exp, 
              name: expenseName.trim(), 
              amount: amountNum, 
              frequency: expenseFrequency, 
              currency: expenseCurrency,
              lastPaymentMonth: hasExpenseEndDate ? expenseLastMonth : undefined,
              lastPaymentYear: hasExpenseEndDate ? expenseLastYear : undefined
            }
          : exp
      );
      updateData('expenses', updated);
      setEditingExpenseId(null);
    } else {
      const newItem: Expense = {
        id: Date.now().toString(),
        name: expenseName.trim(),
        amount: amountNum,
        frequency: expenseFrequency,
        currency: expenseCurrency,
        lastPaymentMonth: hasExpenseEndDate ? expenseLastMonth : undefined,
        lastPaymentYear: hasExpenseEndDate ? expenseLastYear : undefined
      };
      updateData('expenses', [...(data.expenses || []), newItem]);
    }

    setExpenseName('');
    setExpenseAmount('');
    setHasExpenseEndDate(false);
  };

  const startEditExpense = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setExpenseName(exp.name);
    setExpenseAmount(exp.amount.toString());
    setExpenseFrequency(exp.frequency);
    setExpenseCurrency(exp.currency || data.baseCurrency);
    if (exp.lastPaymentYear && exp.lastPaymentYear > 0) {
      setHasExpenseEndDate(true);
      setExpenseLastMonth(exp.lastPaymentMonth || 12);
      setExpenseLastYear(exp.lastPaymentYear);
    } else {
      setHasExpenseEndDate(false);
    }
  };

  const cancelEditExpense = () => {
    setEditingExpenseId(null);
    setExpenseName('');
    setExpenseAmount('');
    setHasExpenseEndDate(false);
  };

  const deleteExpense = (id: string) => {
    updateData('expenses', (data.expenses || []).filter(e => e.id !== id));
    if (editingExpenseId === id) cancelEditExpense();
  };

  const isDark = theme === 'dark';

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
                Step 2 · Working Cash Dynamics
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs text-slate-500">Ages {data.currentAge} to {data.retirementAge}</span>
            </div>
            <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              What does your everyday cash flow look like?
            </h2>
            <p className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
              Financial independence is fueled by your active savings surplus. Tell us what flows in and out during your working career before you step into retirement.
            </p>
          </div>

          {/* Cash Flow Pulse Card */}
          <div className={`w-full lg:w-auto min-w-[280px] p-5 rounded-2xl border ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Monthly Net Surplus</span>
              <span className={`text-xs font-bold font-mono tabular-nums px-2 py-0.5 rounded-full ${
                monthlySurplus >= 0 
                  ? isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isDark ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {monthlySurplus >= 0 ? '+' : ''}{formatCurrency(monthlySurplus, data.baseCurrency)}/mo
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Savings Rate</span>
                <span className={`font-mono font-bold ${monthlySurplus >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {savingsRate.toFixed(1)}%
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    monthlySurplus >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 pt-1 font-mono tabular-nums">
                <span>In: {formatCurrency(monthlyGrossIncome, data.baseCurrency)}</span>
                <span>Out: {formatCurrency(monthlyLivingExpenses, data.baseCurrency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Question Grid: Incomes & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* ================= QUESTION 1: INCOMES ================= */}
        <div className={`p-6 md:p-8 rounded-3xl border flex flex-col transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {/* Section Question Lead */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                <TrendingUp size={18} />
              </div>
              <h3 className={`text-lg md:text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                What money flows in before you retire?
              </h3>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
              Log your primary salary, side business, rentals, or dividends. These grow annually by your <strong>{data.incomeGrowthRate || 3.0}%</strong> pre-retirement wage growth parameter.
            </p>
          </div>

          {/* Quick Suggestions for Incomes */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quick suggestions:</span>
            {['Primary Salary', 'Year-End Bonus', 'Rental Property', 'Freelance / Consulting'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setIncomeName(preset)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                  isDark 
                    ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white hover:border-slate-700' 
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                + {preset}
              </button>
            ))}
          </div>

          {/* Income Input Form */}
          <form onSubmit={handleSaveIncome} className={`p-5 rounded-2xl border mb-6 ${
            isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-[11px] font-black uppercase tracking-wider ${
                isDark ? 'text-emerald-400' : 'text-emerald-600'
              }`}>
                {editingIncomeId ? 'Edit Income Stream' : 'Add New Income Stream'}
              </span>
              {editingIncomeId && (
                <button
                  type="button"
                  onClick={cancelEditIncome}
                  className="text-[10px] text-slate-500 hover:text-rose-400 uppercase font-bold flex items-center gap-1"
                >
                  <X size={12} /> Cancel
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Income Source Name
                </label>
                <input
                  type="text"
                  value={incomeName}
                  onChange={(e) => setIncomeName(e.target.value)}
                  placeholder="e.g., Senior Software Engineer Salary"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-sm'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Amount Received
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    placeholder="8500"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none transition-all ${
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500' 
                        : 'bg-white border-slate-200 text-slate-900 focus:border-emerald-500 shadow-sm'
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Currency
                </label>
                <select
                  value={incomeCurrency}
                  onChange={(e) => setIncomeCurrency(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none transition-all ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                  }`}
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  How often is this paid?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Monthly', 'Quarterly', 'Yearly'] as const).map(freq => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setIncomeFrequency(freq)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        incomeFrequency === freq
                          ? isDark 
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' 
                            : 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
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
              disabled={!incomeName.trim() || !incomeAmount}
              className={`w-full mt-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20'
              }`}
            >
              {editingIncomeId ? <Check size={14} /> : <Plus size={14} />}
              <span>{editingIncomeId ? 'Save Income Changes' : 'Add Income Stream'}</span>
            </button>
          </form>

          {/* List of Incomes */}
          <div className="space-y-3 flex-1">
            <div className="flex justify-between items-center text-xs text-slate-500 pb-1">
              <span className="font-bold uppercase tracking-wider text-[10px]">Your Active Incomes ({data.incomes?.length || 0})</span>
              <span className="font-mono tabular-nums">
                Total: {formatCurrency(monthlyGrossIncome * 12, data.baseCurrency)} / yr
              </span>
            </div>

            <AnimatePresence>
              {(data.incomes || []).map((inc) => {
                const annualInBase = convertToBase(inc.amount * getMultiplier(inc.frequency), inc.currency);
                return (
                  <motion.div
                    key={inc.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                      editingIncomeId === inc.id
                        ? isDark ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-emerald-500/50 bg-emerald-50/50'
                        : isDark ? 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {inc.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        <span className="font-mono font-bold tabular-nums text-emerald-500">
                          {formatCurrency(inc.amount, inc.currency)} / {inc.frequency.toLowerCase().replace('ly', '')}
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
                        onClick={() => startEditIncome(inc)}
                        className={`p-2 rounded-xl transition-colors ${
                          isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                        }`}
                        title="Edit entry"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteIncome(inc.id)}
                        className={`p-2 rounded-xl transition-colors ${
                          isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/30' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
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

            {(!data.incomes || data.incomes.length === 0) && (
              <div className={`p-8 rounded-2xl border border-dashed text-center text-xs ${
                isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
              }`}>
                No pre-retirement income streams added yet. Add your salary or active earnings above!
              </div>
            )}
          </div>
        </div>

        {/* ================= QUESTION 2: LIVING EXPENSES ================= */}
        <div className={`p-6 md:p-8 rounded-3xl border flex flex-col transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {/* Section Question Lead */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                <DollarSign size={18} />
              </div>
              <h3 className={`text-lg md:text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                What are your regular living expenses today?
              </h3>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
              Record household outlays (rent/mortgage, groceries, transport, utilities). These pre-retirement costs automatically conclude when you retire (or at a custom payoff year).
            </p>
          </div>

          {/* Quick Suggestions for Expenses */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quick suggestions:</span>
            {['Home Rent / Mortgage', 'Groceries & Dining', 'Car Loan Payment', 'Utilities & Internet', 'Travel & Hobbies'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setExpenseName(preset)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                  isDark 
                    ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white hover:border-slate-700' 
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                + {preset}
              </button>
            ))}
          </div>

          {/* Expense Input Form */}
          <form onSubmit={handleSaveExpense} className={`p-5 rounded-2xl border mb-6 ${
            isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-[11px] font-black uppercase tracking-wider ${
                isDark ? 'text-rose-400' : 'text-rose-600'
              }`}>
                {editingExpenseId ? 'Edit Living Expense' : 'Add New Living Expense'}
              </span>
              {editingExpenseId && (
                <button
                  type="button"
                  onClick={cancelEditExpense}
                  className="text-[10px] text-slate-500 hover:text-rose-400 uppercase font-bold flex items-center gap-1"
                >
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
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  placeholder="e.g., Apartment Rent / Mortgage"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 shadow-sm'
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
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="2400"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono tabular-nums border outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-900 border-slate-700 text-white focus:border-rose-500' 
                      : 'bg-white border-slate-200 text-slate-900 focus:border-rose-500 shadow-sm'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Currency
                </label>
                <select
                  value={expenseCurrency}
                  onChange={(e) => setExpenseCurrency(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none transition-all ${
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
                      onClick={() => setExpenseFrequency(freq)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        expenseFrequency === freq
                          ? isDark 
                            ? 'bg-rose-600 text-white border-rose-500 shadow-sm' 
                            : 'bg-rose-600 text-white border-rose-600 shadow-sm'
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

              {/* Optional End Date Checkbox / Toggle */}
              <div className="sm:col-span-2 pt-2 border-t border-slate-800/10 dark:border-slate-800/50">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                  <input
                    type="checkbox"
                    checked={hasExpenseEndDate}
                    onChange={(e) => setHasExpenseEndDate(e.target.checked)}
                    className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                  />
                  <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                    Does this expense end before retirement? (e.g. loan payoff, temporary lease)
                  </span>
                </label>

                {hasExpenseEndDate && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Last Payment Month</label>
                      <select
                        value={expenseLastMonth}
                        onChange={(e) => setExpenseLastMonth(parseInt(e.target.value))}
                        className={`w-full p-2 rounded-xl text-xs border ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                        }`}
                      >
                        {MONTHS.map((m, idx) => (
                          <option key={m} value={idx + 1}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Last Payment Year</label>
                      <select
                        value={expenseLastYear}
                        onChange={(e) => setExpenseLastYear(parseInt(e.target.value))}
                        className={`w-full p-2 rounded-xl text-xs border ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                        }`}
                      >
                        {yearOptions.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!expenseName.trim() || !expenseAmount}
              className={`w-full mt-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark ? 'bg-rose-600 hover:bg-rose-500' : 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20'
              }`}
            >
              {editingExpenseId ? <Check size={14} /> : <Plus size={14} />}
              <span>{editingExpenseId ? 'Save Expense Changes' : 'Add Living Expense'}</span>
            </button>
          </form>

          {/* List of Expenses */}
          <div className="space-y-3 flex-1">
            <div className="flex justify-between items-center text-xs text-slate-500 pb-1">
              <span className="font-bold uppercase tracking-wider text-[10px]">Your Active Expenses ({data.expenses?.length || 0})</span>
              <span className="font-mono tabular-nums">
                Total: {formatCurrency(monthlyLivingExpenses * 12, data.baseCurrency)} / yr
              </span>
            </div>

            <AnimatePresence>
              {(data.expenses || []).map((exp) => {
                const annualInBase = convertToBase(exp.amount * getMultiplier(exp.frequency), exp.currency);
                return (
                  <motion.div
                    key={exp.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                      editingExpenseId === exp.id
                        ? isDark ? 'border-rose-500/50 bg-rose-950/20' : 'border-rose-500/50 bg-rose-50/50'
                        : isDark ? 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {exp.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        <span className="font-mono font-bold tabular-nums text-rose-500">
                          {formatCurrency(exp.amount, exp.currency)} / {exp.frequency.toLowerCase().replace('ly', '')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-[11px]">
                          ~{formatCurrency(annualInBase, data.baseCurrency)} / yr
                        </span>
                        {exp.lastPaymentYear && exp.lastPaymentYear > 0 ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-500 font-medium text-[11px]">
                              Ceases {MONTHS[(exp.lastPaymentMonth || 12) - 1]} {exp.lastPaymentYear}
                            </span>
                          </>
                        ) : (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[11px] text-slate-400">Ceases at retirement</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditExpense(exp)}
                        className={`p-2 rounded-xl transition-colors ${
                          isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                        }`}
                        title="Edit entry"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteExpense(exp.id)}
                        className={`p-2 rounded-xl transition-colors ${
                          isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/30' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
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

            {(!data.expenses || data.expenses.length === 0) && (
              <div className={`p-8 rounded-2xl border border-dashed text-center text-xs ${
                isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
              }`}>
                No living expenses added yet. Add your regular living costs above!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
