import React, { useState, useEffect } from 'react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ClientRecord } from '../../types';
import { logAuditAndEvent } from '../../lib/audit';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MessageCircle, 
  Building, 
  Layers, 
  Edit3, 
  X,
  ExternalLink
} from 'lucide-react';

interface ClientsModuleProps {
  onSelectClient?: (clientId: string) => void;
}

export const ClientsModule: React.FC<ClientsModuleProps> = () => {
  const { t, isRTL } = useI18n();
  const { userProfile, canEdit } = useAuth();

  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClientRecord)));
      setLoading(false);
    }, (err) => {
      console.warn('Clients snapshot fallback:', err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !userProfile) return;

    try {
      const docRef = await addDoc(collection(db, 'clients'), {
        name: name.trim(),
        company: company.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        email: email.trim(),
        notes: notes.trim(),
        caseCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await logAuditAndEvent({
        action: 'CREATE_CLIENT',
        details: `إضافة عميل جديد: ${name}`,
        entityType: 'case',
        entityId: docRef.id,
        entityTitle: name,
        user: userProfile
      });

      setName('');
      setCompany('');
      setPhone('');
      setWhatsapp('');
      setEmail('');
      setNotes('');
      setShowAddModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span>{t('navClients')}</span>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
              {filtered.length}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isRTL ? 'سجل العملاء والشركات وأصحاب القضايا' : 'Directory of clients, businesses, and case requesters'}
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isRTL ? 'إضافة عميل' : 'Add Client'}</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isRTL ? 'ابحث عن اسم عميل، شركة، هاتف...' : 'Search clients by name, company, phone...'}
          className="w-full bg-slate-900/90 border border-slate-800 rounded-xl ps-10 pe-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-mono">
          {isRTL ? 'جارٍ تحميل العملاء...' : 'Loading clients...'}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
          {t('noClientsFound')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <div key={client.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{client.name}</h3>
                  {client.company && (
                    <p className="text-xs text-cyan-400 flex items-center gap-1 mt-0.5">
                      <Building className="w-3 h-3" />
                      <span>{client.company}</span>
                    </p>
                  )}
                </div>
                <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-800 flex items-center justify-center font-bold text-cyan-400 text-xs">
                  {client.name.charAt(0)}
                </div>
              </div>

              {/* Contacts */}
              <div className="space-y-1.5 text-xs pt-2 border-t border-slate-800/80 text-slate-300">
                {client.phone && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                      <span className="font-mono">{client.phone}</span>
                    </span>
                    {client.whatsapp && (
                      <a
                        href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                )}
                {client.email && (
                  <p className="flex items-center gap-1.5 text-slate-400">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{client.email}</span>
                  </p>
                )}
              </div>

              {client.notes && (
                <p className="text-[11px] text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800/50 line-clamp-2">
                  {client.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>{isRTL ? 'إضافة عميل جديد' : 'Add New Client'}</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClient} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'اسم العميل' : 'Client Name'} *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'الشركة / الجهة' : 'Company'}</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'الهاتف' : 'Phone'}</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'رقم الواتساب' : 'WhatsApp'}</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+964..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'البريد الإلكتروني' : 'Email'}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
