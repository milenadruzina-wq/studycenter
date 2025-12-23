import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, BarChart3, Users, Plus, Edit, Trash2, Save, X, Shield, DollarSign, Clock, GraduationCap, UserCheck, Eye, CreditCard, CheckCircle, MapPin } from 'lucide-react';

// Нормализация API_URL - убеждаемся, что он начинается с http:// или https://
const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  
  // Если переменная не задана, используем значение по умолчанию
  if (!envUrl || envUrl.trim() === '') {
    const defaultUrl = 'http://localhost:3000/api';
    console.log('[API_URL] VITE_API_URL не задан, используем значение по умолчанию:', defaultUrl);
    return defaultUrl;
  }
  
  let trimmedUrl = envUrl.trim();
  
  // Удаляем возможные пробелы и лишние символы
  trimmedUrl = trimmedUrl.replace(/^\s+|\s+$/g, '');
  
  // Если URL начинается с :, значит отсутствует протокол и хост
  if (trimmedUrl.startsWith(':')) {
    // Убираем начальный : если он есть
    let portAndPath = trimmedUrl.replace(/^:+/, '');
    // Убеждаемся, что путь начинается с / если его нет
    if (!portAndPath.startsWith('/')) {
      portAndPath = '/' + portAndPath;
    }
    const normalizedUrl = `http://localhost${portAndPath}`;
    console.warn('[API_URL] VITE_API_URL начинается с ":", нормализован до:', normalizedUrl);
    return normalizedUrl;
  }
  
  // Если URL не начинается с http:// или https://, добавляем протокол
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    // Если начинается с localhost или IP адреса, добавляем http://
    if (trimmedUrl.startsWith('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(trimmedUrl)) {
      const normalizedUrl = `http://${trimmedUrl}`;
      console.warn('[API_URL] VITE_API_URL без протокола, нормализован до:', normalizedUrl);
      return normalizedUrl;
    }
    
    // Если начинается с /api или просто /, добавляем http://localhost:3000
    if (trimmedUrl.startsWith('/')) {
      const normalizedUrl = `http://localhost:3000${trimmedUrl}`;
      console.warn('[API_URL] VITE_API_URL начинается с "/", нормализован до:', normalizedUrl);
      return normalizedUrl;
    }
    
    // Иначе предполагаем, что это путь относительно localhost:3000
    const normalizedUrl = `http://localhost:3000/${trimmedUrl.replace(/^\//, '')}`;
    console.warn('[API_URL] VITE_API_URL без протокола и хоста, нормализован до:', normalizedUrl);
    return normalizedUrl;
  }
  
  // Проверяем, что URL заканчивается правильно (без лишних символов)
  trimmedUrl = trimmedUrl.replace(/\/+$/, ''); // Убираем завершающие слеши
  
  console.log('[API_URL] Используется VITE_API_URL:', trimmedUrl);
  return trimmedUrl;
};

const API_URL = getApiUrl();
console.log('[API_URL] Инициализирован API_URL:', API_URL);

interface Course {
  id: number;
  name: string;
  description: string;
  price: number;
  teacherId: number;
  teacher?: {
    firstName: string;
    lastName: string;
  };
}

interface Group {
  id: number;
  name: string;
  maxStudents: number;
  courseId: number;
  startTime?: string;
  endTime?: string;
  schedules?: Schedule[];
  course?: {
    name: string;
  };
}

interface Schedule {
  id: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  groupId: number;
  group?: {
    name: string;
  };
}

