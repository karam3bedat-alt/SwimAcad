import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to render Arabic text properly using Canvas (Shaping workaround)
const drawArabicText = (doc: jsPDF, text: string, x: number, y: number, fontSize: number, color: string = '#000000', bold: boolean = false, align: 'center' | 'right' | 'left' = 'center') => {
  if (!text || text === '-') return;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // High resolution for PDF
  const scale = 4;
  ctx.font = `${bold ? 'bold ' : ''}${fontSize * scale}px "Arial", "Cairo", "Amiri", sans-serif`;
  const metrics = ctx.measureText(text);
  
  canvas.width = metrics.width + (10 * scale);
  canvas.height = fontSize * scale * 2.5;

  ctx.font = `${bold ? 'bold ' : ''}${fontSize * scale}px "Arial", "Cairo", "Amiri", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = canvas.width / scale;
  const imgHeight = canvas.height / scale;
  
  let finalX = x;
  if (align === 'center') finalX = x - imgWidth / 2;
  else if (align === 'right') finalX = x - imgWidth;
  
  doc.addImage(imgData, 'PNG', finalX, y - imgHeight / 2, imgWidth, imgHeight);
};

const arabicTableConfig = (doc: jsPDF, fontSize: number = 9): any => ({
  styles: {
    halign: 'right',
    fontSize: fontSize,
    textColor: [255, 255, 255] // Hide original text
  },
  headStyles: {
    fillColor: [59, 130, 246],
    textColor: [59, 130, 246] // Hide head text too
  },
  didDrawCell: (data: any) => {
    if (data.cell.text && data.cell.text.length > 0) {
      const text = data.cell.text.join(' ');
      const x = data.cell.x + data.cell.width / 2;
      const y = data.cell.y + data.cell.height / 2;
      const color = data.section === 'head' ? '#FFFFFF' : '#101828';
      const isBold = data.section === 'head';
      drawArabicText(doc, text, x, y, fontSize, color, isBold, 'center');
    }
  }
});

export const generateStudentsPDF = (students: any[]) => {
  const doc = new jsPDF();
  
  // Title
  drawArabicText(doc, 'تقرير الطلاب - Sharks Olympic Academy', 105, 15, 16, '#101828', true);
  drawArabicText(doc, `تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`, 105, 25, 10, '#475569');
  
  const tableData = students.map(s => [
    s.phone || s.parent_phone || '-',
    s.level || '-',
    s.age || '-',
    s.full_name || '-'
  ]);
  
  autoTable(doc, {
    head: [['رقم الهاتف', 'المستوى', 'العمر', 'الاسم']],
    body: tableData,
    startY: 35,
    theme: 'grid',
    ...arabicTableConfig(doc)
  });
  
  doc.save(`students-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateAttendancePDF = (bookings: any[]) => {
  const doc = new jsPDF();
  
  drawArabicText(doc, 'تقرير الحضور والغياب - Sharks Olympic Academy', 105, 15, 16, '#101828', true);
  drawArabicText(doc, `تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`, 105, 25, 10, '#475569');
  
  const tableData = bookings.map(b => [
    b.date ? new Date(b.date).toLocaleDateString('ar-SA') : '-',
    b.status || '-',
    `${b.session_day || ''} - ${b.session_time || ''}`,
    b.student_name || 'طالب غير معروف'
  ]);
  
  autoTable(doc, {
    head: [['التاريخ', 'الحالة', 'الحصة', 'اسم الطالب']],
    body: tableData,
    startY: 35,
    theme: 'grid',
    ...arabicTableConfig(doc)
  });
  
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const presentCount = bookings.filter(b => b.status === 'حاضر').length;
  const absentCount = bookings.filter(b => b.status === 'غائب').length;
  
  drawArabicText(doc, `إجمالي الحضور: ${presentCount}`, 190, finalY, 10, '#101828', false, 'right');
  drawArabicText(doc, `إجمالي الغياب: ${absentCount}`, 190, finalY + 7, 10, '#101828', false, 'right');
  
  doc.save(`attendance-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generatePaymentsPDF = (payments: any[]) => {
  const doc = new jsPDF();
  
  drawArabicText(doc, 'تقرير المدفوعات - Sharks Olympic Academy', 105, 15, 16, '#101828', true);
  
  const total = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  drawArabicText(doc, `إجمالي الإيرادات: ${(total || 0).toLocaleString()} ₪`, 105, 25, 12, '#059669', true);
  
  const tableData = payments.map(p => [
    p.date ? new Date(p.date).toLocaleDateString('ar-EG') : '-',
    `${(Number(p.amount) || 0).toLocaleString()} ₪`,
    p.month || '-',
    p.student_name || 'طالب غير معروف'
  ]);
  
  autoTable(doc, {
    head: [['التاريخ', 'المبلغ', 'الشهر', 'اسم الطالب']],
    body: tableData,
    startY: 35,
    theme: 'grid',
    ...arabicTableConfig(doc),
    headStyles: { fillColor: [16, 185, 129], textColor: [16, 185, 129] }
  });
  
  doc.save(`payments-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateCoachAttendancePDF = (attendance: any[]) => {
  const doc = new jsPDF();
  
  drawArabicText(doc, 'تقرير حضور المدربين - Sharks Olympic Academy', 105, 15, 16, '#101828', true);
  drawArabicText(doc, `تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`, 105, 25, 10, '#475569');
  
  const tableData = attendance.map(a => [
    a.status || 'حاضر',
    a.duration_minutes ? `${a.duration_minutes} دقيقة` : '-',
    a.check_out ? new Date(a.check_out).toLocaleTimeString('ar-EG') : '-',
    a.check_in ? new Date(a.check_in).toLocaleTimeString('ar-EG') : '-',
    a.date || '-',
    a.coach_name || '-'
  ]);
  
  autoTable(doc, {
    head: [['الحالة', 'المدة', 'خروج', 'دخول', 'التاريخ', 'اسم المدرب']],
    body: tableData,
    startY: 35,
    theme: 'grid',
    ...arabicTableConfig(doc, 8),
    headStyles: { fillColor: [99, 102, 241], textColor: [99, 102, 241] }
  });
  
  doc.save(`coaches-attendance-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateDetailedFinancialReport = (payments: any[], students: any[], selectedMonth: string) => {
  const doc = new jsPDF();
  
  drawArabicText(doc, 'التقرير المالي التفصيلي', 105, 15, 20, '#101828', true);
  
  // Calculate aggregated data per student for this month
  const reportData = students.filter(s => s.status !== 'inactive').map(student => {
    const studentPayments = payments.filter(p => p.student_id === student.id);
    const paid = studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const required = student.custom_fee || 600;
    const remaining = Math.max(0, required - paid);
    const lastPayment = studentPayments.length > 0 ? studentPayments[studentPayments.length - 1] : null;

    return {
      name: student.full_name,
      required: required,
      paid: paid,
      remaining: remaining,
      date: lastPayment ? new Date(lastPayment.date).toLocaleDateString('ar-EG') : '-',
      month: selectedMonth,
      method: lastPayment ? (lastPayment.method || 'نقداً') : '-',
      type: lastPayment ? (lastPayment.type || 'اشتراك') : '-'
    };
  });

  const grandTotalRequired = reportData.reduce((sum, r) => sum + r.required, 0);
  const grandTotalPaid = reportData.reduce((sum, r) => sum + r.paid, 0);
  const grandTotalRemaining = reportData.reduce((sum, r) => sum + r.remaining, 0);
  
  drawArabicText(doc, `الفترة: ${selectedMonth}`, 190, 30, 10, '#475569', false, 'right');
  drawArabicText(doc, `تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`, 20, 30, 9, '#475569', false, 'left');

  const tableData = reportData.map(r => [
    r.type,
    r.method,
    r.date,
    `${r.remaining.toLocaleString()} ₪`,
    `${r.paid.toLocaleString()} ₪`,
    `${r.required.toLocaleString()} ₪`,
    r.month,
    r.name
  ]);

  // Add Totals Row
  tableData.push([
    '-',
    '-',
    'المجموع الكلي',
    `${grandTotalRemaining.toLocaleString()} ₪`,
    `${grandTotalPaid.toLocaleString()} ₪`,
    `${grandTotalRequired.toLocaleString()} ₪`,
    '-',
    '-'
  ]);

  autoTable(doc, {
    head: [['النوع', 'الطريقة', 'التاريخ', 'المتبقي', 'المدفوع', 'الاشتراك', 'الشهر', 'اسم الطالب']],
    body: tableData,
    startY: 40,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], textColor: [16, 185, 129] },
    ...arabicTableConfig(doc, 8),
    didParseCell: (data) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = [16, 185, 129];
      }
    }
  });

  doc.save(`detailed-financial-report-${selectedMonth}.pdf`);
};

export const generateCertificatePDF = (student: any) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Background and borders
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, height, 'F');
  
  doc.setLineWidth(1);
  doc.setDrawColor(26, 54, 104);
  doc.rect(7, 7, width - 14, height - 14);
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(197, 168, 107);
  doc.rect(10, 10, width - 20, height - 20);
  
  doc.setLineWidth(1.8);
  doc.setDrawColor(197, 168, 107);
  doc.rect(14, 14, width - 28, height - 28);

  // Corner decorations
  const cs = 25;
  doc.setLineWidth(1.2);
  doc.line(14, 14 + cs, 14, 14);
  doc.line(14, 14, 14 + cs, 14);
  doc.line(width - 14 - cs, 14, width - 14, 14);
  doc.line(width - 14, 14, width - 14, 14 + cs);
  doc.line(14, height - 14 - cs, 14, height - 14);
  doc.line(14, height - 14, 14 + cs, height - 14);
  doc.line(width - 14 - cs, height - 14, width - 14, height - 14);
  doc.line(width - 14, height - 14, width - 14, height - 14 - cs);

  // Brand Header
  doc.setTextColor(26, 54, 104);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SHARKS OLYMPIC ACADEMY', width / 2, 28, { align: 'center' });

  // Main Content
  drawArabicText(doc, 'شـهادة تـقـديـر وتـفـوّق', width / 2, 55, 26, '#C5A86B', true);
  drawArabicText(doc, 'تتشرف أكاديمية القروش للألعاب الأولمبية بمنح هذه الشهادة إلى البطل / ـة', width / 2, 75, 12, '#1A3668');
  drawArabicText(doc, student.full_name, width / 2, 95, 22, '#000000', true);
  
  drawArabicText(doc, 'وذلك تقديراً لتميزه وتفوقه في اجتياز متطلبات دورة:', width / 2, 115, 12, '#475569');
  drawArabicText(doc, student.course_type || 'السباحة الأولمبية', width / 2, 130, 16, '#1A3668', true);
  drawArabicText(doc, `بالمستوى: ${student.level || 'الأول'}`, width / 2, 142, 12, '#1A3668');
  
  drawArabicText(doc, 'مع تمنياتنا بدوام التألق والنجاح في مسيرتكم الرياضية', width / 2, 160, 10, '#64748B');

  // Signatures
  doc.setDrawColor(197, 168, 107);
  doc.setLineWidth(0.4);
  
  drawArabicText(doc, 'توقيع مدير الأكاديمية', width / 4, 180, 10, '#1A3668', true);
  doc.line(width / 4 - 20, 186, width / 4 + 20, 186);
  
  drawArabicText(doc, 'توقيع المدرب', (width * 3) / 4, 180, 10, '#1A3668', true);
  doc.line((width * 3) / 4 - 20, 186, (width * 3) / 4 + 20, 186);

  // Footer Metadata
  const dateStr = new Date().toLocaleDateString('ar-EG');
  drawArabicText(doc, `تاريخ الإصدار: ${dateStr}`, 40, 195, 8, '#94A6B8', false, 'left');
  
  const certId = `CERT-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  doc.setFontSize(8);
  doc.setTextColor(148, 166, 184);
  doc.text(`ID: ${certId}`, width - 40, 195, { align: 'right' });

  doc.save(`Certificate-${student.full_name}.pdf`);
};

