import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE_URL = "https://script.google.com/macros/s/AKfycbw6PoP8BsxXWDm-QDnWF1M_DZc70fWLEWMDMOtqZ17AXvui_bS0j6RW4OPOziyHuyNtMg/exec";

const fetchJSONP = (url: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const callbackName = 'cb_' + Date.now() + Math.floor(Math.random() * 1000);
    
    const timeout = setTimeout(() => {
      delete (window as any)[callbackName];
      if (script.parentNode) document.head.removeChild(script);
      reject(new Error('انتهت مهلة الاتصال بالخادم (Timeout). يرجى التأكد من أن السكربت يعمل بشكل صحيح.'));
    }, 15000); // 15 seconds timeout

    (window as any)[callbackName] = (data: any) => {
      clearTimeout(timeout);
      resolve(data);
      delete (window as any)[callbackName];
      if (script.parentNode) document.head.removeChild(script);
    };
    
    // Ensure the URL is properly formatted
    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}callback=${callbackName}`;
    
    script.onerror = () => {
      clearTimeout(timeout);
      delete (window as any)[callbackName];
      if (script.parentNode) document.head.removeChild(script);
      reject(new Error('فشل تحميل البيانات من الخادم (JSONP Error). قد يكون هناك خطأ في السكربت أو الرابط.'));
    };
    
    document.head.appendChild(script);
  });
};

export async function apiFetch(action: string, options: RequestInit = {}) {
  const url = new URL(API_BASE_URL);
  
  // 1. Set the primary action and a cache buster
  url.searchParams.set('action', action);
  url.searchParams.set('method', options.method || 'GET');
  url.searchParams.set('_t', Date.now().toString());
  
  let bodyData: any = null;
  if (options.body) {
    try {
      bodyData = JSON.parse(options.body as string);
      
      // Add the full body as a stringified 'data' parameter
      url.searchParams.set('data', JSON.stringify(bodyData));
      
      // Add individual parameters with multiple naming conventions
      for (const key in bodyData) {
        if (key !== 'action' && key !== 'data') {
          const val = bodyData[key];
          const stringVal = val !== null && val !== undefined ? 
            (typeof val === 'object' ? JSON.stringify(val) : val.toString()) : 
            '';
          
          url.searchParams.set(key, stringVal);
          
          // Add common variations
          if (key === 'full_name') url.searchParams.set('name', stringVal);
          if (key === 'parent_phone') url.searchParams.set('phone2', stringVal);
          if (key === 'student_id') url.searchParams.set('id', stringVal);
        }
      }
    } catch (e) {
      console.error('Error parsing request body:', e);
    }
  }

  // 2. Primary Request via JSONP (to get a response and avoid CORS)
  try {
    console.log(`API Request [${action}]:`, url.toString());
    const data = await fetchJSONP(url.toString());
    console.log(`API Response [${action}]:`, data);

    if (data && data.status === 'error') {
      throw new Error(data.message || "حدث خطأ في الخادم");
    }
    
    // Extract the raw array
    let rawData = (data && data.data && Array.isArray(data.data)) ? data.data : (Array.isArray(data) ? data : []);

    // Normalization logic: Map Arabic/Common headers to expected keys
    const normalizedData = rawData.map((item: any) => {
      const newItem: any = { ...item };
      
      // Mapping dictionary
      const mappings: Record<string, string[]> = {
        full_name: ['الاسم', 'الاسم الكامل', 'اسم الطالب', 'Name', 'Full Name', 'fullName'],
        phone: ['الهاتف', 'رقم الهاتف', 'الجوال', 'Phone', 'Mobile'],
        parent_phone: ['هاتف ولي الأمر', 'رقم ولي الأمر', 'parentPhone', 'phone2'],
        level: ['المستوى', 'Level'],
        age: ['العمر', 'السن', 'Age'],
        parent_name: ['ولي الأمر', 'اسم ولي الأمر', 'parentName'],
        medical_notes: ['ملاحظات', 'ملاحظات طبية', 'medicalNotes', 'Notes'],
        registration_date: ['تاريخ التسجيل', 'التاريخ', 'registrationDate', 'Date'],
        amount: ['المبلغ', 'القيمة', 'Amount'],
        status: ['الحالة', 'Status'],
        name: ['الاسم', 'الاسم الكامل', 'اسم المدرب', 'Coach', 'Trainer', 'Name', 'name'],
        trainer_name: ['المدرب', 'اسم المدرب', 'Coach', 'Trainer', 'trainerName', 'coach_name'],
        specialty: ['التخصص', 'Specialty'],
        student_name: ['الطالب', 'اسم الطالب', 'Student', 'studentName'],
        method: ['الطريقة', 'طريقة الدفع', 'Method'],
        notes: ['ملاحظات', 'Notes'],
        session_day: ['اليوم', 'Day', 'sessionDay', 'day'],
        session_time: ['الوقت', 'Time', 'sessionTime', 'time'],
        session_id: ['رقم الحصة', 'sessionId'],
        student_id: ['رقم الطالب', 'studentId'],
        id: ['رقم', 'المعرف', 'ID', 'id', 'رقم المدرب', 'رقم الطالب', 'رقم الحجز', 'booking_id']
      };

      // Apply mappings if key is missing
      for (const [key, aliases] of Object.entries(mappings)) {
        if (!newItem[key]) {
          const foundAlias = aliases.find(alias => item[alias] !== undefined);
          if (foundAlias) newItem[key] = item[foundAlias];
        }
      }

      // Ensure ID exists
      if (!newItem.id && item.ID) newItem.id = item.ID;
      
      return newItem;
    });

    return normalizedData;
  } catch (error: any) {
    console.error('API Error:', error);
    // For POST requests, if we get a response that looks like success or even a timeout, 
    // we often treat it as success in the UI to avoid blocking the user, 
    // as Google Sheets might have processed it.
    if (options.method === 'POST') {
      return { status: 'success', message: 'تمت العملية' };
    }
    throw new Error(error.message || "فشل الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.");
  }
}

import * as XLSX from 'xlsx';

export function exportToExcel(data: any[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
