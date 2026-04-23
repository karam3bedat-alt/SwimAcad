import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateStudentsPDF = (students: any[]) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('تقرير الطلاب - Sharks Olympic Academy', 105, 20, { align: 'center' });
  
  // Date
  doc.setFontSize(12);
  doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`, 105, 30, { align: 'center' });
  
  // Table Data
  const tableData = students.map(s => [
    s.full_name,
    s.age,
    s.level,
    s.phone || s.parent_phone || '-'
  ]);
  
  autoTable(doc, {
    head: [['الاسم', 'العمر', 'المستوى', 'رقم الهاتف']],
    body: tableData,
    startY: 40,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      halign: 'right',
      fontSize: 10
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue
      textColor: 255
    }
  });
  
  // Save file
  doc.save(`students-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateAttendancePDF = (bookings: any[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('تقرير الحضور والغياب - Sharks Olympic Academy', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`, 105, 30, { align: 'center' });
  
  const tableData = bookings.map(b => [
    b.student_name || 'طالب غير معروف',
    `${b.session_day || ''} - ${b.session_time || ''}`,
    b.status || '-',
    b.date ? new Date(b.date).toLocaleDateString('ar-SA') : '-'
  ]);
  
  autoTable(doc, {
    head: [['اسم الطالب', 'الحصة', 'الحالة', 'التاريخ']],
    body: tableData,
    startY: 40,
    theme: 'grid',
    styles: { halign: 'right' },
    headStyles: { fillColor: [59, 130, 246] }
  });
  
  const presentCount = bookings.filter(b => b.status === 'حاضر').length;
  const absentCount = bookings.filter(b => b.status === 'غائب').length;
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(10);
  doc.text(`إجمالي الحضور: ${presentCount}`, 190, finalY, { align: 'right' });
  doc.text(`إجمالي الغياب: ${absentCount}`, 190, finalY + 7, { align: 'right' });
  
  doc.save(`attendance-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generatePaymentsPDF = (payments: any[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('تقرير المدفوعات - Sharks Olympic Academy', 105, 20, { align: 'center' });
  
  const total = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  doc.setFontSize(14);
  doc.text(`إجمالي الإيرادات: ${total.toLocaleString()} ₪`, 105, 30, { align: 'center' });
  
  const tableData = payments.map(p => [
    p.student_name || 'طالب غير معروف',
    p.month || '-',
    `${Number(p.amount).toLocaleString()} ₪`,
    p.date ? new Date(p.date).toLocaleDateString('ar-EG') : '-'
  ]);
  
  autoTable(doc, {
    head: [['اسم الطالب', 'الشهر', 'المبلغ', 'التاريخ']],
    body: tableData,
    startY: 40,
    theme: 'grid',
    styles: { halign: 'right' },
    headStyles: { fillColor: [16, 185, 129] } // Green
  });
  
  doc.save(`payments-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateCoachAttendancePDF = (attendance: any[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('تقرير حضور المدربين - Sharks Olympic Academy', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`, 105, 30, { align: 'center' });
  
  const tableData = attendance.map(a => [
    a.coach_name || '-',
    a.date || '-',
    a.check_in ? new Date(a.check_in).toLocaleTimeString('ar-EG') : '-',
    a.check_out ? new Date(a.check_out).toLocaleTimeString('ar-EG') : '-',
    a.duration_minutes ? `${a.duration_minutes} دقيقة` : '-',
    a.status || 'حاضر'
  ]);
  
  autoTable(doc, {
    head: [['اسم المدرب', 'التاريخ', 'دخول', 'خروج', 'المدة', 'الحالة']],
    body: tableData,
    startY: 40,
    theme: 'grid',
    styles: { halign: 'right' },
    headStyles: { fillColor: [99, 102, 241] } // Indigo
  });
  
  doc.save(`coaches-attendance-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateDetailedFinancialReport = (payments: any[], students: any[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(22);
  doc.text('التقرير المالي التفصيلي', 105, 20, { align: 'center' });
  
  const total = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const studentPaymentsCount = payments.length;
  
  doc.setFontSize(12);
  doc.text(`إجمالي التحصيلات: ${total.toLocaleString()} ₪`, 20, 40);
  doc.text(`عدد الدفعات المستلمة: ${studentPaymentsCount}`, 20, 50);
  doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`, 20, 60);

  const tableData = payments.map(p => [
    p.student_name || 'غير معروف',
    p.course_type || '-',
    `${Number(p.amount).toLocaleString()} ₪`,
    p.date ? new Date(p.date).toLocaleDateString('ar-EG') : '-',
    p.method || 'نقداً'
  ]);

  autoTable(doc, {
    head: [['اسم الطالب', 'نوع الدورة', 'المبلغ', 'التاريخ', 'طريقة الدفع']],
    body: tableData,
    startY: 70,
    theme: 'striped',
    styles: { halign: 'right' },
    headStyles: { fillColor: [16, 185, 129] }
  });

  doc.save(`detailed-financial-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateCertificatePDF = (student: any) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Decorative border
  doc.setLineWidth(2);
  doc.setDrawColor(59, 130, 246);
  doc.rect(10, 10, width - 20, height - 20);
  doc.setLineWidth(0.5);
  doc.rect(12, 12, width - 24, height - 24);

  // Logo Placeholder / Brand Name
  doc.setFontSize(30);
  doc.setTextColor(30, 58, 138); // Navy
  doc.text('Sharks Olympic Academy', width / 2, 40, { align: 'center' });
  
  doc.setFontSize(50);
  doc.setTextColor(59, 130, 246); // Blue
  doc.text('شهادة تقدير', width / 2, 70, { align: 'center' });

  doc.setFontSize(18);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text('تشهد الأكاديمية بأن الطالب/ة', width / 2, 90, { align: 'center' });

  doc.setFontSize(32);
  doc.setTextColor(0, 0, 0);
  doc.text(student.full_name, width / 2, 110, { align: 'center' });

  doc.setFontSize(18);
  doc.setTextColor(71, 85, 105);
  doc.text(`قد أكمل بنجاح تدريبات السباحة لمستوى: ${student.level}`, width / 2, 130, { align: 'center' });
  doc.text(`نوع الدورة: ${student.course_type || 'تعليم سباحة'}`, width / 2, 140, { align: 'center' });

  doc.setFontSize(14);
  doc.text('نتمنى لك مزيداً من التقدم والنجاح في مسيرتك الرياضية', width / 2, 160, { align: 'center' });

  // Signatures
  doc.setFontSize(14);
  doc.text('توقيع مدير الأكاديمية', width / 4, 185, { align: 'center' });
  doc.line(width / 4 - 20, 192, width / 4 + 20, 192);

  doc.text('توقيع المدرب', (width * 3) / 4, 185, { align: 'center' });
  doc.line((width * 3) / 4 - 20, 192, (width * 3) / 4 + 20, 192);

  doc.setFontSize(12);
  doc.text(`تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}`, width / 2, 195, { align: 'center' });

  doc.save(`Certificate-${student.full_name}.pdf`);
};
