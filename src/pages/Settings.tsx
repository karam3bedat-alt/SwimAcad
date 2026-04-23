import React from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, CreditCard, Phone, Building2, Layers, Plus, Trash2 } from 'lucide-react';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import { toast } from 'react-hot-toast';
import { useI18n } from '../lib/LanguageContext';
import { DEFAULT_COURSE_PRICES, PaymentConfig } from '../services/paymentService';
import { AppSettings } from '../types';

export default function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { t, language } = useI18n();

  const [showAddCourse, setShowAddCourse] = React.useState(false);
  const [newCourseName, setNewCourseName] = React.useState('');
  const [newCoursePrice, setNewCoursePrice] = React.useState('');
  const [customCourses, setCustomCourses] = React.useState<string[]>([]);
  const [coursePricesDraft, setCoursePricesDraft] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (settings?.payment_config?.coursePrices) {
      setCoursePricesDraft(settings.payment_config.coursePrices);
      const defaultKeys = Object.keys(DEFAULT_COURSE_PRICES);
      const customKeys = Object.keys(settings.payment_config.coursePrices).filter(k => !defaultKeys.includes(k));
      setCustomCourses(customKeys);
    } else {
      setCoursePricesDraft(DEFAULT_COURSE_PRICES);
    }
  }, [settings]);

  const handleAddCourse = () => {
    if (newCourseName && newCoursePrice) {
      const price = Number(newCoursePrice);
      setCustomCourses(prev => [...prev, newCourseName]);
      setCoursePricesDraft(prev => ({ ...prev, [newCourseName]: price }));
      setNewCourseName('');
      setNewCoursePrice('');
      setShowAddCourse(false);
    }
  };

  const handlePriceChange = (course: string, price: number) => {
    setCoursePricesDraft(prev => ({ ...prev, [course]: price }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Use the draft state which contains all current values
    const finalCoursePrices = { ...coursePricesDraft };

    const updatedSettings: Partial<AppSettings> = {
      payment_config: {
        ...(settings?.payment_config || {}),
        bitPhone: formData.get('bitPhone') as string,
        payboxPhone: formData.get('payboxPhone') as string,
        bankAccount: formData.get('bankAccount') as string,
        bankName: formData.get('bankName') as string,
        academyName: formData.get('academyName') as string,
        academyPhone: formData.get('academyPhone') as string || (settings?.payment_config?.academyPhone || ''),
        coursePrices: finalCoursePrices
      },
      last_updated: new Date().toISOString()
    };

    try {
      await updateSettings.mutateAsync(updatedSettings);
      toast.success(language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'ההגדרות נשמרו בהצלחה');
    } catch (err: any) {
      toast.error(err.message || (language === 'ar' ? 'فشل حفظ الإعدادات' : 'שגיאה בשמירת ההגדרות'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RefreshCw className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const config = settings?.payment_config;
  const currentPrices = config?.coursePrices || DEFAULT_COURSE_PRICES;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <SettingsIcon className="text-blue-600" />
            {t('settings')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">إدارة معلومات الأكاديمية والأسعار وإعدادات الدفع.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Course Prices section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2 text-blue-600 font-bold">
              <Layers size={20} />
              <h3>إدارة أسعار الدورات</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAddCourse(true)}
              className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 transition-colors flex items-center gap-1"
            >
              <Plus size={14} />
              إضافة دورة جديدة
            </button>
          </div>
          
          {showAddCourse && (
            <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">اسم الدورة الجديدة</label>
                  <input 
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="مثال: دورة الكبار"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">السعر الافتراضي</label>
                  <div className="relative">
                    <input 
                      value={newCoursePrice}
                      onChange={(e) => setNewCoursePrice(e.target.value)}
                      type="number"
                      placeholder="₪"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCourse(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAddCourse}
                  disabled={!newCourseName}
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  إضافة
                </button>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(DEFAULT_COURSE_PRICES).map(([course, defaultPrice]) => (
              <div key={course} className="space-y-1.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1">{course}</label>
                <div className="relative">
                  <input 
                    name={`price_${course}`}
                    type="number"
                    value={coursePricesDraft[course] !== undefined ? coursePricesDraft[course] : ''}
                    onChange={(e) => handlePriceChange(course, e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-4 pr-10 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₪</span>
                </div>
              </div>
            ))}
            {customCourses.map(course => (
              <div key={course} className="space-y-1.5 p-4 rounded-xl bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 relative group">
                <label className="text-sm font-bold text-blue-700 dark:text-blue-400 block mb-1">{course}</label>
                <button 
                  type="button"
                  onClick={() => {
                    setCustomCourses(prev => prev.filter(c => c !== course));
                    setCoursePricesDraft(prev => {
                      const next = { ...prev };
                      delete next[course];
                      return next;
                    });
                  }}
                  className="absolute left-2 top-2 p-1 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 rounded"
                >
                  <Trash2 size={12} />
                </button>
                <div className="relative">
                  <input 
                    name={`price_${course}`}
                    type="number"
                    value={coursePricesDraft[course] !== undefined ? coursePricesDraft[course] : ''}
                    onChange={(e) => handlePriceChange(course, e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-4 pr-10 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₪</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Academy Info section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-indigo-600 font-bold border-b border-slate-100 dark:border-slate-800 pb-4">
            <Building2 size={20} />
            <h3>معلومات الأكاديمية</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">اسم الأكاديمية</label>
              <input 
                name="academyName"
                defaultValue={config?.academyName || ''}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">رقم هاتف الأكاديمية</label>
              <input 
                name="academyPhone"
                defaultValue={config?.academyPhone || ''}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Payment Settings section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-emerald-600 font-bold border-b border-slate-100 dark:border-slate-800 pb-4">
            <CreditCard size={20} />
            <h3>إعدادات الدفع</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Phone size={14} /> رقم تطبيق Bit
              </label>
              <input 
                name="bitPhone"
                defaultValue={config?.bitPhone || ''}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200 text-left"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Phone size={14} /> رقم تطبيق PayBox
              </label>
              <input 
                name="payboxPhone"
                defaultValue={config?.payboxPhone || ''}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200 text-left"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">اسم البنك</label>
              <input 
                name="bankName"
                defaultValue={config?.bankName || ''}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">رقم الحساب البنكي</label>
              <input 
                name="bankAccount"
                defaultValue={config?.bankAccount || ''}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200 text-left"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end sticky bottom-4 z-10">
          <button 
            type="submit"
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50"
          >
            {updateSettings.isPending ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
            <span>حفظ جميع التغييرات</span>
          </button>
        </div>
      </form>
    </div>
  );
}