const Admin = () => {
  const { t } = useTranslation();
  const { isAdmin, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'students' | 'trash' | 'teachers' | 'courses' | 'groups' | 'attendance' | 'payments' | 'branches' | 'reports'>('students');
  
  // Courses state
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [courseForm, setCourseForm] = useState({
    name: '',
    description: '',
    price: 0,
    teacherId: 0,
  });
  
  // Groups state
  const [groups, setGroups] = useState<Group[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [groupForm, setGroupForm] = useState({
    name: '',
    maxStudents: 0,
    courseId: 0,
    startTime: '',
    endTime: '',
    daysOfWeek: [] as string[],
  });
  
  // Schedules state
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [selectedGroupForSchedule, setSelectedGroupForSchedule] = useState<number | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    daysOfWeek: [] as string[],
    startTime: '',
    endTime: '',
    groupId: 0,
  });
  
  // Students state
  const [students, setStudents] = useState<any[]>([]);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [studentForm, setStudentForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    courseId: 0,
    groupId: 0,
    notes: '',
    username: '',
    password: '',
    parentName: '',
    parentPhone: '',
  });
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilterActive, setStudentFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [studentFilterCourse, setStudentFilterCourse] = useState<number | null>(null);
  const [studentFilterGroup, setStudentFilterGroup] = useState<number | null>(null);
  
  // Teachers state
  const [isCreatingTeacher, setIsCreatingTeacher] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<number | null>(null);
  const [teacherForm, setTeacherForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: '',
    bio: '',
    username: '',
    password: '',
    isActive: true,
    courseIds: [] as number[], // Массив ID курсов, которые преподает преподаватель
  });
  
  // Attendance state
  const [attendances, setAttendances] = useState<any[]>([]);
  const [selectedAttendanceGroupId, setSelectedAttendanceGroupId] = useState<number | null>(null);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [coursesAttendanceStats, setCoursesAttendanceStats] = useState<any>(null);
  const [attendanceStartDate, setAttendanceStartDate] = useState<string>(() => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return monthStart.toISOString().split('T')[0];
  });
  const [attendanceEndDate, setAttendanceEndDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  // Payments state
  const [payments, setPayments] = useState<any[]>([]);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    studentId: 0,
    courseId: 0,
    amount: 0,
    status: 'pending' as 'pending' | 'paid' | 'overdue' | 'refunded',
    paymentDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentMethod: '',
    notes: '',
  });
  const [paymentStats, setPaymentStats] = useState<any>(null);
  const [paymentFilterMonth, setPaymentFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [paymentFilterGroup, setPaymentFilterGroup] = useState<number | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  // Branches state
  const [branches, setBranches] = useState<any[]>([]);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<number | null>(null);
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    hours: '',
    latitude: '',
    longitude: '',
    description: '',
    isActive: true,
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Логирование API_URL при загрузке компонента для отладки
    console.log('[Admin] Компонент загружен, API_URL:', API_URL);
    console.log('[Admin] VITE_API_URL из env:', import.meta.env.VITE_API_URL);
    
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAdmin, navigate, activeTab]);

  // Проверка статуса сервера
  const checkServerStatus = async () => {
    try {
      const baseUrl = API_URL.replace('/api', '');
      const healthUrl = `${baseUrl}/health`;
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      
      if (response.ok) {
        setServerStatus('online');
        return true;
      } else {
        setServerStatus('offline');
        return false;
      }
    } catch (error) {
      setServerStatus('offline');
      return false;
    }
  };

  // Проверяем статус сервера при загрузке и периодически
  useEffect(() => {
    if (activeTab === 'payments') {
      checkServerStatus();
      const interval = setInterval(() => {
        checkServerStatus();
      }, 10000); // Проверяем каждые 10 секунд
      
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // КРИТИЧНО: Автоматическая загрузка данных при изменении paymentFilterMonth
  // Это гарантирует синхронизацию state и данных
  // useEffect срабатывает после того, как paymentFilterMonth обновился в state
  // НЕ вызываем при первой загрузке activeTab === 'payments', так как fetchData уже загружает данные
  useEffect(() => {
    // Пропускаем первую загрузку, так как fetchData уже загружает данные при переключении на вкладку
    // Загружаем только при изменении paymentFilterMonth
    if (activeTab === 'payments' && paymentFilterMonth) {
      console.log('[Admin] useEffect: paymentFilterMonth изменился, загрузка данных за месяц:', paymentFilterMonth);
      // fetchPayments уже очищает состояние внутри
      // Загружаем данные для выбранного месяца
      fetchPayments();
      fetchPaymentStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentFilterMonth]); // Только paymentFilterMonth, не activeTab, чтобы избежать двойной загрузки

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'students') {
        setStudentFilterActive('active');
        // Очищаем фильтры при переключении на вкладку
        setStudentFilterCourse(null);
        setStudentFilterGroup(null);
        await Promise.all([fetchGroups(), fetchCourses()]);
        await fetchStudents();
      } else if (activeTab === 'trash') {
        // Устанавливаем фильтр и очищаем поиск перед загрузкой данных
        setStudentFilterActive('inactive');
        setStudentSearch('');
        setStudentFilterGroup(null); // Очищаем фильтр по группе
        await Promise.all([fetchGroups()]);
        // Явно передаем фильтр 'inactive' в функцию, чтобы гарантировать правильную загрузку
        await fetchStudents('inactive');
      } else if (activeTab === 'teachers') {
        await fetchTeachers();
      } else if (activeTab === 'courses') {
        await Promise.all([fetchCourses(), fetchTeachers()]);
      } else if (activeTab === 'groups') {
        await Promise.all([fetchGroups(), fetchCourses(), fetchSchedules()]);
      } else if (activeTab === 'attendance') {
        await Promise.all([fetchGroups(), fetchCourses()]);
        await fetchCoursesAttendanceStats();
        if (selectedAttendanceGroupId) {
          await fetchAttendances();
          await fetchAttendanceStats();
        }
      } else if (activeTab === 'payments') {
        // КРИТИЧНО: Очищаем состояние перед загрузкой данных
        // Это гарантирует, что данные предыдущего месяца не остаются при переключении вкладок
        setPayments([]);
        setPaymentStats(null);
        await Promise.all([fetchGroups(), fetchStudents(), fetchCourses()]);
        await fetchPayments();
        await fetchPaymentStats();
      } else if (activeTab === 'branches') {
        await fetchBranches();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${API_URL}/courses`);
      if (response.ok) {
        const data = await response.json();
        console.log('[fetchCourses] Загружено курсов:', data.length);
        setCourses(data);
      } else {
        console.error('[fetchCourses] Ошибка загрузки курсов:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('[fetchCourses] Ошибка:', error);
    }
  };

  const fetchTeachers = async () => {
    const response = await fetch(`${API_URL}/teachers`);
    if (response.ok) {
      const data = await response.json();
      setTeachers(data);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch(`${API_URL}/groups`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      } else {
        console.error('Ошибка загрузки групп:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Ошибка загрузки групп:', error);
    }
  };

  const fetchGroupWithStudents = async (groupId: number) => {
    const response = await fetch(`${API_URL}/groups/${groupId}`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  };

  const fetchSchedules = async () => {
    const response = await fetch(`${API_URL}/schedules`);
    if (response.ok) {
      const data = await response.json();
      setSchedules(data);
    }
  };

  const fetchStudents = async (forceFilter?: 'active' | 'inactive' | 'all') => {
    try {
      const params = new URLSearchParams();
      if (studentSearch) {
        params.append('search', studentSearch);
      }
      
      // Используем переданный фильтр или текущий из состояния
      const filterToUse = forceFilter || studentFilterActive;
      
      // Применяем фильтр по статусу только если он явно выбран
      // Если выбран "all", не добавляем параметр isActive, чтобы получить всех студентов
      if (filterToUse === 'active') {
        params.append('isActive', 'true');
      } else if (filterToUse === 'inactive') {
        params.append('isActive', 'false');
      }
      // Если filterToUse === 'all', не добавляем параметр isActive - получим всех студентов
      
      if (studentFilterGroup) {
        params.append('groupId', studentFilterGroup.toString());
      }
      const url = `${API_URL}/students${params.toString() ? '?' + params.toString() : ''}`;
      console.log('[fetchStudents] Загрузка студентов с URL:', url);
      console.log('[fetchStudents] Текущий фильтр:', filterToUse);
      console.log('[fetchStudents] Текущая вкладка:', activeTab);
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[fetchStudents] Загружено студентов:', data.length);
        const inactiveCount = data.filter((s: any) => s.isActive === false).length;
        const activeCount = data.filter((s: any) => s.isActive === true).length;
        console.log('[fetchStudents] Активных студентов в ответе:', activeCount);
        console.log('[fetchStudents] Неактивных студентов в ответе:', inactiveCount);
        setStudents(data);
      } else {
        console.error('[fetchStudents] Ошибка ответа сервера:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('[fetchStudents] Текст ошибки:', errorText);
      }
    } catch (error) {
      console.error('Ошибка загрузки студентов:', error);
    }
  };

  const fetchAttendances = async () => {
    if (!selectedAttendanceGroupId) return;
    try {
      const response = await fetch(`${API_URL}/attendances?groupId=${selectedAttendanceGroupId}&date=${selectedAttendanceDate}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAttendances(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки посещаемости:', error);
    }
  };

  const fetchAttendanceStats = async () => {
    if (!selectedAttendanceGroupId) return;
    try {
      const response = await fetch(`${API_URL}/attendances/stats?groupId=${selectedAttendanceGroupId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Получаем количество студентов в группе
        const group = await fetchGroupWithStudents(selectedAttendanceGroupId);
        setAttendanceStats({
          ...data,
          totalStudents: group?.students?.length || 0,
          present: data.present || 0,
          absent: data.absent || 0,
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const fetchCoursesAttendanceStats = async () => {
    try {
      const url = `${API_URL}/attendances/stats/all-courses?startDate=${attendanceStartDate}&endDate=${attendanceEndDate}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCoursesAttendanceStats(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики по курсам:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      // КРИТИЧНО: paymentFilterMonth уже в формате YYYY-MM (например, "2026-02")
      // Передаем его напрямую как параметр month, БЕЗ преобразований через Date!
      if (!paymentFilterMonth) {
        console.error('[fetchPayments] paymentFilterMonth не указан');
        return;
      }

      // КРИТИЧНО: Сначала ОЧИЩАЕМ состояние перед загрузкой новых данных
      // Это гарантирует, что данные предыдущего месяца не остаются в интерфейсе
      setPayments([]); // Очищаем список платежей
      setPaymentStats(null); // Очищаем статистику
      console.log('[fetchPayments] Состояние очищено, загрузка данных за месяц:', paymentFilterMonth);

      // КРИТИЧНО: Формируем параметры запроса - передаем month напрямую в формате YYYY-MM
      const params = new URLSearchParams();
      params.append('month', paymentFilterMonth); // Передаем напрямую, БЕЗ преобразований!
      console.log('[fetchPayments] Запрос платежей за месяц:', paymentFilterMonth);
      
      // Загружаем студентов и платежи параллельно
      // КРИТИЧНО: Загружаем ТОЛЬКО платежи за выбранный месяц (не все платежи!)
      const [studentsRes, paymentsRes] = await Promise.all([
        fetch(`${API_URL}/students?isActive=true${paymentFilterGroup ? `&groupId=${paymentFilterGroup}` : ''}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_URL}/payments?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);
      
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData);
      }
      
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        // КРИТИЧНО: ПОЛНОСТЬЮ ЗАМЕНЯЕМ состояние (не мерджим, не добавляем!)
        // paymentsData уже содержит ТОЛЬКО платежи за выбранный месяц
        setPayments(paymentsData);
        console.log('[fetchPayments] Загружено платежей за месяц:', paymentsData.length);
      }
    } catch (error) {
      console.error('Ошибка загрузки платежей:', error);
      // В случае ошибки также очищаем состояние
      setPayments([]);
      setPaymentStats(null);
    }
  };

  const fetchPaymentStats = async () => {
    try {
      // КРИТИЧНО: paymentFilterMonth уже в формате YYYY-MM (например, "2026-02")
      // Передаем его напрямую как параметр month, БЕЗ преобразований через Date!
      if (!paymentFilterMonth) {
        console.error('[fetchPaymentStats] paymentFilterMonth не указан');
        return;
      }

      // КРИТИЧНО: Статистика считается ТОЛЬКО по выбранному месяцу
      const params = new URLSearchParams();
      params.append('month', paymentFilterMonth); // Передаем напрямую, БЕЗ преобразований!
      console.log('[fetchPaymentStats] Запрос статистики за месяц:', paymentFilterMonth);
      
      const response = await fetch(`${API_URL}/payments/stats?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // КРИТИЧНО: ПОЛНОСТЬЮ ЗАМЕНЯЕМ статистику (не мерджим!)
        setPaymentStats(data);
        console.log('[fetchPaymentStats] Статистика загружена для месяца:', paymentFilterMonth);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики платежей:', error);
      // В случае ошибки очищаем статистику
      setPaymentStats(null);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch(`${API_URL}/branches`);
      if (response.ok) {
        const data = await response.json();
        setBranches(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки филиалов:', error);
    }
  };

  const handleSaveBranch = async () => {
    try {
      const url = editingBranchId
        ? `${API_URL}/branches/${editingBranchId}`
        : `${API_URL}/branches`;
      const method = editingBranchId ? 'PUT' : 'POST';

      const branchData = {
        ...branchForm,
        latitude: branchForm.latitude ? parseFloat(branchForm.latitude) : null,
        longitude: branchForm.longitude ? parseFloat(branchForm.longitude) : null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(branchData),
      });

      if (response.ok) {
        await fetchBranches();
        setIsCreatingBranch(false);
        setEditingBranchId(null);
        setBranchForm({
          name: '',
          address: '',
          phone: '',
          email: '',
          hours: '',
          latitude: '',
          longitude: '',
          description: '',
          isActive: true,
        });
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка сохранения филиала');
      }
    } catch (error) {
      console.error('Ошибка сохранения филиала:', error);
      alert('Ошибка сохранения филиала');
    }
  };

  const handleEditBranch = (branch: any) => {
    setEditingBranchId(branch.id);
    setBranchForm({
      name: branch.name || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      hours: branch.hours || '',
      latitude: branch.latitude?.toString() || '',
      longitude: branch.longitude?.toString() || '',
      description: branch.description || '',
      isActive: branch.isActive !== undefined ? branch.isActive : true,
    });
  };

  const handleDeleteBranch = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот филиал?')) return;

    try {
      const response = await fetch(`${API_URL}/branches/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchBranches();
      } else {
        alert('Ошибка удаления филиала');
      }
    } catch (error) {
      console.error('Ошибка удаления филиала:', error);
      alert('Ошибка удаления филиала');
    }
  };


  const handleSaveCourse = async () => {
    try {
      const url = editingCourseId 
        ? `${API_URL}/courses/${editingCourseId}`
        : `${API_URL}/courses`;
      const method = editingCourseId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(courseForm),
      });

      if (response.ok) {
        await fetchCourses();
        setIsCreatingCourse(false);
        setEditingCourseId(null);
        setCourseForm({ name: '', description: '', price: 0, teacherId: 0 });
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка сохранения курса');
      }
    } catch (error) {
      console.error('Ошибка сохранения курса:', error);
      alert('Ошибка сохранения курса');
    }
  };

  const handleSaveGroup = async () => {
    try {
      const url = editingGroupId 
        ? `${API_URL}/groups/${editingGroupId}`
        : `${API_URL}/groups`;
      const method = editingGroupId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(groupForm),
      });

      if (response.ok) {
        await fetchGroups();
        setIsCreatingGroup(false);
        setEditingGroupId(null);
        setGroupForm({ name: '', maxStudents: 0, courseId: 0, startTime: '', endTime: '', daysOfWeek: [] });
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка сохранения группы');
      }
    } catch (error) {
      console.error('Ошибка сохранения группы:', error);
      alert('Ошибка сохранения группы');
    }
  };

  const handleSaveSchedule = async () => {
    try {
      if (editingScheduleId) {
        // При редактировании отправляем один день (обратная совместимость)
        const url = `${API_URL}/schedules/${editingScheduleId}`;
        const scheduleData = {
          dayOfWeek: scheduleForm.daysOfWeek[0] || '',
          startTime: scheduleForm.startTime,
          endTime: scheduleForm.endTime,
          groupId: scheduleForm.groupId,
        };

        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(scheduleData),
        });

        if (response.ok) {
          await fetchSchedules();
          setIsCreatingSchedule(false);
          setEditingScheduleId(null);
          setScheduleForm({ daysOfWeek: [], startTime: '', endTime: '', groupId: 0 });
        } else {
          const error = await response.json();
          alert(error.message || 'Ошибка сохранения расписания');
        }
      } else {
        // При создании отправляем массив дней
        if (scheduleForm.daysOfWeek.length === 0) {
          alert('Выберите хотя бы один день недели');
          return;
        }

        const url = `${API_URL}/schedules`;
        const scheduleData = {
          daysOfWeek: scheduleForm.daysOfWeek,
          startTime: scheduleForm.startTime,
          endTime: scheduleForm.endTime,
          groupId: scheduleForm.groupId,
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(scheduleData),
        });

        if (response.ok) {
          await fetchSchedules();
          setIsCreatingSchedule(false);
          setEditingScheduleId(null);
          setScheduleForm({ daysOfWeek: [], startTime: '', endTime: '', groupId: 0 });
        } else {
          const error = await response.json();
          alert(error.message || 'Ошибка сохранения расписания');
        }
      }
    } catch (error) {
      console.error('Ошибка сохранения расписания:', error);
      alert('Ошибка сохранения расписания');
    }
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот курс?')) return;
    
    try {
      const response = await fetch(`${API_URL}/courses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchCourses();
      } else {
        alert('Ошибка удаления курса');
      }
    } catch (error) {
      console.error('Ошибка удаления курса:', error);
      alert('Ошибка удаления курса');
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setCourseForm({
      name: course.name,
      description: course.description || '',
      price: course.price || 0,
      teacherId: course.teacherId,
    });
  };

  const handleEditGroup = (group: any) => {
    setEditingGroupId(group.id);
    // Загружаем дни недели из расписания группы
    const daysOfWeek = group.schedules && Array.isArray(group.schedules) 
      ? group.schedules.map((s: Schedule) => s.dayOfWeek)
      : [];
    setGroupForm({
      name: group.name,
      maxStudents: group.maxStudents,
      courseId: group.courseId,
      startTime: group.startTime || '',
      endTime: group.endTime || '',
      daysOfWeek: daysOfWeek,
    });
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingScheduleId(schedule.id);
    setScheduleForm({
      daysOfWeek: [schedule.dayOfWeek],
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      groupId: schedule.groupId,
    });
  };

  const handleSaveStudent = async () => {
    try {
      // Валидация - только имя и группа обязательны
      if (!studentForm.firstName || studentForm.firstName.trim() === '') {
        alert('Имя обязательно для заполнения');
        return;
      }

      if (!studentForm.courseId || studentForm.courseId === 0) {
        alert('Необходимо выбрать курс');
        return;
      }
      if (!studentForm.groupId || studentForm.groupId === 0) {
        alert('Необходимо выбрать группу');
        return;
      }

      const url = editingStudentId 
        ? `${API_URL}/students/${editingStudentId}`
        : `${API_URL}/students`;
      const method = editingStudentId ? 'PUT' : 'POST';

      // Подготавливаем данные - пустые строки преобразуем в null
      const studentData: any = {
        firstName: studentForm.firstName.trim(),
        groupId: studentForm.groupId,
      };

      if (studentForm.lastName && studentForm.lastName.trim() !== '') {
        studentData.lastName = studentForm.lastName.trim();
      }
      if (studentForm.email && studentForm.email.trim() !== '') {
        studentData.email = studentForm.email.trim();
      }
      if (studentForm.phone && studentForm.phone.trim() !== '') {
        studentData.phone = studentForm.phone.trim();
      }
      if (studentForm.dateOfBirth) {
        studentData.dateOfBirth = studentForm.dateOfBirth;
      }
      if (studentForm.address && studentForm.address.trim() !== '') {
        studentData.address = studentForm.address.trim();
      }
      if (studentForm.notes && studentForm.notes.trim() !== '') {
        studentData.notes = studentForm.notes.trim();
      }
      if (studentForm.parentName && studentForm.parentName.trim() !== '') {
        studentData.parentName = studentForm.parentName.trim();
      }
      if (studentForm.parentPhone && studentForm.parentPhone.trim() !== '') {
        studentData.parentPhone = studentForm.parentPhone.trim();
      }
      // Логин и пароль (только для админа)
      if (studentForm.username && studentForm.username.trim() !== '') {
        studentData.username = studentForm.username.trim();
      }
      if (studentForm.password && studentForm.password.trim() !== '') {
        studentData.password = studentForm.password.trim();
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(studentData),
      });

      if (response.ok) {
        await fetchStudents();
        setIsCreatingStudent(false);
        setEditingStudentId(null);
        setStudentForm({ firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', address: '', courseId: 0, groupId: 0, notes: '', username: '', password: '', parentName: '', parentPhone: '' });
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка сохранения студента');
      }
    } catch (error) {
      console.error('Ошибка сохранения студента:', error);
      alert('Ошибка сохранения студента');
    }
  };

  const handleSaveTeacher = async () => {
    try {
      // Валидация
      if (!teacherForm.firstName || !teacherForm.lastName) {
        alert('Имя и фамилия обязательны для заполнения');
        return;
      }

      if (!editingTeacherId && (!teacherForm.username || !teacherForm.password)) {
        alert('При создании преподавателя необходимо указать логин и пароль для входа в систему');
        return;
      }

      // При редактировании: если указан логин, но нет пароля - требуем пароль
      if (editingTeacherId && teacherForm.username && !teacherForm.password) {
        // Проверяем, есть ли у преподавателя уже аккаунт
        const currentTeacher = teachers.find(t => t.id === editingTeacherId);
        if (!currentTeacher?.user && teacherForm.username) {
          alert('При создании аккаунта для преподавателя необходимо указать пароль');
          return;
        }
      }

      if (teacherForm.password && teacherForm.password.length < 6) {
        alert('Пароль должен содержать минимум 6 символов');
        return;
      }

      // Валидация editingTeacherId - должен быть числом
      let teacherId: number | null = null;
      if (editingTeacherId) {
        // Преобразуем в число, если это строка
        const numId = typeof editingTeacherId === 'string' ? parseInt(editingTeacherId, 10) : editingTeacherId;
        if (isNaN(numId) || numId <= 0) {
          console.error('Некорректный ID преподавателя:', editingTeacherId);
          alert('Ошибка: некорректный ID преподавателя');
          return;
        }
        teacherId = numId;
      }

      // Нормализуем API_URL - убеждаемся что он начинается с http:// или https://
      let baseUrl = API_URL;
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        // Если начинается с :, добавляем localhost
        if (baseUrl.startsWith(':')) {
          baseUrl = `http://localhost${baseUrl}`;
        } else {
          baseUrl = `http://${baseUrl}`;
        }
        console.warn('[handleSaveTeacher] API_URL нормализован до:', baseUrl);
      }
      
      // Убираем завершающие слеши
      baseUrl = baseUrl.replace(/\/+$/, '');
      
      // Формируем URL
      const url = teacherId 
        ? `${baseUrl}/teachers/${teacherId}`
        : `${baseUrl}/teachers`;
      const method = teacherId ? 'PUT' : 'POST';

      // Логирование для отладки
      console.log('[handleSaveTeacher] API_URL:', API_URL);
      console.log('[handleSaveTeacher] baseUrl:', baseUrl);
      console.log('[handleSaveTeacher] editingTeacherId:', editingTeacherId, 'тип:', typeof editingTeacherId);
      console.log('[handleSaveTeacher] Формируемый URL:', url);
      console.log('[handleSaveTeacher] Метод:', method);

      // Проверка корректности URL
      try {
        const urlObj = new URL(url);
        console.log('[handleSaveTeacher] URL валиден:', urlObj.href);
      } catch (e: any) {
        console.error('[handleSaveTeacher] Некорректный URL:', url, 'Ошибка:', e?.message || e);
        alert(`Ошибка: некорректный URL API (${url}). Проверьте настройки VITE_API_URL в .env файле. Ожидается формат: http://localhost:3000/api`);
        return;
      }

      // Подготавливаем данные для отправки
      const teacherData: any = {
        firstName: teacherForm.firstName,
        lastName: teacherForm.lastName,
        email: teacherForm.email && teacherForm.email.trim() !== '' ? teacherForm.email.trim() : null,
        isActive: teacherForm.isActive,
      };

      if (teacherForm.phone) teacherData.phone = teacherForm.phone;
      if (teacherForm.specialization) teacherData.specialization = teacherForm.specialization;
      if (teacherForm.bio) teacherData.bio = teacherForm.bio;
      
      // Добавляем ID курсов, которые преподает преподаватель
      if (teacherForm.courseIds && teacherForm.courseIds.length > 0) {
        teacherData.courseIds = teacherForm.courseIds;
      }

      // При создании добавляем логин и пароль
      if (!editingTeacherId) {
        teacherData.username = teacherForm.username;
        teacherData.password = teacherForm.password;
      } else {
        // При редактировании добавляем только если указаны и изменились
        const currentTeacher = teachers.find(t => t.id === editingTeacherId);
        
        // Добавляем username только если он указан и отличается от текущего
        if (teacherForm.username && teacherForm.username.trim() !== '') {
          const currentUsername = currentTeacher?.user?.username || '';
          // Отправляем username только если он изменился
          if (teacherForm.username !== currentUsername) {
            teacherData.username = teacherForm.username;
          }
          // Если у преподавателя еще нет аккаунта и указан логин - требуем пароль
          if (!currentTeacher?.user && !teacherForm.password) {
            alert('При создании аккаунта для преподавателя необходимо указать пароль');
            return;
          }
        }
        
        // Добавляем пароль только если он указан
        if (teacherForm.password && teacherForm.password.trim() !== '') {
          teacherData.password = teacherForm.password;
        }
      }

      // Проверка доступности сервера перед запросом (необязательная проверка)
      // Если сервер недоступен, fetch сам выдаст ошибку, которую мы обработаем ниже

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(teacherData),
        signal: AbortSignal.timeout(10000), // Таймаут 10 секунд для запроса
      });

      if (response.ok) {
        await fetchTeachers();
        setIsCreatingTeacher(false);
        setEditingTeacherId(null);
        setTeacherForm({ firstName: '', lastName: '', email: '', phone: '', specialization: '', bio: '', username: '', password: '', isActive: true, courseIds: [] });
        alert('Преподаватель успешно сохранен!');
      } else {
        const error = await response.json().catch(() => ({ message: 'Неизвестная ошибка сервера' }));
        alert(`Ошибка сохранения преподавателя: ${error.message || 'Неизвестная ошибка'}`);
      }
    } catch (error: any) {
      console.error('Ошибка сохранения преподавателя:', error);
      if (error.name === 'AbortError') {
        alert('❌ Превышено время ожидания ответа от сервера. Проверьте, что сервер запущен и доступен.');
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        const errorMessage = `❌ Ошибка подключения к серверу!\n\n` +
          `Backend сервер не запущен или недоступен.\n\n` +
          `Для исправления:\n` +
          `1. Откройте отдельное окно терминала\n` +
          `2. Перейдите в папку проекта: cd c:\\Users\\user\\Desktop\\studycenter\n` +
          `3. Запустите backend сервер: npm run dev\n` +
          `4. Дождитесь сообщения "🚀 Сервер запущен на порту 3000"\n` +
          `5. Обновите страницу в браузере (F5)\n\n` +
          `Backend и Frontend должны работать одновременно!`;
        alert(errorMessage);
      } else {
        alert(`Ошибка сохранения преподавателя: ${error.message || 'Неизвестная ошибка'}`);
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchCoursesAttendanceStats();
      if (selectedAttendanceGroupId) {
        fetchAttendances();
        fetchAttendanceStats();
      }
    }
  }, [selectedAttendanceGroupId, selectedAttendanceDate, activeTab, attendanceStartDate, attendanceEndDate]);

  const handleSavePayment = async () => {
    try {
      // Проверяем статус сервера перед сохранением
      if (serverStatus === 'offline') {
        const confirmed = confirm(
          '⚠️ Backend сервер недоступен!\n\n' +
          'Не удалось подключиться к серверу. Продолжить попытку сохранения?\n\n' +
          'Рекомендуется сначала запустить сервер:\n' +
          '1. Откройте PowerShell в папке проекта\n' +
          '2. Выполните: npm run dev\n' +
          '3. Дождитесь запуска сервера'
        );
        if (!confirmed) return;
      }

      if (!token) {
        alert('Ошибка: отсутствует токен авторизации. Пожалуйста, войдите заново.');
        return;
      }

      if (!paymentForm.studentId || paymentForm.studentId === 0) {
        alert('Выберите студента');
        return;
      }
      if (!paymentForm.amount || paymentForm.amount <= 0) {
        alert('Введите корректную сумму');
        return;
      }

      // Проверяем доступность сервера перед отправкой
      try {
        // Получаем базовый URL без /api
        const baseUrl = API_URL.replace('/api', '');
        const healthUrl = `${baseUrl}/health`;
        
        console.log('[handleSavePayment] Проверка доступности сервера:', healthUrl);
        
        const healthCheck = await fetch(healthUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // Увеличиваем таймаут до 5 секунд
        }).catch((error) => {
          console.error('[handleSavePayment] Ошибка health check:', error);
          return null;
        });
        
        if (!healthCheck || !healthCheck.ok) {
          const errorMsg = `Сервер недоступен по адресу ${baseUrl}.\n\n` +
            `Убедитесь, что:\n` +
            `1. Backend сервер запущен (npm run dev в корневой папке проекта)\n` +
            `2. Сервер работает на порту 3000\n` +
            `3. URL настроен правильно: ${API_URL}`;
          throw new Error(errorMsg);
        }
        
        console.log('[handleSavePayment] Сервер доступен, продолжаем отправку');
      } catch (healthError: any) {
        if (healthError.name === 'AbortError' || healthError.name === 'TimeoutError') {
          const baseUrl = API_URL.replace('/api', '');
          const errorMsg = `Сервер не отвечает по адресу ${baseUrl} (таймаут 5 секунд).\n\n` +
            `Убедитесь, что:\n` +
            `1. Backend сервер запущен: npm run dev\n` +
            `2. Сервер работает на порту 3000\n` +
            `3. Проверьте консоль backend на наличие ошибок`;
          throw new Error(errorMsg);
        }
        throw healthError;
      }

      const url = editingPaymentId 
        ? `${API_URL}/payments/${editingPaymentId}`
        : `${API_URL}/payments`;
      const method = editingPaymentId ? 'PUT' : 'POST';

      console.log('[handleSavePayment] API_URL:', API_URL);
      console.log('[handleSavePayment] Отправка запроса:', { url, method, paymentForm });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(paymentForm),
      }).catch((fetchError: any) => {
        console.error('[handleSavePayment] Ошибка fetch:', fetchError);
        
        // Более детальное сообщение об ошибке
        let errorMessage = 'Не удалось подключиться к серверу.\n\n';
        
        if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('ERR_CONNECTION_REFUSED')) {
          errorMessage += `Ошибка подключения: ${fetchError.message}\n\n` +
            `Возможные причины:\n` +
            `1. Backend сервер не запущен\n` +
            `   Решение: Откройте терминал в корневой папке проекта и выполните: npm run dev\n\n` +
            `2. Сервер работает на другом порту\n` +
            `   Проверьте: ${API_URL}\n\n` +
            `3. Проблемы с сетью или файрволом\n` +
            `   Проверьте, что порт 3000 не заблокирован`;
        } else {
          errorMessage += `Детали ошибки: ${fetchError.message}\n\n` +
            `Проверьте:\n` +
            `1. Запущен ли backend: npm run dev\n` +
            `2. Правильность URL: ${API_URL}`;
        }
        
        throw new Error(errorMessage);
      });

      console.log('[handleSavePayment] Ответ сервера:', response.status, response.statusText);

      if (response.ok) {
        await fetchPayments();
        await fetchPaymentStats();
        await fetchStudents(); // Обновляем список студентов для пересчета долга
        setIsCreatingPayment(false);
        setEditingPaymentId(null);
        setPaymentForm({ studentId: 0, courseId: 0, amount: 0, status: 'pending', paymentDate: new Date().toISOString().split('T')[0], dueDate: '', paymentMethod: '', notes: '' });
        alert(editingPaymentId ? 'Платеж успешно обновлен' : 'Платеж успешно создан');
      } else {
        let errorMessage = 'Ошибка сохранения платежа';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `Ошибка сервера: ${response.status} ${response.statusText}`;
        }
        alert(errorMessage);
      }
    } catch (error: any) {
      console.error('Ошибка сохранения платежа:', error);
      const errorMessage = error.message || 'Неизвестная ошибка';
      
      // Форматируем сообщение для alert (поддерживает переносы строк)
      const formattedMessage = errorMessage
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .join('\n');
      
      alert(`❌ Ошибка сохранения платежа\n\n${formattedMessage}\n\nТекущий API URL: ${API_URL}`);
    }
  };

  const handleMarkAsPaid = async (paymentId: number) => {
    try {
      const payment = payments.find(p => p.id === paymentId);
      const paymentMethod = prompt('Способ оплаты (наличные, карта, перевод):', payment?.paymentMethod || '');
      if (paymentMethod === null) return;

      const notes = prompt('Примечание (необязательно):', payment?.notes || '') || '';

      const response = await fetch(`${API_URL}/payments/${paymentId}/mark-paid`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMethod, notes }),
      });

      if (response.ok) {
        await fetchPayments();
        await fetchPaymentStats();
        alert('Платеж отмечен как оплаченный');
      } else {
        const error = await response.json();
        alert(error.message || 'Ошибка отметки платежа');
      }
    } catch (error) {
      console.error('Ошибка отметки платежа:', error);
      alert('Ошибка отметки платежа');
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) {
        alert('Платеж не найден');
        return;
      }

      const studentName = payment.student 
        ? `${payment.student.firstName} ${payment.student.lastName || ''}`.trim()
        : 'студента';
      
      const monthName = payment.month 
        ? new Date(payment.month + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
        : 'месяц';

      const confirmed = confirm(
        `Вы уверены, что хотите удалить платеж?\n\n` +
        `Студент: ${studentName}\n` +
        `Месяц: ${monthName}\n` +
        `Сумма: ${parseFloat(payment.amount).toLocaleString('ru-RU')} сом\n` +
        `Статус: ${payment.status === 'paid' ? 'Оплачено' : payment.status === 'pending' ? 'Ожидает оплаты' : payment.status === 'overdue' ? 'Просрочено' : 'Возврат'}\n\n` +
        `Это действие нельзя отменить!`
      );

      if (!confirmed) return;

      const response = await fetch(`${API_URL}/payments/${paymentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchPayments();
        await fetchPaymentStats();
        alert('Платеж успешно удален');
      } else {
        const error = await response.json().catch(() => ({ message: 'Ошибка удаления платежа' }));
        alert(error.message || 'Ошибка удаления платежа');
      }
    } catch (error) {
      console.error('Ошибка удаления платежа:', error);
      alert('Ошибка удаления платежа');
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Админ-панель</h1>
          <p className="text-gray-600">Управление системой учебного центра</p>
        </motion.div>

        {/* Navigation Buttons */}
        <div className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { id: 'students', label: 'Студенты', icon: GraduationCap, bgClass: 'from-blue-100 to-blue-200', textClass: 'text-blue-600' },
              { id: 'trash', label: 'Корзина', icon: Trash2, bgClass: 'from-gray-100 to-gray-200', textClass: 'text-gray-600' },
              { id: 'teachers', label: 'Преподаватели', icon: UserCheck, bgClass: 'from-green-100 to-green-200', textClass: 'text-green-600' },
              { id: 'courses', label: 'Курсы', icon: BookOpen, bgClass: 'from-indigo-100 to-indigo-200', textClass: 'text-indigo-600' },
              { id: 'groups', label: 'Группы и расписание', icon: Users, bgClass: 'from-cyan-100 to-cyan-200', textClass: 'text-cyan-600' },
              { id: 'attendance', label: 'Посещаемость', icon: Eye, bgClass: 'from-red-100 to-red-200', textClass: 'text-red-600' },
              { id: 'payments', label: 'Платежи', icon: CreditCard, bgClass: 'from-emerald-100 to-emerald-200', textClass: 'text-emerald-600' },
              { id: 'branches', label: 'Филиалы', icon: MapPin, bgClass: 'from-pink-100 to-pink-200', textClass: 'text-pink-600' },
              { id: 'reports', label: 'Отчёты', icon: BarChart3, bgClass: 'from-amber-100 to-amber-200', textClass: 'text-amber-600' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`card-gradient p-6 text-center transition-all duration-300 ${
                    isActive
                      ? 'ring-4 ring-primary-500 shadow-2xl scale-105'
                      : 'hover:shadow-xl'
                  }`}
                >
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-gradient-to-br ${
                    isActive
                      ? 'from-primary-500 to-accent-500 text-white shadow-lg'
                      : `${tab.bgClass} ${tab.textClass}`
                  }`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className={`font-bold text-lg ${
                    isActive ? 'gradient-text' : 'text-gray-700'
                  }`}>
                    {tab.label}
                  </h3>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg mb-8">

          <div className="p-8">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Загрузка...</div>
            ) : (
              <>
                {/* Courses Tab */}
                {activeTab === 'courses' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Управление курсами</h2>
                      <button onClick={() => { setIsCreatingCourse(true); setEditingCourseId(null); setCourseForm({ name: '', description: '', price: 0, teacherId: 0 }); }} className="btn-primary flex items-center space-x-2">
                        <Plus className="w-4 h-4" />
                        <span>Создать курс</span>
                      </button>
                    </div>

                    {(isCreatingCourse || editingCourseId) && (
                      <div className="mb-6 p-6 bg-gray-50 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4">{editingCourseId ? 'Редактировать курс' : 'Создать курс'}</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Название</label>
                            <input type="text" value={courseForm.name} onChange={(e) => setCourseForm({...courseForm, name: e.target.value})} className="input" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Преподаватель</label>
                            <select value={courseForm.teacherId} onChange={(e) => setCourseForm({...courseForm, teacherId: parseInt(e.target.value)})} className="input">
                              <option value="0">Выберите преподавателя</option>
                              {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Цена (сом)</label>
                            <input type="number" value={courseForm.price} onChange={(e) => setCourseForm({...courseForm, price: parseFloat(e.target.value)})} className="input" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Описание</label>
                            <textarea value={courseForm.description} onChange={(e) => setCourseForm({...courseForm, description: e.target.value})} className="input" rows={3} />
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <button onClick={handleSaveCourse} className="btn-primary">Сохранить</button>
                          <button onClick={() => { setIsCreatingCourse(false); setEditingCourseId(null); }} className="btn-secondary">Отмена</button>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Преподаватель</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Цена</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {courses.map((course) => (
                            <tr key={course.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{course.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{course.price?.toLocaleString()} сом</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <button onClick={() => handleEditCourse(course)} className="text-primary-600 hover:text-primary-700">
                                  <Edit className="w-4 h-4 inline" />
                                </button>
                                <button onClick={() => handleDeleteCourse(course.id)} className="text-red-600 hover:text-red-700">
                                  <Trash2 className="w-4 h-4 inline" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Groups Tab */}
                {activeTab === 'groups' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Управление группами</h2>
                      <button onClick={() => { setIsCreatingGroup(true); setEditingGroupId(null); setGroupForm({ name: '', maxStudents: 0, courseId: 0, startTime: '', endTime: '', daysOfWeek: [] }); }} className="btn-primary flex items-center space-x-2">
                        <Plus className="w-4 h-4" />
                        <span>Создать группу</span>
                      </button>
                    </div>

                    {(isCreatingGroup || editingGroupId) && (
                      <div className="mb-6 p-6 bg-gray-50 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4">{editingGroupId ? 'Редактировать группу' : 'Создать группу'}</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Название</label>
                            <input type="text" value={groupForm.name} onChange={(e) => setGroupForm({...groupForm, name: e.target.value})} className="input" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Курс</label>
                            <select value={groupForm.courseId} onChange={(e) => setGroupForm({...groupForm, courseId: parseInt(e.target.value)})} className="input">
                              <option value="0">Выберите курс</option>
                              {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Макс. студентов</label>
                            <input type="number" value={groupForm.maxStudents} onChange={(e) => setGroupForm({...groupForm, maxStudents: parseInt(e.target.value)})} className="input" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Время начала занятий</label>
                            <input type="time" value={groupForm.startTime} onChange={(e) => setGroupForm({...groupForm, startTime: e.target.value})} className="input" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Время окончания занятий</label>
                            <input type="time" value={groupForm.endTime} onChange={(e) => setGroupForm({...groupForm, endTime: e.target.value})} className="input" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Дни недели занятий</label>
                            <div className="grid grid-cols-4 gap-2 mt-2">
                              {['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'].map((day) => (
                                <label key={day} className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={groupForm.daysOfWeek.includes(day)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setGroupForm({...groupForm, daysOfWeek: [...groupForm.daysOfWeek, day]});
                                      } else {
                                        setGroupForm({...groupForm, daysOfWeek: groupForm.daysOfWeek.filter(d => d !== day)});
                                      }
                                    }}
                                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                  />
                                  <span className="text-sm text-gray-700">{day}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <button onClick={handleSaveGroup} className="btn-primary">Сохранить</button>
                          <button onClick={() => { setIsCreatingGroup(false); setEditingGroupId(null); setGroupForm({ name: '', maxStudents: 0, courseId: 0, startTime: '', endTime: '', daysOfWeek: [] }); }} className="btn-secondary">Отмена</button>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Курс</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Макс. студентов</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Время занятий</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {groups.map((group) => (
                            <>
                              <tr key={group.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{group.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.course?.name || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.maxStudents}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {group.startTime && group.endTime ? `${group.startTime} - ${group.endTime}` : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                  <button onClick={() => handleEditGroup(group)} className="text-primary-600 hover:text-primary-700 mr-2" title="Редактировать группу">
                                    <Edit className="w-4 h-4 inline" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setExpandedGroupId(expandedGroupId === group.id ? null : group.id);
                                      setSelectedGroupForSchedule(group.id);
                                    }} 
                                    className="text-accent-600 hover:text-accent-700"
                                    title="Управление расписанием"
                                  >
                                    <Calendar className="w-4 h-4 inline" />
                                  </button>
                                </td>
                              </tr>
                              {expandedGroupId === group.id && (
                                <tr>
                                <td colSpan={5} className="px-6 py-4 bg-gray-50">
                                  <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                      <h4 className="font-semibold text-gray-900">Расписание группы "{group.name}"</h4>
                                      <button
                                        onClick={() => {
                                          setIsCreatingSchedule(true);
                                          setEditingScheduleId(null);
                                          setScheduleForm({ daysOfWeek: [], startTime: '', endTime: '', groupId: group.id });
                                        }}
                                        className="btn-primary text-sm flex items-center space-x-2"
                                      >
                                        <Plus className="w-4 h-4" />
                                        <span>Добавить расписание</span>
                                      </button>
                                    </div>

                                    {(isCreatingSchedule || editingScheduleId) && scheduleForm.groupId === group.id && (
                                      <div className="p-4 bg-white rounded-lg border border-gray-200">
                                        <h5 className="text-md font-semibold mb-4">{editingScheduleId ? 'Редактировать расписание' : 'Создать расписание'}</h5>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Дни недели (можно выбрать несколько)</label>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                              {['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'].map((day) => (
                                                <label key={day} className="flex items-center space-x-2 cursor-pointer">
                                                  <input
                                                    type="checkbox"
                                                    checked={scheduleForm.daysOfWeek.includes(day)}
                                                    onChange={(e) => {
                                                      if (e.target.checked) {
                                                        setScheduleForm({...scheduleForm, daysOfWeek: [...scheduleForm.daysOfWeek, day]});
                                                      } else {
                                                        setScheduleForm({...scheduleForm, daysOfWeek: scheduleForm.daysOfWeek.filter(d => d !== day)});
                                                      }
                                                    }}
                                                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                                  />
                                                  <span className="text-sm text-gray-700">{day}</span>
                                                </label>
                                              ))}
                                            </div>
                                          </div>
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Время начала</label>
                                            <input type="time" value={scheduleForm.startTime} onChange={(e) => setScheduleForm({...scheduleForm, startTime: e.target.value})} className="input" />
                                          </div>
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Время окончания</label>
                                            <input type="time" value={scheduleForm.endTime} onChange={(e) => setScheduleForm({...scheduleForm, endTime: e.target.value})} className="input" />
                                          </div>
                                        </div>
                                        <div className="flex space-x-2 mt-4">
                                          <button onClick={handleSaveSchedule} className="btn-primary">Сохранить</button>
                                          <button onClick={() => { setIsCreatingSchedule(false); setEditingScheduleId(null); }} className="btn-secondary">Отмена</button>
                                        </div>
                                      </div>
                                    )}

                                    <div className="overflow-x-auto">
                                      <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-100">
                                          <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">День</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Время</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                          {schedules.filter(s => s.groupId === group.id).length > 0 ? (
                                            schedules.filter(s => s.groupId === group.id).map((schedule) => (
                                              <tr key={schedule.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{schedule.dayOfWeek}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{schedule.startTime} - {schedule.endTime}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium space-x-2">
                                                  <button onClick={() => handleEditSchedule(schedule)} className="text-primary-600 hover:text-primary-700">
                                                    <Edit className="w-4 h-4 inline" />
                                                  </button>
                                                  <button onClick={async () => {
                                                    if (!confirm('Вы уверены, что хотите удалить это расписание?')) return;
                                                    try {
                                                      const response = await fetch(`${API_URL}/schedules/${schedule.id}`, {
                                                        method: 'DELETE',
                                                        headers: { 'Authorization': `Bearer ${token}` },
                                                      });
                                                      if (response.ok) {
                                                        await fetchSchedules();
                                                      } else {
                                                        alert('Ошибка удаления расписания');
                                                      }
                                                    } catch (error) {
                                                      console.error('Ошибка удаления расписания:', error);
                                                      alert('Ошибка удаления расписания');
                                                    }
                                                  }} className="text-red-600 hover:text-red-700">
                                                    <Trash2 className="w-4 h-4 inline" />
                                                  </button>
                                                </td>
                                              </tr>
                                            ))
                                          ) : (
                                            <tr>
                                              <td colSpan={3} className="px-4 py-4 text-center text-sm text-gray-500">
                                                Расписание не добавлено
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              )}
                            </>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}


                {/* Reports Tab */}
                {/* Students Tab */}
                {activeTab === 'students' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Банк данных студентов</h2>
                      <button onClick={async () => { 
                        // Убеждаемся, что курсы загружены перед открытием формы
                        if (courses.length === 0) {
                          await fetchCourses();
                        }
                        setIsCreatingStudent(true); 
                        setEditingStudentId(null); 
                        setStudentForm({ firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', address: '', courseId: 0, groupId: 0, notes: '', username: '', password: '', parentName: '', parentPhone: '' }); 
                      }} className="btn-primary flex items-center space-x-2">
                        <Plus className="w-4 h-4" />
                        <span>Создать студента</span>
                      </button>
                    </div>

                    {/* Поиск и фильтры */}
                    <div className="mb-6 p-6 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Поиск</label>
                          <input
                            type="text"
                            placeholder="Имя, фамилия, email, телефон..."
                            value={studentSearch}
                            onChange={(e) => { setStudentSearch(e.target.value); }}
                            onKeyPress={(e) => { if (e.key === 'Enter') fetchStudents(); }}
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Курс</label>
                          <select
                            value={studentFilterCourse || ''}
                            onChange={(e) => { 
                              const selectedCourseId = e.target.value ? parseInt(e.target.value) : null;
                              setStudentFilterCourse(selectedCourseId);
                              // При изменении курса сбрасываем фильтр по группе
                              setStudentFilterGroup(null);
                            }}
                            className="input"
                          >
                            <option value="">Все курсы</option>
                            {courses.map(course => (
                              <option key={course.id} value={course.id}>{course.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Группа</label>
                          <select
                            value={studentFilterGroup || ''}
                            onChange={(e) => { setStudentFilterGroup(e.target.value ? parseInt(e.target.value) : null); }}
                            className="input"
                            disabled={studentFilterCourse !== null && studentFilterCourse !== 0 && groups.filter(g => g.courseId === studentFilterCourse).length === 0}
                          >
                            <option value="">Все группы</option>
                            {(studentFilterCourse && studentFilterCourse !== 0
                              ? groups.filter(g => g.courseId === studentFilterCourse)
                              : groups
                            ).map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                          {studentFilterCourse && studentFilterCourse !== 0 && groups.filter(g => g.courseId === studentFilterCourse).length === 0 && (
                            <p className="text-xs text-gray-500 mt-1">В этом курсе нет групп</p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => fetchStudents()} className="btn-primary mt-4">Применить фильтры</button>
                    </div>

                    {(isCreatingStudent || editingStudentId) && (
                      <div className="mb-6 p-6 bg-gray-50 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4">{editingStudentId ? 'Редактировать студента' : 'Создать студента'}</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Имя *</label>
                            <input type="text" value={studentForm.firstName} onChange={(e) => setStudentForm({...studentForm, firstName: e.target.value})} className="input" required />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Фамилия</label>
                            <input type="text" value={studentForm.lastName} onChange={(e) => setStudentForm({...studentForm, lastName: e.target.value})} className="input" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input type="email" value={studentForm.email} onChange={(e) => setStudentForm({...studentForm, email: e.target.value})} className="input" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
                            <input type="tel" value={studentForm.phone} onChange={(e) => setStudentForm({...studentForm, phone: e.target.value})} className="input" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Дата рождения</label>
                            <input type="date" value={studentForm.dateOfBirth} onChange={(e) => setStudentForm({...studentForm, dateOfBirth: e.target.value})} className="input" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Курс *</label>
                            <select 
                              value={studentForm.courseId} 
                              onChange={(e) => {
                                const selectedCourseId = parseInt(e.target.value);
                                // При изменении курса сбрасываем выбранную группу
                                setStudentForm({...studentForm, courseId: selectedCourseId, groupId: 0});
                              }} 
                              className="input" 
                              required
                            >
                              <option value="0">Выберите курс</option>
                              {courses && courses.length > 0 ? (
                                courses.map(course => (
                                  <option key={course.id} value={course.id}>{course.name}</option>
                                ))
                              ) : (
                                <option value="0" disabled>Загрузка курсов...</option>
                              )}
                            </select>
                            {courses && courses.length === 0 && (
                              <p className="text-xs text-gray-500 mt-1">Сначала создайте курс во вкладке "Курсы"</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Группа *</label>
                            <select 
                              value={studentForm.groupId} 
                              onChange={(e) => setStudentForm({...studentForm, groupId: parseInt(e.target.value)})} 
                              className="input" 
                              required
                              disabled={!studentForm.courseId || studentForm.courseId === 0}
                            >
                              <option value="0">
                                {!studentForm.courseId || studentForm.courseId === 0 
                                  ? 'Сначала выберите курс' 
                                  : 'Выберите группу'}
                              </option>
                              {groups
                                .filter(g => g.courseId === studentForm.courseId)
                                .map(g => (
                                  <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                            {studentForm.courseId && studentForm.courseId !== 0 && groups.filter(g => g.courseId === studentForm.courseId).length === 0 && (
                              <p className="text-xs text-red-500 mt-1">В этом курсе нет групп</p>
                            )}
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Адрес</label>
                            <input type="text" value={studentForm.address} onChange={(e) => setStudentForm({...studentForm, address: e.target.value})} className="input" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Примечания</label>
                            <textarea value={studentForm.notes} onChange={(e) => setStudentForm({...studentForm, notes: e.target.value})} className="input" rows={3} />
                          </div>
                          <div className="col-span-2 border-t pt-4 mt-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Данные родителя (опционально)</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">ФИО родителя</label>
                                <input 
                                  type="text" 
                                  value={studentForm.parentName} 
                                  onChange={(e) => setStudentForm({...studentForm, parentName: e.target.value})} 
                                  className="input" 
                                  placeholder="Иванов Иван Иванович"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Телефон родителя</label>
                                <input 
                                  type="tel" 
                                  value={studentForm.parentPhone} 
                                  onChange={(e) => setStudentForm({...studentForm, parentPhone: e.target.value})} 
                                  className="input" 
                                  placeholder="+996 555 123456"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="col-span-2 border-t pt-4 mt-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Учетные данные для входа (опционально)</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Логин</label>
                                <input 
                                  type="text" 
                                  value={studentForm.username} 
                                  onChange={(e) => setStudentForm({...studentForm, username: e.target.value})} 
                                  className="input" 
                                  placeholder="Оставьте пустым, если не нужно создавать аккаунт"
                                />
                                <p className="text-xs text-gray-500 mt-1">При создании: создаст новый аккаунт. При редактировании: изменит логин существующего аккаунта</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
                                <input 
                                  type="password" 
                                  value={studentForm.password} 
                                  onChange={(e) => setStudentForm({...studentForm, password: e.target.value})} 
                                  className="input" 
                                  placeholder="Минимум 6 символов"
                                />
                                <p className="text-xs text-gray-500 mt-1">Оставьте пустым при редактировании, чтобы не менять пароль</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <button onClick={handleSaveStudent} className="btn-primary">Сохранить</button>
                          <button onClick={() => { setIsCreatingStudent(false); setEditingStudentId(null); setStudentForm({ firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', address: '', courseId: 0, groupId: 0, notes: '', username: '', password: '', parentName: '', parentPhone: '' }); }} className="btn-secondary">Отмена</button>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Имя</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Телефон</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Группа</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {students.filter(student => student.isActive !== false).map((student) => (
                            <tr key={student.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {student.firstName} {student.lastName}
                                {student.dateLeft && (
                                  <span className="block text-xs text-gray-500 mt-1">
                                    Ушел: {new Date(student.dateLeft).toLocaleDateString('ru-RU')}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.phone || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.group?.name || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  student.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {student.isActive ? 'Активен' : 'Неактивен'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <button onClick={() => { 
                                  // Определяем курс из группы студента
                                  const studentGroup = groups.find(g => g.id === student.groupId);
                                  const courseId = studentGroup?.courseId || 0;
                                  setEditingStudentId(student.id); 
                                  setStudentForm({ 
                                    firstName: student.firstName, 
                                    lastName: student.lastName || '', 
                                    email: student.email || '', 
                                    phone: student.phone || '', 
                                    dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '', 
                                    address: student.address || '', 
                                    courseId: courseId,
                                    groupId: student.groupId || 0, 
                                    notes: student.notes || '', 
                                    username: '', 
                                    password: '', 
                                    parentName: student.parentName || '', 
                                    parentPhone: student.parentPhone || '' 
                                  }); 
                                }} className="text-primary-600 hover:text-primary-700">
                                  <Edit className="w-4 h-4 inline" />
                                </button>
                                {!student.isActive && (
                                  <button 
                                    onClick={async () => {
                                      if (confirm('Восстановить студента?')) {
                                        try {
                                          const response = await fetch(`${API_URL}/students/${student.id}/restore`, {
                                            method: 'PATCH',
                                            headers: { 'Authorization': `Bearer ${token}` },
                                          });
                                          if (response.ok) {
                                            await fetchStudents();
                                            alert('Студент восстановлен');
                                          }
                                        } catch (error) {
                                          alert('Ошибка восстановления студента');
                                        }
                                      }
                                    }}
                                    className="text-green-600 hover:text-green-700"
                                    title="Восстановить"
                                  >
                                    <Save className="w-4 h-4 inline" />
                                  </button>
                                )}
                                <button 
                                  onClick={async () => {
                                    const wasActive = student.isActive;
                                    if (confirm(`Вы уверены, что хотите ${wasActive ? 'деактивировать' : 'удалить навсегда'} этого студента?`)) {
                                      try {
                                        const permanent = !wasActive ? 'true' : 'false';
                                        const response = await fetch(`${API_URL}/students/${student.id}?permanent=${permanent}`, {
                                          method: 'DELETE',
                                          headers: { 'Authorization': `Bearer ${token}` },
                                        });
                                        if (response.ok) {
                                          // Если деактивируем активного студента, автоматически переключаемся на вкладку корзины
                                          if (wasActive && activeTab === 'students') {
                                            // Сначала устанавливаем фильтр и переключаем вкладку
                                            setStudentFilterActive('inactive');
                                            setActiveTab('trash');
                                            // Очищаем фильтры для корзины
                                            setStudentSearch('');
                                            setStudentFilterGroup(null);
                                            // Явно загружаем данные для корзины с фильтром 'inactive'
                                            // Используем небольшую задержку, чтобы дать время состоянию обновиться
                                            setTimeout(async () => {
                                              await fetchStudents('inactive');
                                            }, 200);
                                          } else {
                                            await fetchStudents();
                                          }
                                          alert(wasActive ? 'Студент деактивирован' : 'Студент удален');
                                        }
                                      } catch (error) {
                                        alert('Ошибка удаления студента');
                                      }
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                  title={student.isActive ? 'Деактивировать' : 'Удалить навсегда'}
                                >
                                  <Trash2 className="w-4 h-4 inline" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Trash Tab - Корзина для неактивных студентов */}
                {activeTab === 'trash' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Корзина (Неактивные студенты)</h2>
                    </div>

                    <div className="mb-6 p-6 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Поиск</label>
                          <input
                            type="text"
                            placeholder="Имя, фамилия, email, телефон..."
                            value={studentSearch}
                            onChange={(e) => { setStudentSearch(e.target.value); }}
                            onKeyPress={(e) => { if (e.key === 'Enter') fetchStudents(); }}
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Группа</label>
                          <select
                            value={studentFilterGroup || ''}
                            onChange={(e) => { setStudentFilterGroup(e.target.value ? parseInt(e.target.value) : null); }}
                            className="input"
                          >
                            <option value="">Все группы</option>
                            {groups.map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button onClick={() => { setStudentFilterActive('inactive'); fetchStudents(); }} className="btn-primary mt-4">Применить фильтры</button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Имя</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Телефон</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Группа</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата деактивации</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(() => {
                            // Фильтруем неактивных студентов
                            // Используем строгое сравнение для проверки isActive === false
                            // Также проверяем, что isActive не равен null или undefined
                            const inactiveStudents = students.filter(s => {
                              // Явно проверяем, что isActive равен false (не null, не undefined, не true)
                              return s.isActive === false;
                            });
                            console.log('[Корзина] Всего студентов в массиве:', students.length);
                            console.log('[Корзина] Неактивных студентов (isActive === false):', inactiveStudents.length);
                            console.log('[Корзина] Фильтр активен:', studentFilterActive);
                            console.log('[Корзина] Детали студентов:', students.map(s => ({ 
                              id: s.id, 
                              name: `${s.firstName} ${s.lastName}`, 
                              isActive: s.isActive 
                            })));
                            return inactiveStudents.map((student) => (
                            <tr key={student.id} className="hover:bg-gray-50 bg-gray-100">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {student.firstName} {student.lastName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.phone || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.group?.name || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {student.dateLeft ? new Date(student.dateLeft).toLocaleDateString('ru-RU') : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <button 
                                  onClick={async () => {
                                    if (confirm('Восстановить студента?')) {
                                      try {
                                        const response = await fetch(`${API_URL}/students/${student.id}/restore`, {
                                          method: 'PATCH',
                                          headers: { 'Authorization': `Bearer ${token}` },
                                        });
                                        if (response.ok) {
                                          // После восстановления перезагружаем данные с фильтром для корзины
                                          await fetchStudents('inactive');
                                          alert('Студент восстановлен');
                                        }
                                      } catch (error) {
                                        alert('Ошибка восстановления студента');
                                      }
                                    }
                                  }}
                                  className="text-green-600 hover:text-green-700"
                                  title="Восстановить"
                                >
                                  <Save className="w-4 h-4 inline" />
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (confirm('Вы уверены, что хотите удалить этого студента навсегда?')) {
                                      try {
                                        const response = await fetch(`${API_URL}/students/${student.id}?permanent=true`, {
                                          method: 'DELETE',
                                          headers: { 'Authorization': `Bearer ${token}` },
                                        });
                                        if (response.ok) {
                                          // После удаления перезагружаем данные с фильтром для корзины
                                          await fetchStudents('inactive');
                                          alert('Студент удален навсегда');
                                        }
                                      } catch (error) {
                                        alert('Ошибка удаления студента');
                                      }
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                  title="Удалить навсегда"
                                >
                                  <Trash2 className="w-4 h-4 inline" />
                                </button>
                              </td>
                            </tr>
                            ));
                          })()}
                          {students.filter(s => s.isActive === false).length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                Корзина пуста
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Teachers Tab */}
                {activeTab === 'teachers' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Управление преподавателями</h2>
                      <button onClick={() => { setIsCreatingTeacher(true); setEditingTeacherId(null); setTeacherForm({ firstName: '', lastName: '', email: '', phone: '', specialization: '', bio: '', username: '', password: '', isActive: true, courseIds: [] }); }} className="btn-primary flex items-center space-x-2">
                        <Plus className="w-4 h-4" />
                        <span>Создать преподавателя</span>
                      </button>
                    </div>

                    {(isCreatingTeacher || editingTeacherId) && (
                      <div className="mb-6 p-6 bg-gray-50 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4">{editingTeacherId ? 'Редактировать преподавателя' : 'Создать преподавателя'}</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Имя *</label>
                            <input type="text" value={teacherForm.firstName} onChange={(e) => setTeacherForm({...teacherForm, firstName: e.target.value})} className="input" required />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Фамилия *</label>
                            <input type="text" value={teacherForm.lastName} onChange={(e) => setTeacherForm({...teacherForm, lastName: e.target.value})} className="input" required />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input type="email" value={teacherForm.email} onChange={(e) => setTeacherForm({...teacherForm, email: e.target.value})} className="input" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
                            <input type="tel" value={teacherForm.phone} onChange={(e) => setTeacherForm({...teacherForm, phone: e.target.value})} className="input" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Специализация</label>
                            <input type="text" value={teacherForm.specialization} onChange={(e) => setTeacherForm({...teacherForm, specialization: e.target.value})} className="input" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Логин {!editingTeacherId && '(для входа в систему)'}
                              {editingTeacherId && ' (можно изменить существующий или добавить новый)'}
                            </label>
                            <input 
                              type="text" 
                              value={teacherForm.username} 
                              onChange={(e) => setTeacherForm({...teacherForm, username: e.target.value})} 
                              className="input" 
                              placeholder={editingTeacherId ? (teacherForm.username ? 'Измените логин или оставьте как есть' : 'Введите логин для создания аккаунта') : 'Введите логин'}
                            />
                            {editingTeacherId && teacherForm.username && (
                              <p className="mt-1 text-xs text-gray-500">Текущий логин: {teacherForm.username}. Измените значение, чтобы обновить логин.</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Пароль {!editingTeacherId && '(минимум 6 символов)'}
                              {editingTeacherId && ' (введите новый пароль для изменения, оставьте пустым чтобы не менять)'}
                            </label>
                            <input 
                              type="password" 
                              value={teacherForm.password} 
                              onChange={(e) => setTeacherForm({...teacherForm, password: e.target.value})} 
                              className="input" 
                              placeholder={editingTeacherId ? 'Введите новый пароль (минимум 6 символов) или оставьте пустым' : 'Введите пароль'}
                            />
                            {editingTeacherId && (
                              <p className="mt-1 text-xs text-gray-500">Оставьте поле пустым, если не хотите менять пароль. Для изменения введите новый пароль (минимум 6 символов).</p>
                            )}
                          </div>
                          <div>
                            <label className="flex items-center space-x-2">
                              <input 
                                type="checkbox" 
                                checked={teacherForm.isActive} 
                                onChange={(e) => setTeacherForm({...teacherForm, isActive: e.target.checked})} 
                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span className="text-sm font-medium text-gray-700">Активен</span>
                            </label>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Биография</label>
                            <textarea value={teacherForm.bio} onChange={(e) => setTeacherForm({...teacherForm, bio: e.target.value})} className="input" rows={3} />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Курсы, которые преподает</label>
                            <select
                              multiple
                              value={teacherForm.courseIds.map(id => id.toString())}
                              onChange={(e) => {
                                const selectedIds = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                                setTeacherForm({...teacherForm, courseIds: selectedIds});
                              }}
                              className="input min-h-[120px]"
                              size={5}
                            >
                              {courses.map((course) => (
                                <option key={course.id} value={course.id.toString()}>
                                  {course.name}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                              Удерживайте Ctrl (или Cmd на Mac) для выбора нескольких курсов. Выбрано: {teacherForm.courseIds.length}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <button onClick={handleSaveTeacher} className="btn-primary">Сохранить</button>
                          <button onClick={() => { 
                            setIsCreatingTeacher(false); 
                            setEditingTeacherId(null); 
                            setTeacherForm({ firstName: '', lastName: '', email: '', phone: '', specialization: '', bio: '', username: '', password: '', isActive: true, courseIds: [] });
                          }} className="btn-secondary">Отмена</button>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ФИО</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Телефон</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {teachers.map((teacher) => (
                            <tr key={teacher.id} className={`hover:bg-gray-50 ${!teacher.isActive ? 'bg-gray-50 opacity-60' : ''}`}>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${!teacher.isActive ? 'text-gray-500' : 'text-gray-900'}`}>
                                {teacher.firstName} {teacher.lastName}
                                {!teacher.isActive && <span className="ml-2 text-xs text-gray-400">(неактивен)</span>}
                              </td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm ${!teacher.isActive ? 'text-gray-400' : 'text-gray-500'}`}>{teacher.phone || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <button onClick={() => { 
                                  setIsCreatingTeacher(false);
                                  setEditingTeacherId(teacher.id); 
                                  setTeacherForm({ 
                                    firstName: teacher.firstName, 
                                    lastName: teacher.lastName, 
                                    email: teacher.email || '', 
                                    phone: teacher.phone || '', 
                                    specialization: teacher.specialization || '', 
                                    bio: teacher.bio || '',
                                    username: teacher.user?.username || '',
                                    password: '',
                                    isActive: teacher.isActive !== undefined ? teacher.isActive : true,
                                    courseIds: teacher.courses ? teacher.courses.map((c: any) => c.id) : [],
                                  }); 
                                }} className="text-primary-600 hover:text-primary-700" title="Редактировать">
                                  <Edit className="w-4 h-4 inline" />
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (confirm(`Вы уверены, что хотите ${teacher.isActive ? 'деактивировать' : 'активировать'} этого преподавателя?`)) {
                                      try {
                                        const response = await fetch(`${API_URL}/teachers/${teacher.id}`, {
                                          method: 'PUT',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`,
                                          },
                                          body: JSON.stringify({ isActive: !teacher.isActive }),
                                        });
                                        if (response.ok) {
                                          await fetchTeachers();
                                          alert(`Преподаватель ${teacher.isActive ? 'деактивирован' : 'активирован'}`);
                                        } else {
                                          const error = await response.json();
                                          alert(error.message || 'Ошибка обновления статуса преподавателя');
                                        }
                                      } catch (error) {
                                        console.error('Ошибка обновления статуса преподавателя:', error);
                                        alert('Ошибка обновления статуса преподавателя');
                                      }
                                    }
                                  }}
                                  className={teacher.isActive ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
                                  title={teacher.isActive ? 'Деактивировать' : 'Активировать'}
                                >
                                  {teacher.isActive ? <X className="w-4 h-4 inline" /> : <CheckCircle className="w-4 h-4 inline" />}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Attendance Tab */}
                {activeTab === 'attendance' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Посещаемость студентов</h2>
                    </div>

                    {/* Статистика по курсам */}
                    {coursesAttendanceStats && (
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">Статистика посещаемости по курсам</h3>
                        
                        {/* Фильтр по датам */}
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Начало периода</label>
                              <input 
                                type="date" 
                                value={attendanceStartDate} 
                                onChange={(e) => {
                                  setAttendanceStartDate(e.target.value);
                                  setTimeout(() => fetchCoursesAttendanceStats(), 100);
                                }} 
                                className="input" 
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Конец периода</label>
                              <input 
                                type="date" 
                                value={attendanceEndDate} 
                                onChange={(e) => {
                                  setAttendanceEndDate(e.target.value);
                                  setTimeout(() => fetchCoursesAttendanceStats(), 100);
                                }} 
                                className="input" 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Общая статистика */}
                        {coursesAttendanceStats.overall && (
                          <div className="mb-6 grid grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-lg shadow">
                              <div className="text-sm text-gray-600">Всего записей</div>
                              <div className="text-2xl font-bold text-gray-900">{coursesAttendanceStats.overall.total || 0}</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow">
                              <div className="text-sm text-gray-600">Присутствовали</div>
                              <div className="text-2xl font-bold text-green-600">{coursesAttendanceStats.overall.present || 0}</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow">
                              <div className="text-sm text-gray-600">Отсутствовали</div>
                              <div className="text-2xl font-bold text-red-600">{coursesAttendanceStats.overall.absent || 0}</div>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow">
                              <div className="text-sm text-gray-600">Процент посещаемости</div>
                              <div className="text-2xl font-bold text-primary-600">{coursesAttendanceStats.overall.attendanceRate || '0.00'}%</div>
                            </div>
                          </div>
                        )}

                        {/* Статистика по каждому курсу */}
                        {coursesAttendanceStats.byCourse && coursesAttendanceStats.byCourse.length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-lg font-semibold text-gray-800 mb-3">По курсам:</h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Курс</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Всего записей</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Присутствовали</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Отсутствовали</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Процент посещаемости</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {coursesAttendanceStats.byCourse.map((courseStat: any) => (
                                    <tr key={courseStat.courseId} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {courseStat.courseName}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {courseStat.total || 0}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-center font-semibold">
                                        {courseStat.present || 0}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-center font-semibold">
                                        {courseStat.absent || 0}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600 text-center font-bold">
                                        {courseStat.attendanceRate || '0.00'}%
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Детальная статистика по группе */}
                    <div className="mb-6 p-6 bg-gray-50 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Детальная статистика по группе</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Группа</label>
                          <select 
                            value={selectedAttendanceGroupId || ''} 
                            onChange={(e) => setSelectedAttendanceGroupId(e.target.value ? parseInt(e.target.value) : null)} 
                            className="input"
                          >
                            <option value="">Выберите группу</option>
                            {groups.map(g => (
                              <option key={g.id} value={g.id}>{g.name} - {g.course?.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Дата</label>
                          <input 
                            type="date" 
                            value={selectedAttendanceDate} 
                            onChange={(e) => setSelectedAttendanceDate(e.target.value)} 
                            className="input" 
                          />
                        </div>
                      </div>
                    </div>

                    {selectedAttendanceGroupId && attendanceStats && (
                      <div className="mb-6 grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-lg shadow">
                          <div className="text-sm text-gray-600">Всего студентов</div>
                          <div className="text-2xl font-bold text-gray-900">{attendanceStats.totalStudents || 0}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <div className="text-sm text-gray-600">Присутствовало</div>
                          <div className="text-2xl font-bold text-green-600">{attendanceStats.present || 0}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <div className="text-sm text-gray-600">Отсутствовало</div>
                          <div className="text-2xl font-bold text-red-600">{attendanceStats.absent || 0}</div>
                        </div>
                      </div>
                    )}

                    {selectedAttendanceGroupId && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Студент</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Примечание</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {attendances.length > 0 ? (
                              attendances.map((attendance) => (
                                <tr key={attendance.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {attendance.student?.firstName} {attendance.student?.lastName}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                      attendance.status === 'present' || attendance.status === 'late'
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {attendance.status === 'present' ? 'Присутствовал' : 
                                       attendance.status === 'late' ? 'Опоздал' :
                                       attendance.status === 'excused' ? 'Уважительная причина' :
                                       'Отсутствовал'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-500">{attendance.notes || '-'}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                                  Нет данных о посещаемости за выбранную дату
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {!selectedAttendanceGroupId && (
                      <div className="text-center py-12 text-gray-500">
                        Выберите группу для просмотра посещаемости
                      </div>
                    )}
                  </div>
                )}

                {/* Payments Tab */}
                {activeTab === 'payments' && (
                  <div>
                    {/* Индикатор статуса сервера */}
                    {serverStatus === 'offline' && (
                      <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-red-800">
                                ⚠️ Backend сервер недоступен
                              </h3>
                              <p className="text-sm text-red-700 mt-1">
                                Не удалось подключиться к серверу по адресу: {API_URL.replace('/api', '')}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={checkServerStatus}
                            className="ml-4 px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                          >
                            Проверить снова
                          </button>
                        </div>
                        <div className="mt-3 text-sm text-red-700">
                          <p className="font-semibold">Решение:</p>
                          <ol className="list-decimal list-inside mt-1 space-y-1">
                            <li>Откройте новое окно PowerShell в папке: <code className="bg-red-100 px-1 rounded">c:\Users\user\Desktop\studycenter</code></li>
                            <li>Выполните команду: <code className="bg-red-100 px-1 rounded">npm run dev</code></li>
                            <li>Дождитесь сообщения: <code className="bg-red-100 px-1 rounded">🚀 Сервер запущен на порту 3000</code></li>
                            <li>Нажмите кнопку "Проверить снова" выше</li>
                          </ol>
                        </div>
                      </div>
                    )}
                    
                    {serverStatus === 'checking' && (
                      <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                          </div>
                          <p className="ml-3 text-sm text-yellow-800">
                            Проверка доступности сервера...
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Управление платежами студентов</h2>
                      <button 
                        onClick={() => { setIsCreatingPayment(true); setEditingPaymentId(null); setPaymentForm({ studentId: 0, courseId: 0, amount: 0, status: 'pending', paymentDate: new Date().toISOString().split('T')[0], dueDate: '', paymentMethod: '', notes: '' }); }} 
                        className="btn-primary flex items-center space-x-2"
                        disabled={serverStatus === 'offline'}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Создать платеж</span>
                      </button>
                    </div>

                    {/* Фильтры по месяцам и группам */}
                    <div className="mb-6 p-6 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Месяц</label>
                          <input
                            type="month"
                            value={paymentFilterMonth}
                            onChange={(e) => {
                              const newMonth = e.target.value;
                              console.log('[Admin] Изменение месяца с', paymentFilterMonth, 'на', newMonth);
                              
                              // КРИТИЧНО: ПОЛНЫЙ RESET STATE при смене месяца
                              // Сначала очищаем состояние, затем устанавливаем новый месяц
                              // Это гарантирует, что данные предыдущего месяца не остаются
                              setPayments([]); // Очищаем платежи
                              setPaymentStats(null); // Очищаем статистику
                              
                              // Устанавливаем новый месяц
                              // useEffect автоматически загрузит данные для нового месяца
                              setPaymentFilterMonth(newMonth);
                            }}
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Группа</label>
                            <select
                            value={paymentFilterGroup || ''}
                            onChange={(e) => {
                              const newGroup = e.target.value ? parseInt(e.target.value) : null;
                              console.log('[Admin] Изменение группы с', paymentFilterGroup, 'на', newGroup);
                              
                              // КРИТИЧНО: Очищаем состояние при изменении группы
                              setPayments([]);
                              setPaymentStats(null);
                              
                              setPaymentFilterGroup(newGroup);
                              // Загружаем данные сразу (без setTimeout)
                              fetchPayments();
                              fetchPaymentStats();
                            }}
                            className="input"
                          >
                            <option value="">Все группы</option>
                            {groups.map(g => (
                              <option key={g.id} value={g.id}>{g.name} - {g.course?.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>


                    {(isCreatingPayment || editingPaymentId) && (
                      <div className="mb-6 p-6 bg-gray-50 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4">{editingPaymentId ? 'Редактировать платеж' : 'Создать платеж'}</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Студент</label>
                            <select value={paymentForm.studentId} onChange={(e) => setPaymentForm({...paymentForm, studentId: parseInt(e.target.value)})} className="input">
                              <option value="0">Выберите студента</option>
                              {students.map(s => (
                                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Курс</label>
                            <select value={paymentForm.courseId} onChange={(e) => setPaymentForm({...paymentForm, courseId: parseInt(e.target.value)})} className="input">
                              <option value="0">Выберите курс</option>
                              {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Сумма (сом) *</label>
                            <input 
                              type="number" 
                              step="0.01" 
                              min="0"
                              value={paymentForm.amount} 
                              onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})} 
                              className="input" 
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Статус оплаты *</label>
                            <select 
                              value={paymentForm.status} 
                              onChange={(e) => setPaymentForm({...paymentForm, status: e.target.value as any})} 
                              className="input"
                            >
                              <option value="pending">Ожидает оплаты</option>
                              <option value="paid">Оплачено</option>
                              <option value="overdue">Просрочено</option>
                              <option value="refunded">Возврат</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Дата платежа *</label>
                            <input 
                              type="date" 
                              value={paymentForm.paymentDate} 
                              onChange={(e) => setPaymentForm({...paymentForm, paymentDate: e.target.value})} 
                              className="input" 
                              required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Дата создания платежа (со дня добавления студента)
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Срок оплаты</label>
                            <input type="date" value={paymentForm.dueDate} onChange={(e) => setPaymentForm({...paymentForm, dueDate: e.target.value})} className="input" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Способ оплаты</label>
                            <input type="text" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({...paymentForm, paymentMethod: e.target.value})} className="input" placeholder="наличные, карта, перевод" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Примечание</label>
                            <textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})} className="input" rows={2} />
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <button onClick={handleSavePayment} className="btn-primary">Сохранить</button>
                          <button onClick={() => { setIsCreatingPayment(false); setEditingPaymentId(null); }} className="btn-secondary">Отмена</button>
                        </div>
                      </div>
                    )}

                    {/* Группировка платежей по студентам */}
                    {(() => {
                      // КРИТИЧНО: Фильтруем платежи СТРОГО по выбранному месяцу
                      // Это гарантирует, что в таблице отображаются ТОЛЬКО платежи выбранного месяца
                      // Защита от рассинхронизации state
                      const filteredPayments = payments.filter((payment: any) => {
                        return payment.month === paymentFilterMonth;
                      });
                      
                      console.log('[Admin] Фильтрация платежей:', {
                        totalPayments: payments.length,
                        filteredPayments: filteredPayments.length,
                        selectedMonth: paymentFilterMonth,
                        paymentsMonths: payments.map((p: any) => p.month)
                      });
                      
                      // Группируем платежи по студентам (только за выбранный месяц для отображения)
                      const paymentsByStudent = filteredPayments.reduce((acc: any, payment: any) => {
                        const studentId = payment.studentId;
                        if (!acc[studentId]) {
                          acc[studentId] = {
                            student: payment.student,
                            payments: [],
                            totalDebt: 0,
                          };
                        }
                        acc[studentId].payments.push(payment);
                        return acc;
                      }, {});
                      
                      // КРИТИЧНО: Рассчитываем долг ТОЛЬКО за выбранный месяц (из filteredPayments!)
                      // Долг = сумма платежей со статусом 'pending' или 'overdue' за выбранный месяц
                      filteredPayments.forEach((payment: any) => {
                        const studentId = payment.studentId;
                        if (!paymentsByStudent[studentId]) {
                          // Если студента нет в отображаемых платежах, но он есть в списке студентов
                          const student = students.find((s: any) => s.id === studentId);
                          if (student) {
                            paymentsByStudent[studentId] = {
                              student: student,
                              payments: [],
                              totalDebt: 0,
                            };
                          } else {
                            // Если студента нет в списке, используем данные из платежа
                            paymentsByStudent[studentId] = {
                              student: payment.student,
                              payments: [],
                              totalDebt: 0,
                            };
                          }
                        }
                        // КРИТИЧНО: Вычисляем долг ТОЛЬКО за выбранный месяц
                        // Долг = 0 если paid, иначе = amount
                        if (payment.status === 'pending' || payment.status === 'overdue') {
                          paymentsByStudent[studentId].totalDebt += parseFloat(payment.amount);
                        }
                        // Если статус 'paid', долг = 0 (не добавляем ничего)
                      });

                      // КРИТИЧНО: Добавляем студентов без платежей за выбранный месяц
                      // Если платежа нет - это означает, что он должен быть создан автоматически на backend
                      // Но если его все еще нет, показываем студента с долгом = 0 (или можно показать ожидаемый долг)
                      students.forEach((student: any) => {
                        if (!paymentsByStudent[student.id]) {
                          // Проверяем фильтр по группе
                          if (!paymentFilterGroup || student.groupId === paymentFilterGroup) {
                            // КРИТИЧНО: Если платежа нет, но студент активен и имеет курс - должен быть долг
                            // Но так как платеж должен создаваться автоматически на backend, 
                            // если его нет здесь - значит что-то пошло не так
                            // Показываем студента с долгом = 0 (или можно показать цену курса как ожидаемый долг)
                            const expectedDebt = student.group?.course?.price || 0;
                            paymentsByStudent[student.id] = {
                              student: student,
                              payments: [],
                              totalDebt: expectedDebt, // Показываем ожидаемый долг, если платеж не создан
                            };
                          }
                        }
                      });

                      // Получаем список студентов с платежами (включая без платежей)
                      const studentsWithPayments = Object.values(paymentsByStudent) as any[];
                      
                      // Сортируем по имени студента
                      studentsWithPayments.sort((a: any, b: any) => {
                        const nameA = `${a.student?.firstName || ''} ${a.student?.lastName || ''}`.trim();
                        const nameB = `${b.student?.firstName || ''} ${b.student?.lastName || ''}`.trim();
                        return nameA.localeCompare(nameB, 'ru');
                      });

                      // Фильтруем студентов - показываем только тех, у кого есть платежи за выбранный месяц
                      // или студентов без платежей (если они соответствуют фильтру группы)
                      const filteredStudents = studentsWithPayments.filter((studentData: any) => {
                        // Показываем студента, если у него есть платежи за выбранный месяц
                        if (studentData.payments.length > 0) {
                          return true;
                        }
                        // Или если он соответствует фильтру группы и у него вообще нет платежей
                        if (!paymentFilterGroup || studentData.student?.groupId === paymentFilterGroup) {
                          return true;
                        }
                        return false;
                      });

                      return (
                        <div className="space-y-6">
                          {filteredStudents.length > 0 ? (
                            filteredStudents.map((studentData: any) => {
                              const student = studentData.student;
                              const studentPayments = studentData.payments;
                              const totalDebt = studentData.totalDebt;

                              return (
                                <div key={student?.id} className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                                  {/* Заголовок студента с долгом */}
                                  <div className={`px-6 py-4 border-b ${totalDebt > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <h3 className="text-lg font-bold text-gray-900">
                                          {student?.firstName} {student?.lastName}
                                        </h3>
                                        {student?.group && (
                                          <p className="text-sm text-gray-600 mt-1">
                                            Группа: {student.group.name} - {student.group.course?.name}
                                          </p>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <div className={`text-2xl font-extrabold ${totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                          {totalDebt.toLocaleString('ru-RU')} сом
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {totalDebt > 0 ? `Долг за ${paymentFilterMonth ? new Date(paymentFilterMonth + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) : 'месяц'}` : 'Нет долга'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Таблица платежей студента */}
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Месяц</th>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Курс</th>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус оплаты</th>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата платежа</th>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Способ оплаты</th>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {studentPayments.map((payment: any) => (
                                          <tr key={payment.id} className={`hover:bg-gray-50 ${editingPaymentId === payment.id ? 'bg-blue-50' : ''}`}>
                                            {editingPaymentId === payment.id ? (
                                              // Режим редактирования
                                              <>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                  {/* КРИТИЧНО: Отображаем payment.month (не paymentDate!) для синхронизации с выбранным месяцем */}
                                                  {payment.month ? new Date(payment.month + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                  {payment.course?.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                  <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={paymentForm.amount}
                                                    onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})}
                                                    className="input w-24 text-sm"
                                                  />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                  <select
                                                    value={paymentForm.status}
                                                    onChange={(e) => setPaymentForm({...paymentForm, status: e.target.value as any})}
                                                    className="input text-sm"
                                                  >
                                                    <option value="pending">Ожидает оплаты</option>
                                                    <option value="paid">Оплачено</option>
                                                    <option value="overdue">Просрочено</option>
                                                    <option value="refunded">Возврат</option>
                                                  </select>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                  <input
                                                    type="date"
                                                    value={paymentForm.paymentDate}
                                                    onChange={(e) => setPaymentForm({...paymentForm, paymentDate: e.target.value})}
                                                    className="input text-sm"
                                                  />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                  <input
                                                    type="text"
                                                    value={paymentForm.paymentMethod || ''}
                                                    onChange={(e) => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}
                                                    className="input text-sm w-32"
                                                    placeholder="наличные, карта..."
                                                  />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                  <button
                                                    onClick={handleSavePayment}
                                                    className="text-green-600 hover:text-green-700"
                                                    title="Сохранить"
                                                  >
                                                    <CheckCircle className="w-4 h-4 inline" />
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      setEditingPaymentId(null);
                                                      setIsCreatingPayment(false);
                                                    }}
                                                    className="text-red-600 hover:text-red-700"
                                                    title="Отмена"
                                                  >
                                                    <X className="w-4 h-4 inline" />
                                                  </button>
                                                </td>
                                              </>
                                            ) : (
                                              // Режим просмотра
                                              <>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                                                  {/* КРИТИЧНО: Отображаем payment.month (не paymentDate!) для синхронизации с выбранным месяцем */}
                                                  {payment.month ? new Date(payment.month + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                  {payment.course?.name || '-'}
                                                </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                              {parseFloat(payment.amount).toLocaleString('ru-RU')} сом
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                payment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                              }`}>
                                                {payment.status === 'paid' ? '✅ Оплачено' :
                                                 payment.status === 'pending' ? '⏳ Ожидает оплаты' :
                                                 payment.status === 'overdue' ? '⚠️ Просрочено' :
                                                 '↩️ Возврат'}
                                              </span>
                                            </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                  {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('ru-RU') : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                  {payment.paymentMethod || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                  <div className="flex items-center space-x-2">
                                                    <button
                                                      onClick={() => {
                                                        setEditingPaymentId(payment.id);
                                                        setIsCreatingPayment(false);
                                                        setPaymentForm({ 
                                                          studentId: payment.studentId, 
                                                          courseId: payment.courseId || 0, 
                                                          amount: parseFloat(payment.amount), 
                                                          status: payment.status, 
                                                          paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], 
                                                          dueDate: payment.dueDate ? new Date(payment.dueDate).toISOString().split('T')[0] : '', 
                                                          paymentMethod: payment.paymentMethod || '', 
                                                          notes: payment.notes || '' 
                                                        }); 
                                                      }} 
                                                      className="text-primary-600 hover:text-primary-700"
                                                      title="Редактировать платеж"
                                                    >
                                                      <Edit className="w-4 h-4 inline" />
                                                    </button>
                                                    <button
                                                      onClick={() => handleDeletePayment(payment.id)}
                                                      className="text-red-600 hover:text-red-700"
                                                      title="Удалить платеж"
                                                    >
                                                      <Trash2 className="w-4 h-4 inline" />
                                                    </button>
                                                  </div>
                                                </td>
                                              </>
                                            )}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })
                          ) : students.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                              Нет студентов для отображения
                            </div>
                          ) : (
                            <div className="text-center py-12 text-gray-500">
                              Нет платежей за выбранный месяц {paymentFilterMonth ? `(${new Date(paymentFilterMonth + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })})` : ''}
                              {paymentFilterGroup && ` в выбранной группе`}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Branches Tab */}
                {activeTab === 'branches' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Филиалы</h2>
                      <button
                        onClick={() => {
                          setIsCreatingBranch(true);
                          setEditingBranchId(null);
                          setBranchForm({
                            name: '',
                            address: '',
                            phone: '',
                            email: '',
                            hours: '',
                            latitude: '',
                            longitude: '',
                            description: '',
                            isActive: true,
                          });
                        }}
                        className="btn-primary flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Добавить филиал</span>
                      </button>
                    </div>

                    {(isCreatingBranch || editingBranchId) && (
                      <div className="mb-6 p-6 bg-gray-50 rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          {editingBranchId ? 'Редактировать филиал' : 'Новый филиал'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Название *</label>
                            <input
                              type="text"
                              value={branchForm.name}
                              onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                              className="input"
                              placeholder="Название филиала"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Адрес *</label>
                            <input
                              type="text"
                              value={branchForm.address}
                              onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                              className="input"
                              placeholder="Адрес филиала"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
                            <input
                              type="tel"
                              value={branchForm.phone}
                              onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                              className="input"
                              placeholder="+7 (999) 123-45-67"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input
                              type="email"
                              value={branchForm.email}
                              onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                              className="input"
                              placeholder="email@example.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Часы работы</label>
                            <input
                              type="text"
                              value={branchForm.hours}
                              onChange={(e) => setBranchForm({ ...branchForm, hours: e.target.value })}
                              className="input"
                              placeholder="Пн-Пт: 9:00 - 21:00"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Широта (latitude)</label>
                            <input
                              type="number"
                              step="any"
                              value={branchForm.latitude}
                              onChange={(e) => setBranchForm({ ...branchForm, latitude: e.target.value })}
                              className="input"
                              placeholder="55.7558"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Долгота (longitude)</label>
                            <input
                              type="number"
                              step="any"
                              value={branchForm.longitude}
                              onChange={(e) => setBranchForm({ ...branchForm, longitude: e.target.value })}
                              className="input"
                              placeholder="37.6173"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Активен</label>
                            <select
                              value={branchForm.isActive ? 'true' : 'false'}
                              onChange={(e) => setBranchForm({ ...branchForm, isActive: e.target.value === 'true' })}
                              className="input"
                            >
                              <option value="true">Да</option>
                              <option value="false">Нет</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Описание</label>
                            <textarea
                              value={branchForm.description}
                              onChange={(e) => setBranchForm({ ...branchForm, description: e.target.value })}
                              className="input"
                              rows={3}
                              placeholder="Дополнительная информация о филиале"
                            />
                          </div>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <button onClick={handleSaveBranch} className="btn-primary flex items-center space-x-2">
                            <Save className="w-4 h-4" />
                            <span>Сохранить</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsCreatingBranch(false);
                              setEditingBranchId(null);
                            }}
                            className="btn-secondary flex items-center space-x-2"
                          >
                            <X className="w-4 h-4" />
                            <span>Отмена</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {branches.map((branch) => (
                        <motion.div
                          key={branch.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="card"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-gray-900">{branch.name}</h3>
                            {!branch.isActive && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                Неактивен
                              </span>
                            )}
                          </div>
                          <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <div className="flex items-start space-x-2">
                              <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                              <span>{branch.address}</span>
                            </div>
                            {branch.phone && (
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>{branch.phone}</span>
                              </div>
                            )}
                            {branch.email && (
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4" />
                                <span>{branch.email}</span>
                              </div>
                            )}
                            {branch.hours && (
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>{branch.hours}</span>
                              </div>
                            )}
                          </div>
                          {branch.description && (
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{branch.description}</p>
                          )}
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditBranch(branch)}
                              className="btn-secondary flex items-center space-x-2 flex-1"
                            >
                              <Edit className="w-4 h-4" />
                              <span>Редактировать</span>
                            </button>
                            <button
                              onClick={() => handleDeleteBranch(branch.id)}
                              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    {branches.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <p>Филиалы не добавлены</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'reports' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Отчёты</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Всего студентов</h3>
                        <p className="text-3xl font-bold text-primary-600">{students.length}</p>
                      </div>
                      <div className="card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Активных студентов</h3>
                        <p className="text-3xl font-bold text-primary-600">
                          {students.filter(s => s.isActive).length}
                        </p>
                      </div>
                      <div className="card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Преподавателей</h3>
                        <p className="text-3xl font-bold text-primary-600">
                          {teachers.length}
                        </p>
                      </div>
                      <div className="card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Курсов</h3>
                        <p className="text-3xl font-bold text-primary-600">{courses.length}</p>
                      </div>
                      <div className="card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Групп</h3>
                        <p className="text-3xl font-bold text-primary-600">{groups.length}</p>
                      </div>
                      <div className="card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Расписаний</h3>
                        <p className="text-3xl font-bold text-primary-600">{schedules.length}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
