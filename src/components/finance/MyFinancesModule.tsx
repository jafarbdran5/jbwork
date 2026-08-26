import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Laptop, 
  Plus, 
  Trash2, 
  Edit3, 
  DollarSign, 
  Tag, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  FolderOpen
} from 'lucide-react';
import { 
  PersonalIncome, 
  PersonalExpense, 
  InventoryItem, 
  PersonalAsset 
} from '../../types';
import { logAuditAndEvent } from '../../lib/audit';

export const MyFinancesModule: React.FC = () => {
  const { userProfile, isSuperAdmin } = useAuth();
  const { isRTL } = useI18n();

  // Active Tab: 'overview' | 'income' | 'expenses' | 'inventory' | 'assets'
  const [activeTab, setActiveTab] = useState<'overview' | 'income' | 'expenses' | 'inventory' | 'assets'>('overview');

  const [incomes, setIncomes] = useState<PersonalIncome[]>([]);
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [assets, setAssets] = useState<PersonalAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState<boolean>(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState<boolean>(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState<boolean>(false);

  // Form states
  const [incomeForm, setIncomeForm] = useState<{
    title: string;
    source: PersonalIncome['source'];
    amount: number;
    currency: string;
    incomeDate: string;
    paymentMethod: string;
    note: string;
  }>({
    title: '',
    source: 'consulting',
    amount: 0,
    currency: 'USD',
    incomeDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    note: ''
  });

  const [expenseForm, setExpenseForm] = useState<{
    title: string;
    category: PersonalExpense['category'];
    amount: number;
    currency: string;
    expenseDate: string;
    paymentMethod: string;
    note: string;
  }>({
    title: '',
    category: 'tech_gadgets',
    amount: 0,
    currency: 'USD',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    note: ''
  });

  const [inventoryForm, setInventoryForm] = useState<{
    name: string;
    category: string;
    quantity: number;
    purchasePrice: number;
    currentValue: number;
    currency: string;
    purchaseDate: string;
    location: string;
    condition: InventoryItem['condition'];
    serialNumber: string;
    notes: string;
  }>({
    name: '',
    category: 'Hardware',
    quantity: 1,
    purchasePrice: 0,
    currentValue: 0,
    currency: 'USD',
    purchaseDate: new Date().toISOString().split('T')[0],
    location: 'Main Office',
    condition: 'new',
    serialNumber: '',
    notes: ''
  });

  const [assetForm, setAssetForm] = useState<{
    name: string;
    category: PersonalAsset['category'];
    value: number;
    currency: string;
    purchaseDate: string;
    serialNumber: string;
    status: PersonalAsset['status'];
    notes: string;
  }>({
    name: '',
    category: 'laptop',
    value: 0,
    currency: 'USD',
    purchaseDate: new Date().toISOString().split('T')[0],
    serialNumber: '',
    status: 'active',
    notes: ''
  });

  // Realtime Subscriptions
  useEffect(() => {
    if (!isSuperAdmin) return;
    setLoading(true);

    const unsubIncome = onSnapshot(collection(db, 'personal_income'), (snap) => {
      setIncomes(snap.docs.map(d => ({ id: d.id, ...d.data() } as PersonalIncome)));
    });

    const unsubExpense = onSnapshot(collection(db, 'personal_expenses'), (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as PersonalExpense)));
    });

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snap) => {
      setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
    });

    const unsubAssets = onSnapshot(collection(db, 'assets'), (snap) => {
      setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as PersonalAsset)));
      setLoading(false);
    });

    return () => {
      unsubIncome();
      unsubExpense();
      unsubInventory();
      unsubAssets();
    };
  }, [isSuperAdmin]);

  // Totals calculations
  const totals = useMemo(() => {
    const totalIncomeUSD = incomes.filter(i => i.currency === 'USD').reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalIncomeSYP = incomes.filter(i => i.currency === 'SYP').reduce((s, i) => s + (Number(i.amount) || 0), 0);

    const totalExpUSD = expenses.filter(e => e.currency === 'USD').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const totalExpSYP = expenses.filter(e => e.currency === 'SYP').reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const inventoryValueUSD = inventory.filter(i => i.currency === 'USD').reduce((s, i) => s + ((Number(i.currentValue) || 0) * (Number(i.quantity) || 1)), 0);
    const assetValueUSD = assets.filter(a => a.currency === 'USD').reduce((s, a) => s + (Number(a.value) || 0), 0);

    return {
      netUSD: totalIncomeUSD - totalExpUSD,
      netSYP: totalIncomeSYP - totalExpSYP,
      totalIncomeUSD,
      totalIncomeSYP,
      totalExpUSD,
      totalExpSYP,
      inventoryValueUSD,
      assetValueUSD,
      totalNetWorthUSD: (totalIncomeUSD - totalExpUSD) + inventoryValueUSD + assetValueUSD
    };
  }, [incomes, expenses, inventory, assets]);

  // Handlers for Add Operations
  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeForm.title || incomeForm.amount <= 0) return;

    try {
      await addDoc(collection(db, 'personal_income'), {
        ...incomeForm,
        recordedBy: { uid: userProfile?.uid || 'admin', name: userProfile?.displayName || 'Jaafar' },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsIncomeModalOpen(false);
      setIncomeForm({
        title: '',
        source: 'consulting',
        amount: 0,
        currency: 'USD',
        incomeDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Cash',
        note: ''
      });
    } catch (err) {
      console.error('Error saving income:', err);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || expenseForm.amount <= 0) return;

    try {
      await addDoc(collection(db, 'personal_expenses'), {
        ...expenseForm,
        recordedBy: { uid: userProfile?.uid || 'admin', name: userProfile?.displayName || 'Jaafar' },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsExpenseModalOpen(false);
      setExpenseForm({
        title: '',
        category: 'tech_gadgets',
        amount: 0,
        currency: 'USD',
        expenseDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Cash',
        note: ''
      });
    } catch (err) {
      console.error('Error saving expense:', err);
    }
  };

  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryForm.name || inventoryForm.quantity <= 0) return;

    try {
      await addDoc(collection(db, 'inventory'), {
        ...inventoryForm,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsInventoryModalOpen(false);
      setInventoryForm({
        name: '',
        category: 'Hardware',
        quantity: 1,
        purchasePrice: 0,
        currentValue: 0,
        currency: 'USD',
        purchaseDate: new Date().toISOString().split('T')[0],
        location: 'Main Office',
        condition: 'new',
        serialNumber: '',
        notes: ''
      });
    } catch (err) {
      console.error('Error saving inventory:', err);
    }
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.name || assetForm.value <= 0) return;

    try {
      await addDoc(collection(db, 'assets'), {
        ...assetForm,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsAssetModalOpen(false);
      setAssetForm({
        name: '',
        category: 'laptop',
        value: 0,
        currency: 'USD',
        purchaseDate: new Date().toISOString().split('T')[0],
        serialNumber: '',
        status: 'active',
        notes: ''
      });
    } catch (err) {
      console.error('Error saving asset:', err);
    }
  };

  const handleDeleteItem = async (col: string, id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete this item?')) return;
    try {
      await deleteDoc(doc(db, col, id));
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">وصول محظور</h2>
        <p className="text-sm text-slate-400">قسم الشؤون المالية الشخصية خاص بالمشرف العام فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isRTL ? 'ماليتي الخاصة (My Finances)' : 'Personal Finances & Assets'}
            </h1>
            <p className="text-xs text-slate-400">
              {isRTL ? 'إدارة الدخل الشخصي، المصاريف، المخزون، والأصول الخاصة بجعفر بدران' : 'Personal income, expenses, inventory, and equipment management'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsIncomeModalOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isRTL ? 'دخل شخصي' : '+ Income'}</span>
          </button>

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isRTL ? 'مصروف شخصي' : '+ Expense'}</span>
          </button>

          <button
            onClick={() => setIsInventoryModalOpen(true)}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer"
          >
            <Package className="w-3.5 h-3.5" />
            <span>{isRTL ? 'مخزون' : '+ Inventory'}</span>
          </button>

          <button
            onClick={() => setIsAssetModalOpen(true)}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>{isRTL ? 'أصل/عتاد' : '+ Asset'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-medium">
        {[
          { id: 'overview', label: isRTL ? 'نظرة عامة والمدخرات' : 'Overview & Savings', icon: Wallet },
          { id: 'income', label: isRTL ? 'الدخل الشخصي' : 'Personal Income', icon: TrendingUp },
          { id: 'expenses', label: isRTL ? 'المصاريف الشخصية' : 'Personal Expenses', icon: TrendingDown },
          { id: 'inventory', label: isRTL ? 'المخزون والقطع' : 'Inventory', icon: Package },
          { id: 'assets', label: isRTL ? 'العتاد والأصول' : 'Personal Assets', icon: Laptop },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-white border border-slate-700 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Overview Cards */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Personal Income */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>{isRTL ? 'إجمالي الدخل الشخصي' : 'Total Personal Income'}</span>
                <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                ${totals.totalIncomeUSD.toLocaleString()}
              </div>
              {totals.totalIncomeSYP > 0 && (
                <div className="text-xs font-mono text-slate-400 mt-1">
                  {totals.totalIncomeSYP.toLocaleString()} SYP
                </div>
              )}
            </div>

            {/* Total Personal Expenses */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>{isRTL ? 'إجمالي المصاريف الشخصية' : 'Total Personal Expenses'}</span>
                <div className="p-2 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-800/40">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-rose-400 font-mono">
                ${totals.totalExpUSD.toLocaleString()}
              </div>
              {totals.totalExpSYP > 0 && (
                <div className="text-xs font-mono text-slate-400 mt-1">
                  {totals.totalExpSYP.toLocaleString()} SYP
                </div>
              )}
            </div>

            {/* Inventory & Stock Value */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>{isRTL ? 'قيمة المخزون الإجمالية' : 'Inventory Value'}</span>
                <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/40">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-amber-400 font-mono">
                ${totals.inventoryValueUSD.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {inventory.length} {isRTL ? 'عنصر مسجل' : 'items in stock'}
              </div>
            </div>

            {/* Personal Assets Portfolio */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>{isRTL ? 'قيمة الأصول والعتاد' : 'Assets Value'}</span>
                <div className="p-2 rounded-lg bg-purple-950/60 text-purple-400 border border-purple-800/40">
                  <Laptop className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-purple-400 font-mono">
                ${totals.assetValueUSD.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {assets.length} {isRTL ? 'أصل تقني ومكتبي' : 'active assets'}
              </div>
            </div>

          </div>

          {/* Net Cashflow & Net Worth Box */}
          <div className="bg-gradient-to-r from-indigo-950/40 to-purple-950/40 border border-indigo-500/20 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-indigo-400 mb-1">
                {isRTL ? 'صافي السيولة والمدخرات النقدية' : 'Net Cash Savings'}
              </div>
              <div className="text-3xl font-bold text-white font-mono">
                ${totals.netUSD.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isRTL ? 'الفائض النقدي الشخصي بعد احتساب النفقات' : 'Personal cash surplus after expenses'}
              </p>
            </div>

            <div className="text-right sm:border-s sm:border-slate-800 sm:ps-8">
              <div className="text-xs uppercase font-bold tracking-wider text-purple-400 mb-1">
                {isRTL ? 'القيمة الصافية الكلية (Net Worth)' : 'Estimated Net Worth'}
              </div>
              <div className="text-3xl font-bold text-purple-300 font-mono">
                ${totals.totalNetWorthUSD.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {isRTL ? 'تشمل السيولة النقدية + الأصول + المخزون' : 'Includes Cash + Assets + Inventory'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Income Tab */}
      {activeTab === 'income' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <h3 className="font-bold text-white text-sm">
              {isRTL ? 'سجلات الدخل الشخصي' : 'Personal Income Records'}
            </h3>
            <span className="text-xs font-mono text-slate-400">{incomes.length} {isRTL ? 'سجل' : 'records'}</span>
          </div>

          <div className="space-y-3">
            {incomes.length > 0 ? (
              incomes.map(inc => (
                <div key={inc.id} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{inc.title}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                      <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-medium">{inc.source}</span>
                      <span>•</span>
                      <span>{inc.incomeDate}</span>
                      {inc.paymentMethod && <span>• {inc.paymentMethod}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="font-bold text-emerald-400 font-mono text-sm">
                      +{inc.amount.toLocaleString()} {inc.currency}
                    </div>
                    <button 
                      onClick={() => handleDeleteItem('personal_income', inc.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                {isRTL ? 'لا توجد مصادر دخل شخصية مسجلة.' : 'No income records found.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <h3 className="font-bold text-white text-sm">
              {isRTL ? 'سجلات المصاريف الشخصية' : 'Personal Expenses Records'}
            </h3>
            <span className="text-xs font-mono text-slate-400">{expenses.length} {isRTL ? 'سجل' : 'records'}</span>
          </div>

          <div className="space-y-3">
            {expenses.length > 0 ? (
              expenses.map(exp => (
                <div key={exp.id} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{exp.title}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                      <span className="bg-rose-950 text-rose-400 px-2 py-0.5 rounded font-medium">{exp.category}</span>
                      <span>•</span>
                      <span>{exp.expenseDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="font-bold text-rose-400 font-mono text-sm">
                      -{exp.amount.toLocaleString()} {exp.currency}
                    </div>
                    <button 
                      onClick={() => handleDeleteItem('personal_expenses', exp.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                {isRTL ? 'لا توجد مصاريف شخصية مسجلة.' : 'No personal expenses found.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <h3 className="font-bold text-white text-sm">
              {isRTL ? 'المخزون والقطع والأجهزة' : 'Inventory & Equipment Stock'}
            </h3>
            <span className="text-xs font-mono text-slate-400">{inventory.length} {isRTL ? 'عنصر' : 'items'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.length > 0 ? (
              inventory.map(item => (
                <div key={item.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between text-xs space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 text-sm">{item.name}</span>
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono">
                        {item.condition}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {isRTL ? 'الكمية:' : 'Qty:'} <span className="font-mono text-white">{item.quantity}</span> • {item.location || 'Office'}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-500">{isRTL ? 'القيمة الحالية' : 'Current Value'}</div>
                      <div className="font-mono font-bold text-amber-400">
                        ${(item.currentValue * item.quantity).toLocaleString()} {item.currency}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteItem('inventory', item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full p-8 text-center text-slate-500 text-xs">
                {isRTL ? 'لا توجد قطع مخزون مسجلة.' : 'No inventory items registered.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assets Tab */}
      {activeTab === 'assets' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <h3 className="font-bold text-white text-sm">
              {isRTL ? 'الأصول والعتاد التقني' : 'Personal & Technical Assets'}
            </h3>
            <span className="text-xs font-mono text-slate-400">{assets.length} {isRTL ? 'أصل' : 'assets'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.length > 0 ? (
              assets.map(asset => (
                <div key={asset.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between text-xs space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 text-sm">{asset.name}</span>
                      <span className="bg-purple-950 text-purple-300 px-2 py-0.5 rounded text-[10px] font-mono">
                        {asset.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {asset.purchaseDate} {asset.serialNumber && `• SN: ${asset.serialNumber}`}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-500">{isRTL ? 'القيمة التقديرية' : 'Estimated Value'}</div>
                      <div className="font-mono font-bold text-purple-400">
                        ${asset.value.toLocaleString()} {asset.currency}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteItem('assets', asset.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full p-8 text-center text-slate-500 text-xs">
                {isRTL ? 'لا توجد أصول مسجلة.' : 'No assets registered.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Income Modal */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">{isRTL ? 'إضافة دخل شخصي' : 'Add Personal Income'}</h3>
              <button onClick={() => setIsIncomeModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveIncome} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">{isRTL ? 'مصدر الدخل / العنوان' : 'Title'}</label>
                <input
                  type="text"
                  required
                  value={incomeForm.title}
                  onChange={e => setIncomeForm({ ...incomeForm, title: e.target.value })}
                  placeholder="استشارة تقنية، عائد إعلاني..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">{isRTL ? 'المبلغ' : 'Amount'}</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={incomeForm.amount || ''}
                    onChange={e => setIncomeForm({ ...incomeForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">{isRTL ? 'العملة' : 'Currency'}</label>
                  <select
                    value={incomeForm.currency}
                    onChange={e => setIncomeForm({ ...incomeForm, currency: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="USD">USD</option>
                    <option value="SYP">SYP</option>
                    <option value="EUR">EUR</option>
                    <option value="AED">AED</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsIncomeModalOpen(false)} className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300">
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold">
                  {isRTL ? 'حفظ الدخل' : 'Save Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">{isRTL ? 'إضافة مصروف شخصي' : 'Add Personal Expense'}</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">{isRTL ? 'بند المصروف' : 'Title'}</label>
                <input
                  type="text"
                  required
                  value={expenseForm.title}
                  onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  placeholder="معدات شخصية، تدريب، سفر..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">{isRTL ? 'المبلغ' : 'Amount'}</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={expenseForm.amount || ''}
                    onChange={e => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">{isRTL ? 'العملة' : 'Currency'}</label>
                  <select
                    value={expenseForm.currency}
                    onChange={e => setExpenseForm({ ...expenseForm, currency: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="USD">USD</option>
                    <option value="SYP">SYP</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300">
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-rose-600 text-white font-semibold">
                  {isRTL ? 'حفظ المصروف' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Inventory Modal */}
      {isInventoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">{isRTL ? 'إضافة عنصر للمخزون' : 'Add Inventory Item'}</h3>
              <button onClick={() => setIsInventoryModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveInventory} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">{isRTL ? 'اسم العنصر' : 'Item Name'}</label>
                <input
                  type="text"
                  required
                  value={inventoryForm.name}
                  onChange={e => setInventoryForm({ ...inventoryForm, name: e.target.value })}
                  placeholder="شاشات، كابلات، هارد ديسك..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">{isRTL ? 'الكمية' : 'Quantity'}</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={inventoryForm.quantity}
                    onChange={e => setInventoryForm({ ...inventoryForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">{isRTL ? 'القيمة التقديرية للقطعة' : 'Value/Unit'}</label>
                  <input
                    type="number"
                    required
                    value={inventoryForm.currentValue || ''}
                    onChange={e => setInventoryForm({ ...inventoryForm, currentValue: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsInventoryModalOpen(false)} className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300">
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-amber-600 text-white font-semibold">
                  {isRTL ? 'حفظ بالمخزون' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">{isRTL ? 'تسجيل أصل أو عتاد تقني' : 'Add Tech Asset'}</h3>
              <button onClick={() => setIsAssetModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveAsset} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">{isRTL ? 'اسم الأصل / الجهاز' : 'Asset Name'}</label>
                <input
                  type="text"
                  required
                  value={assetForm.name}
                  onChange={e => setAssetForm({ ...assetForm, name: e.target.value })}
                  placeholder="MacBook Pro M3, iPhone 15 Pro, Dell Server..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">{isRTL ? 'النوع / التصنيف' : 'Category'}</label>
                  <select
                    value={assetForm.category}
                    onChange={e => setAssetForm({ ...assetForm, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="laptop">{isRTL ? 'حاسوب محمول' : 'Laptop'}</option>
                    <option value="phone">{isRTL ? 'هاتف ذكي' : 'Phone'}</option>
                    <option value="camera">{isRTL ? 'كاميرا وتصوير' : 'Camera'}</option>
                    <option value="server">{isRTL ? 'سيرفر وتجهيزات' : 'Server'}</option>
                    <option value="office_equipment">{isRTL ? 'عتاد مكتبي' : 'Office Equipment'}</option>
                    <option value="other">{isRTL ? 'أخرى' : 'Other'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">{isRTL ? 'القيمة التقديرية ($)' : 'Value ($)'}</label>
                  <input
                    type="number"
                    required
                    value={assetForm.value || ''}
                    onChange={e => setAssetForm({ ...assetForm, value: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsAssetModalOpen(false)} className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300">
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-purple-600 text-white font-semibold">
                  {isRTL ? 'حفظ الأصل' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
