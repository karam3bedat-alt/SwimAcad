import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateStudentsPDF = (students: any[]) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('تقرير الطلاب - أكاديمية FOSA', 105, 20, { align: 'center' });
  
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
  doc.text('تقرير الحضور والغياب - أكاديمية FOSA', 105, 20, { align: 'center' });
  
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
  
  doc.save(`attendance-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generatePaymentsPDF = (payments: any[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('تقرير المدفوعات - أكاديمية FOSA', 105, 20, { align: 'center' });
  
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
