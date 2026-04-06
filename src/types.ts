export interface Student {
  id: number;
  full_name: string;
  age: number;
  level: 'مبتدئ' | 'متوسط' | 'متقدم' | 'احترافي';
  parent_name: string;
  phone: string;
  parent_phone?: string;
  medical_notes: string;
  registration_date: string;
}

export interface Coach {
  id: number;
  name: string;
  trainer_name?: string;
  phone: string;
  specialty: string;
  status: 'نشط' | 'غير نشط';
}

export interface Session {
  id: number;
  coach_id: number;
  coach_name?: string;
  trainer_name?: string;
  day: 'السبت' | 'الأحد' | 'الاثنين' | 'الثلاثاء' | 'الأربعاء' | 'الخميس' | 'الجمعة';
  start_time: string;
  end_time: string;
  max_capacity: number;
  required_level: string;
}

export interface Booking {
  id: number;
  student_id: number;
  student_name?: string;
  session_id: number;
  date: string;
  status: 'محجوز' | 'حضر' | 'غائب' | 'ملغي';
  coach_name?: string;
  trainer_name?: string;
  session_day?: string;
  session_time?: string;
  day?: string;
  start_time?: string;
  end_time?: string;
}

export interface Payment {
  id: number;
  student_id: number;
  student_name?: string;
  amount: number;
  date: string;
  method: 'نقدي' | 'تحويل';
  notes: string;
}
