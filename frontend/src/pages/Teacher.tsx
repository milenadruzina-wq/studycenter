import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Calendar, TrendingUp, BookOpen, UserPlus, Edit } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Group {
  id: number;
  name: string;
  course?: {
    name: string;
  };
  students?: Student[];
}

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  groupId?: number;
  isActive?: boolean;
  group?: {
    id: number;
    name: string;
    course?: {
      name: string;
    };
  };
}

interface Schedule {
  id: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  groupId: number;
}

interface Attendance {
  id: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  student: Student;
  studentId: number;
  groupId: number;
}

const Teacher = () => {
  const { isTeacher, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'attendance' | 'students'>('attendance');
  const [groups, setGroups] = useState<Group[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Понедельник текущей недели
    return weekStart.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - today.getDay() + 7); // Воскресенье текущей недели
    return weekEnd.toISOString().split('T')[0];
  });
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Attendance editing state
  const [isEditingTable, setIsEditingTable] = useState(false);
  const [tempAttendances, setTempAttendances] = useState<{[key: string]: 'present' | 'absent' | null}>({});
  
  // Student management state
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [studentForm, setStudentForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    groupId: 0,
    notes: '',
  });
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    if (!isTeacher) {
      navigate('/');
      return;
    }
    fetchGroups();
    fetchAllStudents();
  }, [isTeacher, navigate]);

  useEffect(() => {
    if (selectedGroupId && activeTab === 'attendance') {
      fetchSchedules();
      fetchAttendances();
      fetchStats();
      // Сбрасываем редактирование при изменении группы или дат
      setIsEditingTable(false);
      setTempAttendances({});
    }
  }, [selectedGroupId, startDate, endDate, activeTab]);

  useEffect(() => {
    if (activeTab === 'students') {
      fetchAllStudents();
    }
  }, [activeTab]);

  const fetchGroups = async () => {
    try {
      const response = await fetch(`${API_URL}/groups`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
        // Сохраняем текущую выбранную группу, если она есть
        const currentGroupId = selectedGroupId;
        if (data.length > 0) {
          if (!currentGroupId) {
            setSelectedGroupId(data[0].id);
          } else {
            // Проверяем, что выбранная группа все еще существует
            const groupExists = data.find((g: Group) => g.id === currentGroupId);
            if (!groupExists) {
              setSelectedGroupId(data[0].id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки групп:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    if (!selectedGroupId) return;
    
    try {
      const response = await fetch(`${API_URL}/schedules/group/${selectedGroupId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSchedules(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки расписания:', error);
    }
  };

  const fetchAllStudents = async () => {
    try {
      const url = studentSearch 
        ? `${API_URL}/students?search=${encodeURIComponent(studentSearch)}`
        : `${API_URL}/students`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAllStudents(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки студентов:', error);
    }
  };

  const fetchAttendances = async () => {
    if (!selectedGroupId) return;
    
    try {
      const url = `${API_URL}/attendances?groupId=${selectedGroupId}&startDate=${startDate}&endDate=${endDate}`;
      const response = await fetch(url, {
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

  const fetchStats = async () => {
    if (!selectedGroupId) return;
    
    try {
      const response = await fetch(`${API_URL}/attendances/stats?groupId=${selectedGroupId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const handleSaveStudent = async () => {
    try {
      // Валидация обязательных полей - только имя и группа
      if (!studentForm.firstName || studentForm.firstName.trim() === '') {
        alert('Имя обязательно для заполнения');
        return;
      }

      if (!studentForm.groupId || studentForm.groupId === 0) {
        alert('Необходимо выбрать группу');
        return;
      }

      // Подготовка данных для отправки
      const studentData: any = {
        firstName: studentForm.firstName.trim(),
        groupId: studentForm.groupId,
      };

      if (studentForm.lastName && studentForm.lastName.trim() !== '') {
        studentData.lastName = studentForm.lastName.trim();
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

      const response = await fetch(`${API_URL}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(studentData),
      });

      if (response.ok) {
        await fetchAllStudents();
        await fetchGroups(); // Обновляем группы, чтобы новый студент появился в журнале
        setIsCreatingStudent(false);
        setStudentForm({
          firstName: '',
          lastName: '',
          phone: '',
          dateOfBirth: '',
          address: '',
          groupId: 0,
          notes: '',
        });
        alert('Студент успешно добавлен!');
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Неизвестная ошибка' }));
        alert(errorData.message || `Ошибка сохранения студента (${response.status})`);
      }
    } catch (error: any) {
      console.error('Ошибка сохранения студента:', error);
      if (error.message && error.message.includes('Failed to fetch')) {
        alert('Не удалось подключиться к серверу. Пожалуйста, убедитесь, что сервер запущен на порту 3000.');
      } else {
        alert(`Ошибка сохранения студента: ${error.message || 'Неизвестная ошибка'}`);
      }
    }
  };

  const handleStartEditTable = () => {
    if (!selectedGroup || !selectedGroup.students) return;
    
    // Инициализируем временные данные текущими значениями посещаемости
    const initialTempAttendances: {[key: string]: 'present' | 'absent' | null} = {};
    const dates = getDatesInRange();
    
    selectedGroup.students.forEach(student => {
      dates.forEach(date => {
        const attendance = getAttendanceForStudent(student.id, date);
        const key = `${student.id}_${date}`;
        // Преобразуем все статусы в 'present' или 'absent'
        if (attendance?.status === 'present') {
          initialTempAttendances[key] = 'present';
        } else if (attendance?.status === 'absent' || attendance?.status === 'late' || attendance?.status === 'excused') {
          initialTempAttendances[key] = 'absent';
        } else {
          initialTempAttendances[key] = null;
        }
      });
    });
    
    setTempAttendances(initialTempAttendances);
    setIsEditingTable(true);
  };

  const handleCancelEditTable = () => {
    setIsEditingTable(false);
    setTempAttendances({});
  };

  const handleUpdateTempAttendance = (studentId: number, date: string, status: 'present' | 'absent' | null) => {
    const key = `${studentId}_${date}`;
    setTempAttendances(prev => ({
      ...prev,
      [key]: status
    }));
  };

  const handleSaveAllAttendances = async () => {
    if (!selectedGroupId || !selectedGroup || !selectedGroup.students) return;

    const dates = getDatesInRange();
    const updates: Promise<any>[] = [];
    let hasErrors = false;

    // Обрабатываем все изменения
    for (const student of selectedGroup.students) {
      for (const date of dates) {
        const key = `${student.id}_${date}`;
        const newStatus = tempAttendances[key];
        const existing = attendances.find(a => a.studentId === student.id && a.date === date);
        const currentStatus = existing?.status;
        
        // Преобразуем текущий статус в 'present' или 'absent' для сравнения
        const currentNormalizedStatus = currentStatus === 'present' ? 'present' : 
                                       (currentStatus === 'absent' || currentStatus === 'late' || currentStatus === 'excused') ? 'absent' : null;

        // Если статус не изменился, пропускаем
        if (newStatus === currentNormalizedStatus) continue;

        // Если статус null и запись существует, удаляем её
        if (newStatus === null && existing) {
          updates.push(
            fetch(`${API_URL}/attendances/${existing.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }).catch(error => {
              console.error(`Ошибка удаления посещаемости для студента ${student.id}, дата ${date}:`, error);
              hasErrors = true;
              return { ok: false };
            })
          );
          continue;
        }

        // Если статус null и записи нет, пропускаем
        if (newStatus === null && !existing) continue;

        // Сохраняем или обновляем запись
        const url = existing 
          ? `${API_URL}/attendances/${existing.id}`
          : `${API_URL}/attendances`;
        const method = existing ? 'PUT' : 'POST';

        updates.push(
          fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              studentId: student.id,
              groupId: selectedGroupId,
              date,
              status: newStatus,
            }),
          }).catch(error => {
            console.error(`Ошибка сохранения посещаемости для студента ${student.id}, дата ${date}:`, error);
            hasErrors = true;
            return { ok: false };
          })
        );
      }
    }

    try {
      await Promise.all(updates);
      
      if (hasErrors) {
        alert('Некоторые изменения не удалось сохранить. Проверьте консоль для подробностей.');
      }
      
      await fetchAttendances();
      await fetchStats();
      setIsEditingTable(false);
      setTempAttendances({});
    } catch (error) {
      console.error('Ошибка сохранения посещаемости:', error);
      alert('Ошибка сохранения посещаемости');
    }
  };


  const getAttendanceForStudent = (studentId: number, date: string) => {
    return attendances.find(a => a.studentId === studentId && a.date === date);
  };

  // Маппинг дней недели на номера (getDay() возвращает 0=воскресенье, 1=понедельник, ...)
  const dayOfWeekMap: { [key: string]: number } = {
    'Понедельник': 1,
    'Вторник': 2,
    'Среда': 3,
    'Четверг': 4,
    'Пятница': 5,
    'Суббота': 6,
    'Воскресенье': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
    'Sunday': 0,
  };

  // Генерация списка дат в диапазоне, только для дней занятий
  const getDatesInRange = () => {
    if (!schedules || schedules.length === 0) return [];
    
    // Получаем уникальные дни недели из расписания
    const scheduleDays = [...new Set(schedules.map(s => s.dayOfWeek))];
    const scheduleDayNumbers = scheduleDays.map(day => dayOfWeekMap[day]).filter(num => num !== undefined);
    
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0 = воскресенье, 1 = понедельник, и т.д.
      // Проверяем, есть ли занятия в этот день недели
      if (scheduleDayNumbers.includes(dayOfWeek)) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  // Подготовка данных для графика
  const chartData = stats ? [
    { name: 'Присутствовали', value: stats.present },
    { name: 'Отсутствовали', value: stats.absent },
  ] : [];

  if (!isTeacher) {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Панель преподавателя</h1>
          <p className="text-gray-600">Управление студентами и посещаемостью</p>
        </motion.div>

        {/* Tabs */}
        <div className="mb-6 flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'attendance'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-5 h-5 inline mr-2" />
            Журнал посещаемости
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'students'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-5 h-5 inline mr-2" />
            Список студентов
          </button>
        </div>

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Левая колонка - Выбор группы и даты */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Выбор группы</span>
                </h2>
                <select
                  value={selectedGroupId || ''}
                  onChange={(e) => setSelectedGroupId(parseInt(e.target.value))}
                  className="input w-full mb-4"
                >
                  <option value="">Выберите группу</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name} {group.course ? `- ${group.course.name}` : ''}
                    </option>
                  ))}
                </select>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Начало периода
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Конец периода
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="input w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Статистика */}
              {stats && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Статистика</span>
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Всего записей:</span>
                      <span className="font-semibold">{stats.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-600">Присутствовали:</span>
                      <span className="font-semibold">{stats.present}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-600">Отсутствовали:</span>
                      <span className="font-semibold">{stats.absent}</span>
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-900 font-semibold">Процент посещаемости:</span>
                        <span className="text-primary-600 font-bold text-lg">{stats.attendanceRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* График посещаемости */}
              {stats && chartData.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">График посещаемости</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0ea5e9" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Правая колонка - Журнал посещаемости */}
            <div className="lg:col-span-2">
              {loading ? (
                <div className="text-center py-12 text-gray-500">Загрузка...</div>
              ) : selectedGroupId && selectedGroup ? (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        Журнал посещаемости: {selectedGroup.name}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Период: {new Date(startDate).toLocaleDateString('ru-RU')} - {new Date(endDate).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    {!isEditingTable ? (
                      <button
                        onClick={handleStartEditTable}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Изменить</span>
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveAllAttendances}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                        >
                          <span>Сохранить</span>
                        </button>
                        <button
                          onClick={handleCancelEditTable}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                        >
                          <span>Отмена</span>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {schedules.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      Для этой группы не настроено расписание. Добавьте расписание в админ-панели.
                    </div>
                  ) : selectedGroup.students && selectedGroup.students.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300 sticky left-0 bg-gray-50 z-10">№</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300 sticky left-10 bg-gray-50 z-10 min-w-[150px]">ФИО</th>
                            {getDatesInRange().map((date) => (
                              <th key={date} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r border-gray-300 min-w-[80px]">
                                <div className="flex flex-col">
                                  <span>{new Date(date).toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
                                  <span className="text-xs">{new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedGroup.students.map((student, index) => (
                            <tr key={student.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300 sticky left-0 bg-white z-10">{index + 1}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-300 sticky left-10 bg-white z-10">
                                {student.lastName} {student.firstName}
                              </td>
                              {getDatesInRange().map((date) => {
                                const attendance = getAttendanceForStudent(student.id, date);
                                const key = `${student.id}_${date}`;
                                
                                // Определяем текущий статус для отображения
                                let displayStatus: 'present' | 'absent' | null = null;
                                if (isEditingTable) {
                                  // В режиме редактирования используем временные данные
                                  displayStatus = tempAttendances[key] || null;
                                } else {
                                  // В режиме просмотра используем реальные данные, преобразуя все статусы в present/absent
                                  if (attendance?.status === 'present') {
                                    displayStatus = 'present';
                                  } else if (attendance?.status === 'absent' || attendance?.status === 'late' || attendance?.status === 'excused') {
                                    displayStatus = 'absent';
                                  } else {
                                    displayStatus = null;
                                  }
                                }
                                
                                return (
                                  <td key={date} className="px-2 py-2 text-center border-r border-gray-300">
                                    {!isEditingTable ? (
                                      <div className={`px-2 py-1 rounded text-xs font-semibold inline-block ${
                                        displayStatus === 'present'
                                          ? 'bg-green-500 text-white'
                                          : displayStatus === 'absent'
                                          ? 'bg-red-500 text-white'
                                          : 'bg-gray-100 text-gray-400'
                                      }`}>
                                        {displayStatus === 'present' ? '✓' : 
                                         displayStatus === 'absent' ? '✗' : '-'}
                                      </div>
                                    ) : (
                                      <div className="flex gap-1 justify-center">
                                        <button
                                          onClick={() => handleUpdateTempAttendance(student.id, date, 'present')}
                                          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                                            displayStatus === 'present'
                                              ? 'bg-green-500 text-white'
                                              : 'bg-gray-100 text-gray-600 hover:bg-green-100'
                                          }`}
                                          title="Был"
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={() => handleUpdateTempAttendance(student.id, date, 'absent')}
                                          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                                            displayStatus === 'absent'
                                              ? 'bg-red-500 text-white'
                                              : 'bg-gray-100 text-gray-600 hover:bg-red-100'
                                          }`}
                                          title="Не был"
                                        >
                                          ✗
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      В этой группе пока нет студентов
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-6 text-center py-12 text-gray-500">
                  Выберите группу для просмотра посещаемости
                </div>
              )}
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Список всех студентов</h2>
              <button
                onClick={() => {
                  setIsCreatingStudent(true);
                  setStudentForm({
                    firstName: '',
                    lastName: '',
                    phone: '',
                    dateOfBirth: '',
                    address: '',
                    groupId: 0,
                    notes: '',
                  });
                }}
                className="btn-primary flex items-center space-x-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Добавить студента</span>
              </button>
            </div>

            {isCreatingStudent && (
              <div className="mb-6 p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Добавить нового студента</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Имя *</label>
                    <input
                      type="text"
                      value={studentForm.firstName}
                      onChange={(e) => setStudentForm({...studentForm, firstName: e.target.value})}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Фамилия</label>
                    <input
                      type="text"
                      value={studentForm.lastName}
                      onChange={(e) => setStudentForm({...studentForm, lastName: e.target.value})}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
                    <input
                      type="tel"
                      value={studentForm.phone}
                      onChange={(e) => setStudentForm({...studentForm, phone: e.target.value})}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Дата рождения</label>
                    <input
                      type="date"
                      value={studentForm.dateOfBirth}
                      onChange={(e) => setStudentForm({...studentForm, dateOfBirth: e.target.value})}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Группа *</label>
                    <select
                      value={studentForm.groupId}
                      onChange={(e) => setStudentForm({...studentForm, groupId: parseInt(e.target.value)})}
                      className="input"
                      required
                    >
                      <option value="0">Выберите группу</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name} {g.course ? `- ${g.course.name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Адрес</label>
                    <input
                      type="text"
                      value={studentForm.address}
                      onChange={(e) => setStudentForm({...studentForm, address: e.target.value})}
                      className="input"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Примечания</label>
                    <textarea
                      value={studentForm.notes}
                      onChange={(e) => setStudentForm({...studentForm, notes: e.target.value})}
                      className="input"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex space-x-2 mt-4">
                  <button onClick={handleSaveStudent} className="btn-primary">Сохранить</button>
                  <button
                    onClick={() => setIsCreatingStudent(false)}
                    className="btn-secondary"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Поиск по имени, фамилии, email или телефону..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    fetchAllStudents();
                  }
                }}
                className="input w-full"
              />
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ФИО</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Телефон</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Группа</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.lastName} {student.firstName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.phone || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.group ? `${student.group.name}${student.group.course ? ` (${student.group.course.name})` : ''}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            student.isActive !== false
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {student.isActive !== false ? 'Активен' : 'Неактивен'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {allStudents.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    Студенты не найдены
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Teacher;
