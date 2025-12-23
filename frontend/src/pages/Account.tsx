import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { User, BookOpen, CreditCard, Calendar, Plus, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Payment {
  id: number;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'refunded';
  paymentDate: string;
  dueDate: string | null;
  course: {
    id: number;
    name: string;
  };
}

interface Attendance {
  id: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  group: {
    id: number;
    name: string;
    course: {
      name: string;
    };
  };
}

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  group: {
    id: number;
    name: string;
    course: {
      id: number;
      name: string;
    };
  } | null;
}

interface Course {
  id: number;
  name: string;
  description: string;
  price: number;
}

interface Group {
  id: number;
  name: string;
  maxStudents: number;
  course: {
    id: number;
    name: string;
  };
}

const Account = () => {
  const { user, token, isStudent } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'payments' | 'attendance' | 'courses'>('profile');
  const [student, setStudent] = useState<Student | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedAttendanceMonth, setSelectedAttendanceMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // Безопасный расчет долга с защитой от ошибок
  const totalDebt = useMemo(() => {
    try {
      if (!Array.isArray(payments) || payments.length === 0) {
        return 0;
      }
      return payments.reduce((sum, payment) => {
        if (payment && (payment.status === 'pending' || payment.status === 'overdue')) {
          let amount = 0;
          if (typeof payment.amount === 'number') {
            amount = payment.amount;
          } else if (payment.amount != null) {
            amount = parseFloat(String(payment.amount));
          }
          return sum + (isNaN(amount) ? 0 : amount);
        }
        return sum;
      }, 0);
    } catch (error) {
      console.error('Ошибка расчета долга:', error);
      return 0;
    }
  }, [payments]);

  // Безопасный подсчет неоплаченных платежей
  const unpaidPaymentsCount = useMemo(() => {
    try {
      if (!Array.isArray(payments)) {
        return 0;
      }
      return payments.filter(p => p && (p.status === 'pending' || p.status === 'overdue')).length;
    } catch (error) {
      console.error('Ошибка подсчета неоплаченных платежей:', error);
      return 0;
    }
  }, [payments]);

  const fetchData = async () => {
    if (!user || !token) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const loadingTimeout = setTimeout(() => {
      console.warn('Загрузка данных заняла слишком много времени, принудительно отключаем loading');
      setLoading(false);
    }, 5000); // Уменьшил до 5 секунд для быстрой реакции
    
    try {
      // Упрощенная версия без сложных таймаутов
      const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error && error.name === 'AbortError') {
            console.warn('Запрос прерван по таймауту:', url);
          }
          return { ok: false } as Response;
        }
      };

      // Всегда загружаем данные студента
      const studentRes = await fetchWithTimeout(`${API_URL}/students/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (studentRes.ok) {
        try {
          const studentData = await studentRes.json();
          setStudent(studentData);
        } catch (e) {
          console.error('Ошибка парсинга данных студента:', e);
        }
      }

      // Загружаем платежи для вкладок profile и payments
      if (activeTab === 'profile' || activeTab === 'payments') {
        const paymentsRes = await fetchWithTimeout(`${API_URL}/payments?month=${selectedMonth}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (paymentsRes.ok) {
          try {
            const paymentsData = await paymentsRes.json();
            setPayments(Array.isArray(paymentsData) ? paymentsData : []);
          } catch (e) {
            console.error('Ошибка парсинга данных платежей:', e);
            setPayments([]);
          }
        } else {
          const errorText = await paymentsRes.text().catch(() => 'Неизвестная ошибка');
          console.error('Ошибка загрузки платежей:', paymentsRes.status, paymentsRes.statusText, errorText);
          setPayments([]);
        }
      }

      if (activeTab === 'attendance') {
        const startDate = `${selectedAttendanceMonth}-01`;
        const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0).toISOString().split('T')[0];
        const attendancesRes = await fetchWithTimeout(`${API_URL}/attendances?startDate=${startDate}&endDate=${endDate}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (attendancesRes.ok) {
          try {
            const attendancesData = await attendancesRes.json();
            setAttendances(Array.isArray(attendancesData) ? attendancesData : []);
          } catch (e) {
            console.error('Ошибка парсинга данных посещаемости:', e);
            setAttendances([]);
          }
        } else {
          console.error('Ошибка загрузки посещаемости:', attendancesRes.status, attendancesRes.statusText);
          setAttendances([]);
        }
      }

      if (activeTab === 'courses') {
        const [coursesRes, groupsRes] = await Promise.all([
          fetchWithTimeout(`${API_URL}/courses`),
          fetchWithTimeout(`${API_URL}/groups`),
        ]);
        if (coursesRes.ok) {
          try {
            const coursesData = await coursesRes.json();
            setCourses(Array.isArray(coursesData) ? coursesData : []);
          } catch (e) {
            console.error('Ошибка парсинга данных курсов:', e);
            setCourses([]);
          }
        } else {
          setCourses([]);
        }
        if (groupsRes.ok) {
          try {
            const groupsData = await groupsRes.json();
            setGroups(Array.isArray(groupsData) ? groupsData : []);
          } catch (e) {
            console.error('Ошибка парсинга данных групп:', e);
            setGroups([]);
          }
        } else {
          setGroups([]);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      clearTimeout(loadingTimeout);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }
    
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, activeTab, selectedMonth, selectedAttendanceMonth]);

  const handleEnroll = async (groupId: number) => {
    if (!confirm('Вы уверены, что хотите записаться на этот курс?')) return;

    try {
      const response = await fetch(`${API_URL}/students/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ groupId }),
      });

      if (response.ok) {
        alert('Вы успешно записались на курс!');
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка записи на курс');
      }
    } catch (error) {
      console.error('Ошибка записи на курс:', error);
      alert('Ошибка записи на курс');
    }
  };

  // Группировка платежей по месяцам
  const paymentsByMonth = (payments || []).reduce((acc, payment) => {
    const month = payment.paymentDate.slice(0, 7);
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(payment);
    return acc;
  }, {} as Record<string, Payment[]>);

  const currentMonthPayments = paymentsByMonth[selectedMonth] || [];
  
  // Статистика платежей за выбранный месяц
  const currentMonthStats = currentMonthPayments.reduce((acc, payment) => {
    acc.total += parseFloat(payment.amount.toString());
    if (payment.status === 'paid') {
      acc.paid += parseFloat(payment.amount.toString());
      acc.paidCount++;
    } else if (payment.status === 'pending') {
      acc.pending += parseFloat(payment.amount.toString());
      acc.pendingCount++;
    } else if (payment.status === 'overdue') {
      acc.overdue += parseFloat(payment.amount.toString());
      acc.overdueCount++;
    }
    return acc;
  }, { total: 0, paid: 0, pending: 0, overdue: 0, paidCount: 0, pendingCount: 0, overdueCount: 0 });
  
  // Фильтрация посещаемости по выбранному месяцу
  const currentMonthAttendances = attendances.filter(att => {
    const attMonth = att.date.slice(0, 7);
    return attMonth === selectedAttendanceMonth;
  });
  
  // Статистика посещаемости за выбранный месяц
  const currentMonthAttendanceStats = currentMonthAttendances.reduce((acc, att) => {
    acc.total++;
    if (att.status === 'present') acc.present++;
    else if (att.status === 'absent') acc.absent++;
    else if (att.status === 'late') acc.late++;
    else if (att.status === 'excused') acc.excused++;
    return acc;
  }, { total: 0, present: 0, absent: 0, late: 0, excused: 0 });

  const currentMonthAttendanceRate = currentMonthAttendanceStats.total > 0
    ? ((currentMonthAttendanceStats.present + currentMonthAttendanceStats.late) / currentMonthAttendanceStats.total * 100).toFixed(1)
    : '0';

  // Статистика посещаемости
  const attendanceStats = attendances.reduce((acc, att) => {
    acc.total++;
    if (att.status === 'present') acc.present++;
    else if (att.status === 'absent') acc.absent++;
    else if (att.status === 'late') acc.late++;
    else if (att.status === 'excused') acc.excused++;
    return acc;
  }, { total: 0, present: 0, absent: 0, late: 0, excused: 0 });

  const attendanceRate = attendanceStats.total > 0
    ? ((attendanceStats.present + attendanceStats.late) / attendanceStats.total * 100).toFixed(1)
    : '0';

  // Данные для графика посещаемости по месяцам
  const attendanceByMonth = attendances.reduce((acc, att) => {
    const month = att.date.slice(0, 7);
    if (!acc[month]) {
      acc[month] = { present: 0, absent: 0, late: 0, excused: 0 };
    }
    if (att.status === 'present') acc[month].present++;
    else if (att.status === 'absent') acc[month].absent++;
    else if (att.status === 'late') acc[month].late++;
    else if (att.status === 'excused') acc[month].excused++;
    return acc;
  }, {} as Record<string, { present: number; absent: number; late: number; excused: number }>);

  const attendanceChartData = Object.entries(attendanceByMonth).map(([month, stats]) => ({
    month: new Date(month + '-01').toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }),
    Присутствовал: stats.present,
    Отсутствовал: stats.absent,
    Опоздал: stats.late,
    'Уважительная причина': stats.excused,
  }));

  if (!user || !token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-extrabold gradient-text mb-2">Личный кабинет</h1>
          <p className="text-gray-600">Добро пожаловать, {user.firstName} {user.lastName}!</p>
        </motion.div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl mb-8 border border-gray-100">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto" aria-label="Account tabs">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <User className="w-5 h-5" />
                <span>Профиль</span>
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
                  activeTab === 'payments'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Платежи</span>
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
                  activeTab === 'attendance'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>Посещаемость</span>
              </button>
              {isStudent && (
                <button
                  onClick={() => setActiveTab('courses')}
                  className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
                    activeTab === 'courses'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Записаться на курс</span>
                </button>
              )}
            </nav>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p>Загрузка данных...</p>
                <button 
                  onClick={() => setLoading(false)}
                  className="mt-4 text-sm text-primary-600 hover:text-primary-700 underline"
                >
                  Отменить загрузку
                </button>
              </div>
            ) : (
              <>
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Профиль</h2>
                    </div>

                    <div className="space-y-4 max-w-2xl">
                      <div className="card-gradient p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Имя</label>
                            <p className="text-gray-900 font-semibold">{user.firstName}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Фамилия</label>
                            <p className="text-gray-900 font-semibold">{user.lastName}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <p className="text-gray-900">{user.email}</p>
                          </div>
                          {student?.phone && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
                              <p className="text-gray-900">{student.phone}</p>
                            </div>
                          )}
                          {student?.group && (
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Текущая группа</label>
                              <p className="text-gray-900 font-semibold">{student.group.name} - {student.group.course.name}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Информация о долге */}
                      {typeof totalDebt === 'number' && totalDebt > 0 && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-red-700">Общий долг за курсы:</span>
                            <span className="text-2xl font-extrabold text-red-600">{totalDebt.toLocaleString('ru-RU')} сом</span>
                          </div>
                          <p className="text-xs text-red-600">
                            Неоплаченных платежей: {unpaidPaymentsCount}. Перейдите во вкладку "Платежи" для детальной информации.
                          </p>
                        </div>
                      )}
                      {typeof totalDebt === 'number' && totalDebt === 0 && Array.isArray(payments) && payments.length > 0 && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-semibold text-green-700">Все платежи оплачены</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Payments Tab */}
                {activeTab === 'payments' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Платежи</h2>
                        {typeof totalDebt === 'number' && totalDebt > 0 && (
                          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-red-700">Общий долг:</span>
                              <span className="text-xl font-extrabold text-red-600">{totalDebt.toLocaleString('ru-RU')} сом</span>
                            </div>
                            <p className="text-xs text-red-600 mt-1">
                              Неоплаченных платежей: {unpaidPaymentsCount}
                            </p>
                          </div>
                        )}
                      </div>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="input w-auto"
                      >
                        {Object.keys(paymentsByMonth).sort().reverse().map(month => (
                          <option key={month} value={month}>
                            {new Date(month + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                          </option>
                        ))}
                        {Object.keys(paymentsByMonth).length === 0 && (
                          <option value={selectedMonth}>
                            {new Date(selectedMonth + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                          </option>
                        )}
                      </select>
                    </div>

                    {/* Статистика платежей за выбранный месяц */}
                    {currentMonthPayments.length > 0 && (
                      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          Статистика за {new Date(selectedMonth + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="card-gradient text-center p-4">
                            <h4 className="text-xs font-semibold text-gray-600 mb-1">Всего к оплате</h4>
                            <p className="text-xl font-extrabold text-gray-900">{currentMonthStats.total.toLocaleString()} сом</p>
                          </div>
                          <div className="card-gradient text-center p-4">
                            <h4 className="text-xs font-semibold text-gray-600 mb-1">Оплачено</h4>
                            <p className="text-xl font-extrabold text-green-600">{currentMonthStats.paid.toLocaleString()} сом</p>
                            <p className="text-xs text-gray-500 mt-1">({currentMonthStats.paidCount} платежей)</p>
                          </div>
                          <div className="card-gradient text-center p-4">
                            <h4 className="text-xs font-semibold text-gray-600 mb-1">Ожидает оплаты</h4>
                            <p className="text-xl font-extrabold text-yellow-600">{currentMonthStats.pending.toLocaleString()} сом</p>
                            <p className="text-xs text-gray-500 mt-1">({currentMonthStats.pendingCount} платежей)</p>
                          </div>
                          <div className="card-gradient text-center p-4">
                            <h4 className="text-xs font-semibold text-gray-600 mb-1">Просрочено</h4>
                            <p className="text-xl font-extrabold text-red-600">{currentMonthStats.overdue.toLocaleString()} сом</p>
                            <p className="text-xs text-gray-500 mt-1">({currentMonthStats.overdueCount} платежей)</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentMonthPayments.length > 0 ? (
                      <div className="space-y-4">
                        {currentMonthPayments.map((payment) => (
                          <div key={payment.id} className="card-gradient p-6">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{payment.course.name}</h3>
                                <p className="text-gray-600">Дата: {new Date(payment.paymentDate).toLocaleDateString('ru-RU')}</p>
                                {payment.dueDate && (
                                  <p className="text-gray-600">Срок оплаты: {new Date(payment.dueDate).toLocaleDateString('ru-RU')}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-extrabold gradient-text mb-2">
                                  {payment.amount.toLocaleString()} сом
                                </p>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                                  payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  payment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {payment.status === 'paid' ? 'Оплачено' :
                                   payment.status === 'pending' ? 'Ожидает оплаты' :
                                   payment.status === 'overdue' ? 'Просрочено' :
                                   'Возвращено'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-12">Нет платежей за выбранный месяц</p>
                    )}
                  </motion.div>
                )}

                {/* Attendance Tab */}
                {activeTab === 'attendance' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Посещаемость</h2>
                      <select
                        value={selectedAttendanceMonth}
                        onChange={(e) => setSelectedAttendanceMonth(e.target.value)}
                        className="input w-auto"
                      >
                        {Object.keys(attendanceByMonth).sort().reverse().map(month => (
                          <option key={month} value={month}>
                            {new Date(month + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                          </option>
                        ))}
                        {Object.keys(attendanceByMonth).length === 0 && (
                          <option value={selectedAttendanceMonth}>
                            {new Date(selectedAttendanceMonth + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                          </option>
                        )}
                      </select>
                    </div>

                    {currentMonthAttendances.length > 0 ? (
                      <>
                        {/* Statistics for selected month */}
                        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            Статистика за {new Date(selectedAttendanceMonth + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="card-gradient text-center p-4">
                              <h4 className="text-xs font-semibold text-gray-600 mb-1">Процент посещаемости</h4>
                              <p className="text-2xl font-extrabold gradient-text">{currentMonthAttendanceRate}%</p>
                            </div>
                            <div className="card-gradient text-center p-4">
                              <h4 className="text-xs font-semibold text-gray-600 mb-1">Присутствовал</h4>
                              <p className="text-2xl font-extrabold text-green-600">{currentMonthAttendanceStats.present}</p>
                            </div>
                            <div className="card-gradient text-center p-4">
                              <h4 className="text-xs font-semibold text-gray-600 mb-1">Отсутствовал</h4>
                              <p className="text-2xl font-extrabold text-red-600">{currentMonthAttendanceStats.absent}</p>
                            </div>
                            <div className="card-gradient text-center p-4">
                              <h4 className="text-xs font-semibold text-gray-600 mb-1">Всего занятий</h4>
                              <p className="text-2xl font-extrabold text-primary-600">{currentMonthAttendanceStats.total}</p>
                            </div>
                          </div>
                        </div>

                        {/* Overall Statistics */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                          <div className="card-gradient text-center p-6">
                            <h3 className="text-sm font-semibold text-gray-600 mb-2">Общий процент посещаемости</h3>
                            <p className="text-3xl font-extrabold gradient-text">{attendanceRate}%</p>
                          </div>
                          <div className="card-gradient text-center p-6">
                            <h3 className="text-sm font-semibold text-gray-600 mb-2">Всего присутствовал</h3>
                            <p className="text-3xl font-extrabold text-green-600">{attendanceStats.present}</p>
                          </div>
                          <div className="card-gradient text-center p-6">
                            <h3 className="text-sm font-semibold text-gray-600 mb-2">Всего отсутствовал</h3>
                            <p className="text-3xl font-extrabold text-red-600">{attendanceStats.absent}</p>
                          </div>
                          <div className="card-gradient text-center p-6">
                            <h3 className="text-sm font-semibold text-gray-600 mb-2">Всего занятий</h3>
                            <p className="text-3xl font-extrabold text-primary-600">{attendanceStats.total}</p>
                          </div>
                        </div>

                        {/* Chart */}
                        {attendanceChartData.length > 0 && (
                          <div className="card-gradient p-6 mb-8">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">График посещаемости</h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={attendanceChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Присутствовал" fill="#10b981" />
                                <Bar dataKey="Отсутствовал" fill="#ef4444" />
                                <Bar dataKey="Опоздал" fill="#f59e0b" />
                                <Bar dataKey="Уважительная причина" fill="#3b82f6" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {/* Attendance List for selected month */}
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            Посещаемость за {new Date(selectedAttendanceMonth + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                          </h3>
                          {currentMonthAttendances.map((attendance) => (
                            <div key={attendance.id} className="card-gradient p-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-semibold text-gray-900">{attendance.group.course.name}</p>
                                  <p className="text-sm text-gray-600">{attendance.group.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {new Date(attendance.date).toLocaleDateString('ru-RU', { 
                                      weekday: 'long', 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric' 
                                    })}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {attendance.status === 'present' && <CheckCircle className="w-6 h-6 text-green-600" />}
                                  {attendance.status === 'absent' && <XCircle className="w-6 h-6 text-red-600" />}
                                  {attendance.status === 'late' && <Clock className="w-6 h-6 text-yellow-600" />}
                                  {attendance.status === 'excused' && <CheckCircle className="w-6 h-6 text-blue-600" />}
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    attendance.status === 'present' ? 'bg-green-100 text-green-800' :
                                    attendance.status === 'absent' ? 'bg-red-100 text-red-800' :
                                    attendance.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {attendance.status === 'present' ? 'Присутствовал' :
                                     attendance.status === 'absent' ? 'Отсутствовал' :
                                     attendance.status === 'late' ? 'Опоздал' :
                                     'Уважительная причина'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-500 mb-2">Нет данных о посещаемости за {new Date(selectedAttendanceMonth + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</p>
                        {attendances.length > 0 && (
                          <p className="text-sm text-gray-400">Выберите другой месяц из списка выше</p>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Courses Tab */}
                {activeTab === 'courses' && isStudent && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Записаться на курс</h2>

                    {courses.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => {
                          const courseGroups = groups.filter(g => g.course.id === course.id);
                          return (
                            <div key={course.id} className="card-gradient p-6">
                              <h3 className="text-xl font-bold text-gray-900 mb-2">{course.name}</h3>
                              <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                              <p className="text-2xl font-extrabold gradient-text mb-4">
                                {course.price.toLocaleString()} сом
                              </p>
                              {courseGroups.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-sm font-semibold text-gray-700">Доступные группы:</p>
                                  {courseGroups.map((group) => {
                                    const isEnrolled = student?.group?.id === group.id;
                                    const isFull = group.maxStudents > 0 && 
                                      groups.find(g => g.id === group.id)?.maxStudents === 
                                      groups.find(g => g.id === group.id)?.maxStudents;
                                    return (
                                      <button
                                        key={group.id}
                                        onClick={() => !isEnrolled && handleEnroll(group.id)}
                                        disabled={isEnrolled || isFull}
                                        className={`w-full btn-primary text-sm ${
                                          isEnrolled ? 'bg-green-600 hover:bg-green-700' :
                                          isFull ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                      >
                                        {isEnrolled ? (
                                          <span className="flex items-center justify-center space-x-2">
                                            <CheckCircle className="w-4 h-4" />
                                            <span>Вы записаны: {group.name}</span>
                                          </span>
                                        ) : isFull ? (
                                          <span>Группа переполнена: {group.name}</span>
                                        ) : (
                                          <span className="flex items-center justify-center space-x-2">
                                            <Plus className="w-4 h-4" />
                                            <span>Записаться: {group.name}</span>
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">Группы пока не сформированы</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-12">Курсы пока не добавлены</p>
                    )}
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;
