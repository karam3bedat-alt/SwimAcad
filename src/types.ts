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
  loyalty_points?: number; // legacy
  current_points?: number;
  lifetime_points?: number;
  loyalty_tier?: 'برونزي' | 'فضي' | 'ذهبي';
  birth_date?: string;
  assigned_coach_id?: string;
  course_id?: string;
  status?: 'نشط' | 'غير نشط';
  // New subscription fields
  subscription_model?: 'monthly' | 'credit' | 'rolling';
  remaining_sessions?: number;
  subscription_start_date?: string;
  subscription_end_date?: string;
  first_session_date?: string;
}

export interface CourseCycle {
  id: string;
  name: string;
  course_type: string;
  start_date: string;
  end_date: string;
  estimated_cost: number;
  description?: string;
  coach_id?: string;
  status: 'نشط' | 'مكتمل' | 'قادم';
}

export interface StudentEvaluation {
  id: string;
  student_id: string;
  coach_id: string;
  coach_name: string;
  date: string;
  skills: {
    swimming: number;
    stamina: number;
    technique: number;
    behavior: number;
  };
  total_score: number;
  comments?: string;
}

export interface StudentMedia {
  id: string;
  student_id: string;
  coach_id: string;
  url: string;
  type: 'image' | 'video';
  description?: string;
  date: string;
}

export interface Coach {
  id: string;
  name: string;
  trainer_name?: string;
  phone: string;
  email?: string;
  specialty: string;
  status: 'نشط' | 'غير نشط';
  loyalty_points?: number;
  bio?: string;
  join_date?: string;
  salary?: number;
  lesson_rate?: number;
  photo_url?: string;
}

export interface CoachAttendance {
  id: string;
  coach_id: string;
  coach_name: string;
  date: string; // ISO date
  check_in: string; // ISO timestamp
  check_out?: string; // ISO timestamp
  duration_minutes?: number;
  status: 'حاضر' | 'متأخر' | 'مبكر' | 'غائب';
  lessons_count?: number;
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
  month?: string;
  method: string;
  course_type?: string;
  required_amount?: number;
  notes?: string;
  received_by?: string;
  loyalty_points_used?: number;
}

export interface PaymentConfig {
  bitPhone: string;
  payboxPhone: string;
  bankAccount: string;
  bankName: string;
  academyName: string;
  academyPhone: string;
  coursePrices?: Record<string, number>;
}

export interface TransactionItem {
  id: string; // Product ID or 'subscription'
  type: 'subscription' | 'product';
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Transaction {
  id: string;
  student_id: string;
  student_name: string;
  items: TransactionItem[];
  total_amount: number;
  date: string;
  method: 'cash' | 'bit' | 'paybox' | 'transfer';
  notes?: string;
  received_by?: string;
  loyalty_points_earned?: number;
  loyalty_points_used?: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image_url?: string;
  description?: string;
}

export interface AppSettings {
  payment_config: PaymentConfig;
  last_updated?: string;
}
