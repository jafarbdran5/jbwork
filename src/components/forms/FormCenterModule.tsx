import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { db } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  FormDefinition, 
  FormField, 
  FormFieldType, 
  FormResponseItem, 
  RecruitmentApplicant, 
  InitiativeItem, 
  FormCategory,
  FormDestination
} from '../../types';
import { 
  FileText, 
  Plus, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  ExternalLink, 
  Users, 
  Lightbulb, 
  BarChart3, 
  FolderPlus, 
  Share2, 
  Copy, 
  Check, 
  Layers, 
  ArrowRight, 
  Filter, 
  Search, 
  Settings2, 
  UserPlus, 
  ThumbsUp, 
  Download,
  Link,
  ChevronDown,
  Eye,
  Sliders
} from 'lucide-react';
import { logAuditAndEvent } from '../../lib/audit';

// Pre-built Form Templates
const FORM_TEMPLATES: {
  id: string;
  category: FormCategory;
  destination: FormDestination;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  fields: FormField[];
}[] = [
  {
    id: 'recruitment_default',
    category: 'recruitment',
    destination: 'recruitment',
    titleAr: 'طلب توظيف وانضمام للفريق',
    titleEn: 'Job Application & Recruitment',
    descAr: 'نموذج استقبال طلبات التوظيف والخبرات والسيرة الذاتية وربطها تلقائياً بمركز التوظيف',
    descEn: 'Applicant intake for team recruitment, portfolio, CV, and evaluation pipeline',
    fields: [
      { id: 'f1', label: 'Full Name', labelAr: 'الاسم الثلاثي', type: 'short_text', required: true },
      { id: 'f2', label: 'Phone Number (WhatsApp)', labelAr: 'رقم الهاتف (واتساب)', type: 'phone', required: true },
      { id: 'f3', label: 'Email Address', labelAr: 'البريد الإلكتروني', type: 'email', required: true },
      { id: 'f4', label: 'Specialization / Role', labelAr: 'التخصص والمهنة', type: 'dropdown', required: true, options: ['أمن معلومات / Cyber Security', 'إدارة محتوى وتواصل / Social Media', 'تطوير برمجيات / Developer', 'استشارات ودعم فني / IT Support', 'تصميم / Designer', 'أخرى'] },
      { id: 'f5', label: 'Years of Experience', labelAr: 'سنوات الخبرة', type: 'number', required: true },
      { id: 'f6', label: 'Portfolio / Projects URL', labelAr: 'رابط معرض الأعمال أو المشاريع', type: 'url', required: false },
      { id: 'f7', label: 'CV & Cover Letter Link', labelAr: 'رابط السيرة الذاتية (Google Drive / PDF)', type: 'url', required: true },
      { id: 'f8', label: 'Expected Salary', labelAr: 'الراتب المتوقع', type: 'short_text', required: false },
      { id: 'f9', label: 'Availability to Start', labelAr: 'تاريخ الجاهزية للبدء', type: 'dropdown', required: true, options: ['فوراً', 'خلال أسبوع', 'خلال شهر'] }
    ]
  },
  {
    id: 'client_intake_default',
    category: 'client_intake',
    destination: 'case',
    titleAr: 'نموذج استقبال طلب عميل / بلاغ قضية',
    titleEn: 'Client Case Intake & Security Report',
    descAr: 'استقبال بلاغات الانتحال، الابتزاز، واستعادة الحسابات وتحويلها لقضايا فورية',
    descEn: 'Public or client form to report security incidents, impersonation, or take-downs',
    fields: [
      { id: 'ci1', label: 'Client / Contact Name', labelAr: 'اسم صاحب الطلب أو الشركة', type: 'short_text', required: true },
      { id: 'ci2', label: 'Phone / WhatsApp', labelAr: 'رقم التواصل واتساب', type: 'phone', required: true },
      { id: 'ci3', label: 'Email', labelAr: 'البريد الإلكتروني', type: 'email', required: false },
      { id: 'ci4', label: 'Issue Type', labelAr: 'نوع البلاغ أو المشكلة', type: 'dropdown', required: true, options: ['حساب منتحل', 'إزالة محتوى مسيء', 'اختراق حساب', 'قضية ابتزاز', 'استشارة أمنية', 'طلب عام'] },
      { id: 'ci5', label: 'Platform', labelAr: 'المنصة المعنية', type: 'dropdown', required: true, options: ['Instagram', 'Facebook', 'TikTok', 'X (Twitter)', 'Telegram', 'WhatsApp', 'YouTube', 'Google', 'أخرى'] },
      { id: 'ci6', label: 'Target Account / Post URL', labelAr: 'رابط الحساب أو المنشور المخالف', type: 'url', required: true },
      { id: 'ci7', label: 'Detailed Description', labelAr: 'تفاصيل الحالة وما تم اتخاذه سابقاً', type: 'long_text', required: true },
      { id: 'ci8', label: 'Urgency Level', labelAr: 'درجة الاستعجال', type: 'dropdown', required: true, options: ['عادي', 'متوسط', 'عاجل جداً / خطر'] }
    ]
  },
  {
    id: 'survey_satisfaction_default',
    category: 'survey',
    destination: 'survey',
    titleAr: 'استبيان تقييم رضا العملاء والأداء',
    titleEn: 'Client Satisfaction & Feedback Survey',
    descAr: 'استطلاع رأي لقياس رضا العميل عن سرعة التنفيذ وجودة الحلول الأمنية',
    descEn: 'Gauge client satisfaction, speed of execution, and service quality ratings',
    fields: [
      { id: 'sv1', label: 'Client Name / Case Reference', labelAr: 'اسم العميل أو رقم القضية', type: 'short_text', required: false },
      { id: 'sv2', label: 'Speed of Resolution Rating', labelAr: 'تقييم سرعة الاستجابة والحل (من 5)', type: 'rating', required: true, max: 5 },
      { id: 'sv3', label: 'Professionalism & Communication', labelAr: 'تقييم الاحترافية والتواصل (من 5)', type: 'rating', required: true, max: 5 },
      { id: 'sv4', label: 'Would you recommend us?', labelAr: 'هل تنصح بخدماتنا لمعارفك؟', type: 'yes_no', required: true },
      { id: 'sv5', label: 'Suggestions & Feedback', labelAr: 'ملاحظاتك ومقترحاتك للتحسين', type: 'long_text', required: false }
    ]
  },
  {
    id: 'initiative_submission_default',
    category: 'initiative',
    destination: 'initiative',
    titleAr: 'مقترح مبادرة أو مشروع تطويري',
    titleEn: 'Initiative & Project Proposal Form',
    descAr: 'استقبال أفكار المبادرات المجتمعية أو التقنية وعرضها للتصويت والاعتماد',
    descEn: 'Collect team or public initiative ideas for review, voting, and project conversion',
    fields: [
      { id: 'in1', label: 'Initiative Title', labelAr: 'عنوان المبادرة أو الفكرة', type: 'short_text', required: true },
      { id: 'in2', label: 'Submitted By', labelAr: 'مقدم المبادرة', type: 'short_text', required: true },
      { id: 'in3', label: 'Contact Info', labelAr: 'وسيلة التواصل (هاتف/إيميل)', type: 'short_text', required: true },
      { id: 'in4', label: 'Category', labelAr: 'تصنيف المبادرة', type: 'dropdown', required: true, options: ['توعية أمنية', 'تطوير تقني داخلي', 'أتمتة وذكاء اصطناعي', 'خدمة مجتمعية', 'أخرى'] },
      { id: 'in5', label: 'Goals & Description', labelAr: 'أهداف المبادرة والآلية المقترحة', type: 'long_text', required: true },
      { id: 'in6', label: 'Estimated Budget / Resources Needed', labelAr: 'الميزانية أو الموارد التقديرية', type: 'short_text', required: false }
    ]
  }
];

