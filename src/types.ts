export interface Student {
  id: string;
  full_name: string;
  age: number;
  level: string;
  course_type?: string;
  custom_fee?: number;
  parent_name: string;
  phone: string;
  parent_phone?: string;
  medical_notes: string;
  registration_date: string;
}

export interface Coach {
  id: string;
  name: string;
  trainer_name?: string;
  phone: string;
  specialty: string;
  status: 'نشط' | 'غير نشط';
}

export interface Session {
  id: string;
  coach_id: string;
  coach_name?: string;
  trainer_name?: string;
  day: 'السبت' | 'الأحد' | 'الاثنين' | 'الثلاثاء' | 'الأربعاء' | 'الخميس' | 'الجمعة';
  start_time: string;
  end_time: string;
  max_capacity: number;
  required_level: string;
}

export interface Booking {
  id: string;
  student_id: string;
  student_name?: string;
  session_id: string;
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
  id: string;
  student_id: string;
  student_name?: string;
  amount: number;
  date: string;
  method: 'نقدي' | 'تحويل';
  notes: string;
}

export interface AppSettings {
  payment_config: {
    bitPhone: string;
    payboxPhone: string;
    bankAccount: string;
    bankName: string;
    academyName: string;
    academyPhone: string;
  };
}