export const FormCenterModule: React.FC<{ onSelectCase?: (caseId: string) => void }> = ({ onSelectCase }) => {
  const { userProfile, isSuperAdmin } = useAuth();
  const { isRTL } = useI18n();

  const [activeTab, setActiveTab] = useState<'forms' | 'responses' | 'recruitment' | 'initiatives' | 'surveys'>('forms');
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [responses, setResponses] = useState<FormResponseItem[]>([]);
  const [applicants, setApplicants] = useState<RecruitmentApplicant[]>([]);
  const [initiatives, setInitiatives] = useState<InitiativeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form Builder Modal State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<FormCategory>('custom');
  const [formDestination, setFormDestination] = useState<FormDestination>('request');
  const [isPublic, setIsPublic] = useState(true);
  const [fields, setFields] = useState<FormField[]>([]);
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const [responseSheetUrl, setResponseSheetUrl] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live Test Response Modal
  const [testingForm, setTestingForm] = useState<FormDefinition | null>(null);
  const [testFormData, setTestFormData] = useState<Record<string, any>>({});
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  // Recruitment Applicant Modal
  const [selectedApplicant, setSelectedApplicant] = useState<RecruitmentApplicant | null>(null);

  // Load Realtime Data from Firestore
  useEffect(() => {
    // 1. Forms
    const unsubForms = onSnapshot(
      query(collection(db, 'forms'), orderBy('createdAt', 'desc')), 
      (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as FormDefinition));
        setForms(items);
        setIsLoading(false);
      }, 
      () => setIsLoading(false)
    );

    // 2. Responses
    const unsubResponses = onSnapshot(
      query(collection(db, 'form_responses'), orderBy('createdAt', 'desc')), 
      (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as FormResponseItem));
        setResponses(items);
      },
      () => {}
    );

    // 3. Recruitment Applicants
    const unsubApplicants = onSnapshot(
      query(collection(db, 'recruitment_applicants'), orderBy('createdAt', 'desc')), 
      (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as RecruitmentApplicant));
        setApplicants(items);
      },
      () => {}
    );

    // 4. Initiatives
    const unsubInitiatives = onSnapshot(
      query(collection(db, 'initiatives'), orderBy('createdAt', 'desc')), 
      (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as InitiativeItem));
        setInitiatives(items);
      },
      () => {}
    );

    return () => {
      unsubForms();
      unsubResponses();
      unsubApplicants();
      unsubInitiatives();
    };
  }, []);

  // Handle Load Template into Builder
  const handleApplyTemplate = (tmpl: typeof FORM_TEMPLATES[0]) => {
    setFormTitle(isRTL ? tmpl.titleAr : tmpl.titleEn);
    setFormDesc(isRTL ? tmpl.descAr : tmpl.descEn);
    setFormCategory(tmpl.category);
    setFormDestination(tmpl.destination);
    setFields(tmpl.fields.map(f => ({ ...f, id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` })));
    setIsBuilderOpen(true);
  };

  // Add Field to Builder
  const handleAddField = (type: FormFieldType = 'short_text') => {
    const newField: FormField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label: isRTL ? 'حقل جديد' : 'New Field',
      type,
      required: false,
      options: ['خيار 1', 'خيار 2']
    };
    setFields([...fields, newField]);
  };

  // Save Form Definition
  const handleSaveForm = async () => {
    if (!formTitle.trim()) return;

    const payload = {
      title: formTitle,
      titleAr: formTitle,
      description: formDesc,
      descriptionAr: formDesc,
      category: formCategory,
      isPublic,
      status: 'active' as const,
      fields,
      automation: {
        destination: formDestination,
        autoCreateClient: formDestination === 'case' || formDestination === 'client',
        autoCreateTask: false,
        notifyInApp: true
      },
      googleFormUrl: googleFormUrl.trim() || undefined,
      responseSheetUrl: responseSheetUrl.trim() || undefined,
      googleDriveFolderId: driveFolderUrl.trim() || undefined,
      updatedAt: serverTimestamp()
    };

    if (editingFormId) {
      await updateDoc(doc(db, 'forms', editingFormId), payload);
      await logAuditAndEvent({
        action: 'FORM_UPDATED',
        details: `Updated form definition: ${formTitle}`,
        entityType: 'settings',
        entityId: editingFormId,
        user: userProfile || undefined
      });
    } else {
      const docRef = await addDoc(collection(db, 'forms'), {
        ...payload,
        responsesCount: 0,
        createdBy: {
          uid: userProfile?.uid || 'super_admin',
          name: userProfile?.displayName || 'Jaafar Bdran'
        },
        createdAt: serverTimestamp()
      });
      await logAuditAndEvent({
        action: 'FORM_CREATED',
        details: `Created new dynamic form: ${formTitle} (${formCategory})`,
        entityType: 'settings',
        entityId: docRef.id,
        user: userProfile || undefined
      });
    }

    setIsBuilderOpen(false);
    resetBuilderState();
  };

  const resetBuilderState = () => {
    setEditingFormId(null);
    setFormTitle('');
    setFormDesc('');
    setFormCategory('custom');
    setFormDestination('request');
    setFields([]);
    setGoogleFormUrl('');
    setResponseSheetUrl('');
    setDriveFolderUrl('');
  };

  // Handle Response Submission (Automated Dispatch Engine)
  const handleSubmitTestResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testingForm) return;

    setIsSubmittingTest(true);
    try {
      // 1. Record Form Response
      const respPayload = {
        formId: testingForm.id,
        formTitle: testingForm.title,
        category: testingForm.category,
        destination: testingForm.automation.destination,
        data: testFormData,
        processed: true,
        submittedBy: {
          name: testFormData['الاسم الثلاثي'] || testFormData['اسم صاحب الطلب أو الشركة'] || testFormData['Full Name'] || testFormData['Client / Contact Name'] || userProfile?.displayName || 'Anonymous Responder',
          email: testFormData['البريد الإلكتروني'] || testFormData['Email Address'] || testFormData['Email'] || '',
          phone: testFormData['رقم الهاتف (واتساب)'] || testFormData['رقم التواصل واتساب'] || testFormData['Phone Number (WhatsApp)'] || ''
        },
        createdAt: serverTimestamp()
      };

      const respRef = await addDoc(collection(db, 'form_responses'), respPayload);

      // Increment form responses count
      await updateDoc(doc(db, 'forms', testingForm.id), {
        responsesCount: (testingForm.responsesCount || 0) + 1,
        lastResponseAt: serverTimestamp()
      });

      // 2. Automation Dispatch based on Form Category / Destination
      if (testingForm.automation.destination === 'recruitment' || testingForm.category === 'recruitment') {
        // Create Recruitment Applicant
        await addDoc(collection(db, 'recruitment_applicants'), {
          formId: testingForm.id,
          responseId: respRef.id,
          fullName: testFormData['الاسم الثلاثي'] || testFormData['Full Name'] || 'مرشح جديد',
          phone: testFormData['رقم الهاتف (واتساب)'] || testFormData['Phone Number (WhatsApp)'] || '',
          email: testFormData['البريد الإلكتروني'] || testFormData['Email Address'] || '',
          experienceYears: Number(testFormData['سنوات الخبرة'] || testFormData['Years of Experience']) || 0,
          specialization: testFormData['التخصص والمهنة'] || testFormData['Specialization / Role'] || 'عام',
          portfolioUrl: testFormData['رابط معرض الأعمال أو المشاريع'] || testFormData['Portfolio / Projects URL'] || '',
          cvFileUrl: testFormData['رابط السيرة الذاتية (Google Drive / PDF)'] || testFormData['CV & Cover Letter Link'] || '',
          salaryExpectation: testFormData['الراتب المتوقع'] || testFormData['Expected Salary'] || '',
          availability: testFormData['تاريخ الجاهزية للبدء'] || testFormData['Availability to Start'] || 'فوراً',
          status: 'new',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else if (testingForm.automation.destination === 'initiative' || testingForm.category === 'initiative') {
        // Create Initiative Item
        await addDoc(collection(db, 'initiatives'), {
          formId: testingForm.id,
          responseId: respRef.id,
          title: testFormData['عنوان المبادرة أو الفكرة'] || testFormData['Initiative Title'] || 'مبادرة جديدة',
          description: testFormData['أهداف المبادرة والآلية المقترحة'] || testFormData['Goals & Description'] || '',
          submittedBy: {
            name: testFormData['مقدم المبادرة'] || testFormData['Submitted By'] || 'مجهول',
            email: testFormData['وسيلة التواصل (هاتف/إيميل)'] || testFormData['Contact Info'] || ''
          },
          category: testFormData['تصنيف المبادرة'] || testFormData['Category'] || 'تطوير تقني',
          priority: 'medium',
          status: 'proposed',
          votesCount: 1,
          votedUserIds: [userProfile?.uid || 'super_admin'],
          budget: Number(testFormData['الميزانية أو الموارد التقديرية']) || 0,
          currency: 'USD',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else if (testingForm.automation.destination === 'case' || testingForm.category === 'client_intake') {
        // Create Case in Requests / Case Intake
        const caseNumber = `JB-2026-${Math.floor(100000 + Math.random() * 900000)}`;
        const clientName = testFormData['اسم صاحب الطلب أو الشركة'] || testFormData['Client / Contact Name'] || 'عميل وارد من النموذج';
        const clientPhone = testFormData['رقم التواصل واتساب'] || testFormData['Phone / WhatsApp'] || '';
        const caseType = testFormData['نوع البلاغ أو المشكلة'] || testFormData['Issue Type'] || 'استشارة عامة';
        const platform = testFormData['المنصة المعنية'] || testFormData['Platform'] || 'Instagram';
        const targetUrl = testFormData['رابط الحساب أو المنشور المخالف'] || testFormData['Target Account / Post URL'] || '';
        const desc = testFormData['تفاصيل الحالة وما تم اتخاذه سابقاً'] || testFormData['Detailed Description'] || '';

        await addDoc(collection(db, 'cases'), {
          caseNumber,
          title: `${caseType} - ${clientName}`,
          caseType: 'impersonation',
          platform,
          status: 'new',
          priority: 'high',
          client: {
            name: clientName,
            phone: clientPhone
          },
          typeSpecificData: {
            targetUrl
          },
          description: desc,
          notes: `تم إنشاؤها آلياً عبر الفورم: ${testingForm.title}`,
          isDeleted: false,
          createdBy: {
            uid: userProfile?.uid || 'system_automation',
            name: 'Form Automation'
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      setTestSuccess(true);
      setTimeout(() => {
        setTestSuccess(false);
        setTestingForm(null);
        setTestFormData({});
      }, 2000);
    } catch (err) {
      console.error('Error submitting form test:', err);
    } finally {
      setIsSubmittingTest(false);
    }
  };

  // Convert Applicant to Employee
  const handleAcceptApplicant = async (applicant: RecruitmentApplicant) => {
    try {
      await updateDoc(doc(db, 'recruitment_applicants', applicant.id), {
        status: 'accepted',
        evaluatedBy: userProfile?.displayName || 'Jaafar Bdran',
        updatedAt: serverTimestamp()
      });

      // Add to Authorized Users List in system
      await addDoc(collection(db, 'authorized_users'), {
        email: applicant.email.toLowerCase().trim(),
        displayName: applicant.fullName,
        phone: applicant.phone,
        role: 'employee',
        status: 'active',
        department: applicant.specialization,
        jobTitle: applicant.specialization,
        loginMethod: 'both',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await logAuditAndEvent({
        action: 'APPLICANT_CONVERTED_TO_EMPLOYEE',
        details: `Accepted applicant ${applicant.fullName} (${applicant.email}) and created employee account`,
        entityType: 'user',
        user: userProfile || undefined
      });

      setSelectedApplicant(null);
    } catch (err) {
      console.error('Error converting applicant:', err);
    }
  };

  // Upvote Initiative
  const handleVoteInitiative = async (init: InitiativeItem) => {
    const currentUid = userProfile?.uid || 'guest';
    const hasVoted = init.votedUserIds?.includes(currentUid);
    const updatedVotes = hasVoted ? (init.votesCount - 1) : (init.votesCount + 1);
    const updatedUids = hasVoted 
      ? (init.votedUserIds || []).filter(u => u !== currentUid)
      : [...(init.votedUserIds || []), currentUid];

    await updateDoc(doc(db, 'initiatives', init.id), {
      votesCount: updatedVotes,
      votedUserIds: updatedUids,
      updatedAt: serverTimestamp()
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#121214] border border-[#27272A] p-5 rounded-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {isRTL ? 'مركز النماذج الذكي والأتمتة' : 'Form Center & Automation Engine'}
              </h1>
              <span className="text-[11px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                PRO Dynamic
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              {isRTL 
                ? 'إنشاء وإدارة نماذج Google Forms، استبيانات الرأي، طلبات التوظيف، والمبادرات وربطها آلياً'
                : 'Create, manage and automate dynamic forms, recruitment pipelines, surveys, and initiatives'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSuperAdmin && (
            <button
              onClick={() => {
                resetBuilderState();
                setIsBuilderOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {isRTL ? 'إنشاء نموذج جديد' : 'Create New Form'}
            </button>
          )}
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-2 border-b border-[#27272A] pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('forms')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'forms'
              ? 'bg-indigo-600 text-white'
              : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
          }`}
        >
          <FileText className="w-4 h-4" />
          {isRTL ? 'النماذج المنشأة' : 'Forms List'} ({forms.length})
        </button>

        <button
          onClick={() => setActiveTab('recruitment')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'recruitment'
              ? 'bg-indigo-600 text-white'
              : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          {isRTL ? 'مركز التوظيف والانضمام' : 'Recruitment Pipeline'} ({applicants.length})
        </button>

        <button
          onClick={() => setActiveTab('initiatives')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'initiatives'
              ? 'bg-indigo-600 text-white'
              : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          {isRTL ? 'المبادرات والمقترحات' : 'Initiatives & Proposals'} ({initiatives.length})
        </button>

        <button
          onClick={() => setActiveTab('responses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'responses'
              ? 'bg-indigo-600 text-white'
              : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          {isRTL ? 'سجل الردود والتحويلات' : 'All Responses'} ({responses.length})
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: FORMS LIST & TEMPLATES GALLERY */}
      {/* ==================================================== */}
      {activeTab === 'forms' && (
        <div className="space-y-6">
          
          {/* Quick Pre-Built Templates Banner */}
          <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">
                  {isRTL ? 'قوالب نماذج Google وأتمتة جاهزة للتشغيل الفوري' : 'Pre-Built Google Form Templates with Auto-Routing'}
                </h3>
              </div>
              <span className="text-xs text-[#71717A]">
                {isRTL ? 'اضغط على أي قالب لبدء استخدامه وتخصيصه' : 'Click any template to customize'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {FORM_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="bg-[#121214] border border-[#27272A] hover:border-indigo-500/50 p-4 rounded-lg cursor-pointer transition-all hover:translate-y-[-2px] group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {tmpl.category}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#71717A] group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors mb-1 line-clamp-1">
                    {isRTL ? tmpl.titleAr : tmpl.titleEn}
                  </h4>
                  <p className="text-[11px] text-[#A1A1AA] line-clamp-2 leading-relaxed">
                    {isRTL ? tmpl.descAr : tmpl.descEn}
                  </p>
                  <div className="mt-3 pt-2 border-t border-[#27272A] flex items-center justify-between text-[10px] text-[#71717A]">
                    <span>{tmpl.fields.length} {isRTL ? 'حقول ذكية' : 'Fields'}</span>
                    <span className="text-emerald-400 font-medium">{isRTL ? 'أتمتة موجهة' : 'Auto Route'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Forms Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                {isRTL ? 'النماذج الفعالة والنماذج المخصصة' : 'Active System Forms'}
              </h3>
              <span className="text-xs text-[#A1A1AA]">
                {forms.length} {isRTL ? 'نماذج مسجلة' : 'Forms'}
              </span>
            </div>

            {forms.length === 0 ? (
              <div className="bg-[#121214] border border-[#27272A] rounded-xl p-12 text-center">
                <FileText className="w-12 h-12 text-[#52525B] mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-white mb-1">
                  {isRTL ? 'لا توجد نماذج مخصصة بعد' : 'No Forms Created Yet'}
                </h3>
                <p className="text-xs text-[#A1A1AA] max-w-md mx-auto mb-4">
                  {isRTL 
                    ? 'يمكنك البدء فوراً باختيار أحد القوالب الجاهزة أعلاه أو النقر على "إنشاء نموذج جديد"'
                    : 'Get started by selecting one of the ready templates above or create a custom form'}
                </p>
                <button
                  onClick={() => {
                    handleApplyTemplate(FORM_TEMPLATES[0]);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg cursor-pointer inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isRTL ? 'تشغيل نموذج التوظيف فوراً' : 'Deploy Recruitment Form'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {forms.map((f) => (
                  <div key={f.id} className="bg-[#121214] border border-[#27272A] hover:border-[#3F3F46] rounded-xl p-5 flex flex-col justify-between transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {f.category}
                        </span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-emerald-500/20">
                          {f.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-white mb-1">
                        {isRTL ? (f.titleAr || f.title) : f.title}
                      </h4>
                      <p className="text-xs text-[#A1A1AA] line-clamp-2 mb-4 leading-relaxed">
                        {isRTL ? (f.descriptionAr || f.description || 'لا يوجد وصف') : (f.description || 'No description')}
                      </p>

                      <div className="space-y-1.5 text-xs text-[#D4D4D8] bg-[#18181B] p-3 rounded-lg border border-[#27272A] mb-4">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#71717A]">{isRTL ? 'عدد الردود:' : 'Responses:'}</span>
                          <span className="font-semibold text-white">{f.responsesCount || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#71717A]">{isRTL ? 'الوجهة المؤتمتة:' : 'Auto Destination:'}</span>
                          <span className="font-semibold text-indigo-300 capitalize">{f.automation?.destination || 'request'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#71717A]">{isRTL ? 'عدد الحقول:' : 'Fields:'}</span>
                          <span className="text-[#A1A1AA]">{f.fields?.length || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#27272A] flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setTestingForm(f);
                          setTestFormData({});
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold rounded-lg border border-indigo-500/30 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {isRTL ? 'تعبئة وتجربة' : 'Fill & Test'}
                      </button>

                      {f.googleFormUrl && (
                        <a
                          href={f.googleFormUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-[#A1A1AA] hover:text-white hover:bg-[#27272A] rounded-lg transition-colors"
                          title="Open Google Form"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}

                      {isSuperAdmin && (
                        <button
                          onClick={async () => {
                            if (window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا النموذج؟' : 'Delete this form?')) {
                              await deleteDoc(doc(db, 'forms', f.id));
                            }
                          }}
                          className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: RECRUITMENT PIPELINE */}
      {/* ==================================================== */}
      {activeTab === 'recruitment' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#121214] border border-[#27272A] p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {isRTL ? 'خط أنابيب التوظيف والمتقدمين (Recruitment Pipeline)' : 'Recruitment Pipeline & Applicants'}
                </h3>
                <p className="text-xs text-[#A1A1AA]">
                  {isRTL ? 'المتقدمون الجدد، تقييم السير الذاتية، ومقابلات التوظيف والترقية لموظف معتمد' : 'Review applicant submissions, CVs, conduct interviews, and onboard new employees'}
                </p>
              </div>
            </div>
            <span className="text-xs bg-indigo-500/10 text-indigo-300 px-3 py-1 rounded-lg border border-indigo-500/20 font-semibold">
              {applicants.length} {isRTL ? 'مترشحين' : 'Applicants'}
            </span>
          </div>

          {applicants.length === 0 ? (
            <div className="bg-[#121214] border border-[#27272A] rounded-xl p-12 text-center">
              <Users className="w-10 h-10 text-[#52525B] mx-auto mb-2" />
              <p className="text-xs text-[#A1A1AA]">
                {isRTL ? 'لا يوجد طلبات توظيف واردة حالياً.' : 'No applicant submissions yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {applicants.map((app) => (
                <div key={app.id} className="bg-[#121214] border border-[#27272A] rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${
                        app.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        app.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        app.status === 'interview' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                        'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                      }`}>
                        {app.status}
                      </span>
                      <span className="text-[11px] text-[#71717A]">{app.experienceYears || 0} {isRTL ? 'سنوات خبرة' : 'yrs exp'}</span>
                    </div>

                    <h4 className="text-sm font-semibold text-white mb-0.5">{app.fullName}</h4>
                    <p className="text-xs text-indigo-400 font-medium mb-3">{app.specialization}</p>

                    <div className="space-y-1.5 text-xs text-[#A1A1AA] bg-[#18181B] p-3 rounded-lg border border-[#27272A] mb-4">
                      <div><span className="text-[#71717A]">{isRTL ? 'هاتف:' : 'Phone:'}</span> <span className="text-white">{app.phone}</span></div>
                      <div><span className="text-[#71717A]">{isRTL ? 'إيميل:' : 'Email:'}</span> <span className="text-white">{app.email}</span></div>
                      {app.salaryExpectation && (
                        <div><span className="text-[#71717A]">{isRTL ? 'الراتب المتوقع:' : 'Expected:'}</span> <span className="text-emerald-400 font-semibold">{app.salaryExpectation}</span></div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#27272A] flex items-center gap-2">
                    {app.cvFileUrl && (
                      <a
                        href={app.cvFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs rounded-lg transition-colors flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {isRTL ? 'السيرة الذاتية' : 'CV'}
                      </a>
                    )}

                    {isSuperAdmin && app.status !== 'accepted' && (
                      <button
                        onClick={() => handleAcceptApplicant(app)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isRTL ? 'قبول وتعيين كموظف' : 'Hire Employee'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: INITIATIVES & VOTING */}
      {/* ==================================================== */}
      {activeTab === 'initiatives' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#121214] border border-[#27272A] p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {isRTL ? 'منظومة المبادرات والمقترحات والتصويت الداخلي' : 'Initiatives & Collaborative Voting'}
                </h3>
                <p className="text-xs text-[#A1A1AA]">
                  {isRTL ? 'الأفكار والمبادرات المقترحة من الفريق والعملاء مع دعم التصويت والترقية لمشاريع' : 'Community and team initiatives with live upvoting and project conversion'}
                </p>
              </div>
            </div>
          </div>

          {initiatives.length === 0 ? (
            <div className="bg-[#121214] border border-[#27272A] rounded-xl p-12 text-center">
              <Lightbulb className="w-10 h-10 text-[#52525B] mx-auto mb-2" />
              <p className="text-xs text-[#A1A1AA]">
                {isRTL ? 'لا توجد مبادرات مسجلة حالياً.' : 'No initiative proposals found.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {initiatives.map((init) => {
                const hasVoted = init.votedUserIds?.includes(userProfile?.uid || '');
                return (
                  <div key={init.id} className="bg-[#121214] border border-[#27272A] rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {init.category}
                        </span>
                        <span className="text-xs text-[#71717A]">
                          {isRTL ? 'مقدم من:' : 'By:'} {init.submittedBy?.name}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white mb-2">{init.title}</h4>
                      <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4 whitespace-pre-wrap">
                        {init.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#27272A] flex items-center justify-between">
                      <button
                        onClick={() => handleVoteInitiative(init)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          hasVoted 
                            ? 'bg-amber-500 text-black font-bold'
                            : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A] border border-[#27272A]'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{init.votesCount || 0} {isRTL ? 'صوت' : 'Votes'}</span>
                      </button>

                      {isSuperAdmin && (
                        <button
                          onClick={async () => {
                            // Convert initiative to Project
                            await addDoc(collection(db, 'projects'), {
                              title: init.title,
                              description: init.description,
                              category: 'internal',
                              status: 'planning',
                              priority: 'medium',
                              team: [{ uid: userProfile?.uid || 'super_admin', name: userProfile?.displayName || 'Jaafar' }],
                              milestones: [],
                              createdAt: serverTimestamp(),
                              updatedAt: serverTimestamp(),
                              createdBy: { uid: userProfile?.uid || 'admin', name: userProfile?.displayName || 'Jaafar' }
                            });
                            await updateDoc(doc(db, 'initiatives', init.id), { status: 'approved' });
                            alert(isRTL ? 'تم تحويل المبادرة إلى مشروع رسمي بنجاح!' : 'Initiative converted to Project!');
                          }}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          {isRTL ? 'اعتماد وتحويل لمشروع' : 'Convert to Project'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: RESPONSES AUDIT LOG */}
      {/* ==================================================== */}
      {activeTab === 'responses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#121214] border border-[#27272A] p-4 rounded-xl">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              {isRTL ? 'سجل الردود والبيانات المستلمة من النماذج' : 'Received Form Responses & Auto-Conversions'}
            </h3>
            <span className="text-xs text-[#A1A1AA]">{responses.length} {isRTL ? 'ردود' : 'Responses'}</span>
          </div>

          {responses.length === 0 ? (
            <div className="bg-[#121214] border border-[#27272A] rounded-xl p-12 text-center">
              <p className="text-xs text-[#A1A1AA]">{isRTL ? 'لا يوجد ردود مسجلة بعد.' : 'No responses recorded yet.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {responses.map((resp) => (
                <div key={resp.id} className="bg-[#121214] border border-[#27272A] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{resp.formTitle}</span>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">
                        {resp.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#71717A]">
                      {resp.submittedBy?.name || 'Anonymous'}
                    </span>
                  </div>

                  <div className="bg-[#18181B] p-3 rounded-lg border border-[#27272A] text-xs font-mono text-[#D4D4D8] overflow-x-auto max-h-40">
                    <pre>{JSON.stringify(resp.data, null, 2)}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: FORM BUILDER MODAL */}
      {/* ==================================================== */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#121214] border border-[#27272A] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            
            <div className="p-5 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                {isRTL ? 'محرر ومصمم النماذج الذكية (Dynamic Form Builder)' : 'Dynamic Form Builder'}
              </h3>
              <button
                onClick={() => setIsBuilderOpen(false)}
                className="text-[#71717A] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Form Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    {isRTL ? 'عنوان النموذج' : 'Form Title'} *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder={isRTL ? 'مثال: نموذج التوظيف والأمن' : 'e.g. Security Incident Intake'}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                    {isRTL ? 'تصنيف النموذج' : 'Form Category'}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as FormCategory)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="recruitment">Recruitment / توظيف</option>
                    <option value="client_intake">Client Intake / طلب عميل</option>
                    <option value="survey">Survey / استبيان</option>
                    <option value="initiative">Initiative / مبادرة</option>
                    <option value="security_report">Security Report / بلاغ أمني</option>
                    <option value="feedback">Feedback / تقييم وملاحظات</option>
                    <option value="custom">Custom / مخصص</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
                  {isRTL ? 'وصف النموذج وإرشادات التعبئة' : 'Description & Instructions'}
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Destination Routing & Automation */}
              <div className="bg-[#18181B] border border-[#27272A] p-4 rounded-lg space-y-3">
                <h4 className="text-xs font-semibold text-indigo-300">
                  {isRTL ? 'قواعد الأتمتة والوجهة التلقائية للردود (Auto-Routing)' : 'Response Destination Automation'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#A1A1AA] mb-1">
                      {isRTL ? 'عند وصول الرد يتم تحويله إلى:' : 'Convert incoming response to:'}
                    </label>
                    <select
                      value={formDestination}
                      onChange={(e) => setFormDestination(e.target.value as FormDestination)}
                      className="w-full bg-[#121214] border border-[#27272A] rounded px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="recruitment">Recruitment Pipeline / مركز التوظيف</option>
                      <option value="case">Direct Case / فتح قضية فورية</option>
                      <option value="request">External Requests / طلب خارجي</option>
                      <option value="initiative">Initiatives / قائمة المبادرات</option>
                      <option value="survey">Survey Analytics / استبيان وتحليل</option>
                      <option value="task">Internal Task / مهمة عمل</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#A1A1AA] mb-1">
                      {isRTL ? 'رابط Google Form الخارجي (اختياري)' : 'Google Form URL (Optional)'}
                    </label>
                    <input
                      type="url"
                      value={googleFormUrl}
                      onChange={(e) => setGoogleFormUrl(e.target.value)}
                      placeholder="https://docs.google.com/forms/d/..."
                      className="w-full bg-[#121214] border border-[#27272A] rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Fields Builder */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-white">
                    {isRTL ? 'حقول النموذج المخصصة' : 'Form Fields'} ({fields.length})
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddField('short_text')}
                      className="px-2.5 py-1 bg-[#27272A] hover:bg-[#3F3F46] text-white text-[11px] rounded transition-colors cursor-pointer"
                    >
                      + {isRTL ? 'نص' : 'Text'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddField('long_text')}
                      className="px-2.5 py-1 bg-[#27272A] hover:bg-[#3F3F46] text-white text-[11px] rounded transition-colors cursor-pointer"
                    >
                      + {isRTL ? 'شرح طويل' : 'Long Text'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddField('dropdown')}
                      className="px-2.5 py-1 bg-[#27272A] hover:bg-[#3F3F46] text-white text-[11px] rounded transition-colors cursor-pointer"
                    >
                      + {isRTL ? 'قائمة منسدلة' : 'Dropdown'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddField('rating')}
                      className="px-2.5 py-1 bg-[#27272A] hover:bg-[#3F3F46] text-white text-[11px] rounded transition-colors cursor-pointer"
                    >
                      + {isRTL ? 'تقييم' : 'Rating'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {fields.map((field, idx) => (
                    <div key={field.id} className="bg-[#18181B] border border-[#27272A] p-3 rounded-lg flex items-center gap-3">
                      <span className="text-xs font-mono text-[#71717A] w-5">{idx + 1}</span>
                      
                      <input
                        type="text"
                        value={field.labelAr || field.label}
                        onChange={(e) => {
                          const updated = [...fields];
                          updated[idx].label = e.target.value;
                          updated[idx].labelAr = e.target.value;
                          setFields(updated);
                        }}
                        placeholder="اسم الحقل"
                        className="flex-1 bg-[#121214] border border-[#27272A] rounded px-2.5 py-1 text-xs text-white"
                      />

                      <select
                        value={field.type}
                        onChange={(e) => {
                          const updated = [...fields];
                          updated[idx].type = e.target.value as FormFieldType;
                          setFields(updated);
                        }}
                        className="bg-[#121214] border border-[#27272A] rounded px-2 py-1 text-xs text-white"
                      >
                        <option value="short_text">Short Text</option>
                        <option value="long_text">Long Text</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="url">URL</option>
                        <option value="number">Number</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="rating">Rating (1-5)</option>
                        <option value="yes_no">Yes / No</option>
                      </select>

                      <label className="flex items-center gap-1 text-[11px] text-[#A1A1AA] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => {
                            const updated = [...fields];
                            updated[idx].required = e.target.checked;
                            setFields(updated);
                          }}
                        />
                        {isRTL ? 'إلزامي' : 'Req'}
                      </label>

                      <button
                        type="button"
                        onClick={() => setFields(fields.filter((_, i) => i !== idx))}
                        className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="p-5 border-t border-[#27272A] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBuilderOpen(false)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveForm}
                disabled={!formTitle.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {isRTL ? 'حفظ ونشر النموذج' : 'Save & Deploy Form'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: LIVE TEST & SUBMISSION MODAL */}
      {/* ==================================================== */}
      {testingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#121214] border border-[#27272A] rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
            
            <div className="p-5 border-b border-[#27272A] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">{testingForm.title}</h3>
                <p className="text-xs text-[#A1A1AA]">{testingForm.description}</p>
              </div>
              <button
                onClick={() => setTestingForm(null)}
                className="text-[#71717A] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {testSuccess ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">{isRTL ? 'تم استلام وتوجيه الرد بنجاح!' : 'Response Submitted & Auto-Routed!'}</h4>
                <p className="text-xs text-[#A1A1AA]">
                  {isRTL ? `تم إدراج البيانات تلقائياً في الوجهة المخصصة: ${testingForm.automation.destination}` : 'Data dispatched to destination.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitTestResponse} className="p-6 space-y-4 overflow-y-auto flex-1">
                {testingForm.fields.map((f) => (
                  <div key={f.id}>
                    <label className="block text-xs font-medium text-white mb-1">
                      {f.labelAr || f.label} {f.required && <span className="text-rose-400">*</span>}
                    </label>

                    {f.type === 'long_text' ? (
                      <textarea
                        required={f.required}
                        value={testFormData[f.labelAr || f.label] || ''}
                        onChange={(e) => setTestFormData({ ...testFormData, [f.labelAr || f.label]: e.target.value })}
                        rows={3}
                        className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    ) : f.type === 'dropdown' ? (
                      <select
                        required={f.required}
                        value={testFormData[f.labelAr || f.label] || ''}
                        onChange={(e) => setTestFormData({ ...testFormData, [f.labelAr || f.label]: e.target.value })}
                        className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">{isRTL ? '-- اختر خياراً --' : '-- Select --'}</option>
                        {f.options?.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : f.type === 'rating' ? (
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            type="button"
                            key={val}
                            onClick={() => setTestFormData({ ...testFormData, [f.labelAr || f.label]: val })}
                            className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              testFormData[f.labelAr || f.label] === val
                                ? 'bg-amber-400 text-black'
                                : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
                            }`}
                          >
                            {val}★
                          </button>
                        ))}
                      </div>
                    ) : f.type === 'yes_no' ? (
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer">
                          <input
                            type="radio"
                            name={f.id}
                            checked={testFormData[f.labelAr || f.label] === 'نعم'}
                            onChange={() => setTestFormData({ ...testFormData, [f.labelAr || f.label]: 'نعم' })}
                          />
                          {isRTL ? 'نعم' : 'Yes'}
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer">
                          <input
                            type="radio"
                            name={f.id}
                            checked={testFormData[f.labelAr || f.label] === 'لا'}
                            onChange={() => setTestFormData({ ...testFormData, [f.labelAr || f.label]: 'لا' })}
                          />
                          {isRTL ? 'لا' : 'No'}
                        </label>
                      </div>
                    ) : (
                      <input
                        type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : f.type === 'number' ? 'number' : f.type === 'url' ? 'url' : 'text'}
                        required={f.required}
                        value={testFormData[f.labelAr || f.label] || ''}
                        onChange={(e) => setTestFormData({ ...testFormData, [f.labelAr || f.label]: e.target.value })}
                        className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    )}
                  </div>
                ))}

                <div className="pt-4 border-t border-[#27272A] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTestingForm(null)}
                    className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    {isRTL ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTest}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmittingTest ? (isRTL ? 'جاري الإرسال...' : 'Submitting...') : (isRTL ? 'إرسال الرد وتفعيل الأتمتة' : 'Submit & Route')}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
