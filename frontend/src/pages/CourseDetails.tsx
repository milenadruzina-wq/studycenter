import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Users, ArrowLeft, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';
import ScheduleTable from '../components/ScheduleTable';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ScheduleItem {
  id: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

interface Course {
  id: number;
  name: string;
  description: string;
  price: number;
  teacher?: {
    id: number;
    firstName: string;
    lastName: string;
    bio?: string;
  } | null;
  groups?: Array<{
    id: number;
    name: string;
    schedules?: ScheduleItem[];
  }>;
}

const CourseDetails = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { isAdmin, isAuthenticated, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'description' | 'schedule' | 'reviews'>('description');
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/courses/${id}`);
        if (response.ok) {
          const data = await response.json();
          setCourse(data);
        } else {
          setError('Курс не найден');
        }
      } catch (error) {
        console.error('Ошибка загрузки курса:', error);
        setError('Ошибка при загрузке курса');
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchCourse();
    }
  }, [id]);

  // Преобразуем расписания из групп в плоский массив
  const schedules: ScheduleItem[] = course?.groups?.flatMap(group => 
    group.schedules?.map(schedule => ({
      id: schedule.id,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime
    })) || []
  ) || [];

  const handleRequestCourse = async () => {
    if (!isAuthenticated) {
      setError('Необходимо войти в систему для отправки запроса');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/course-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: parseInt(id!),
          message: message || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error?.message || 'Ошибка при отправке запроса');
      }

      setRequestSent(true);
      setError('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Ошибка при отправке запроса на курс');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12 text-gray-500">Загрузка курса...</div>
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <Link
              to="/courses"
              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 mt-4"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              <span>Вернуться к курсам</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  const teacherName = course.teacher 
    ? `${course.teacher.firstName} ${course.teacher.lastName}`
    : 'Не указан';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/courses"
          className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          <span>Вернуться к курсам</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden mb-8"
        >
          <div className="p-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{course.name}</h1>
            <p className="text-xl text-gray-600 mb-6">{course.description || 'Описание курса отсутствует'}</p>

            <div className="flex flex-wrap items-center gap-6 mb-6">
              <div className="flex items-center space-x-2 text-gray-600">
                <Users className="w-5 h-5" aria-hidden="true" />
                <span>{t('courses.details.teacher')}: {teacherName}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div>
                <div className="text-3xl font-bold text-primary-600">
                  {course.price ? course.price.toLocaleString('ru-RU') : '0'} {t('courses.card.price')}
                </div>
              </div>
              {!isAdmin && (
                <div className="space-y-3">
                  <a
                    href="https://wa.me/996500318269"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex items-center justify-center space-x-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:border-green-300"
                    aria-label="Напишите нам в WhatsApp"
                  >
                    <MessageCircle className="w-5 h-5" aria-hidden="true" />
                    <span>Напишите нам</span>
                  </a>
                  {requestSent ? (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span>Запрос отправлен</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end space-y-2">
                      {isAuthenticated ? (
                        <>
                          <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Дополнительное сообщение (необязательно)"
                            className="input w-64 h-20 text-sm"
                          />
                          <button
                            onClick={handleRequestCourse}
                            className="btn-primary"
                            aria-label="Отправить запрос на курс"
                          >
                            Отправить запрос на курс
                          </button>
                        </>
                      ) : (
                        <Link to="/login" className="btn-primary">
                          Войти для отправки запроса
                        </Link>
                      )}
                    </div>
                  )}
                  {error && (
                    <div className="flex items-center space-x-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px" aria-label="Tabs">
              {(['description', 'schedule', 'reviews'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  aria-current={activeTab === tab ? 'page' : undefined}
                >
                  {t(`courses.details.${tab}`)}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {activeTab === 'description' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                  {course.description || 'Подробное описание курса отсутствует.'}
                </p>
                {course.teacher && (
                  <div className="mt-8 p-6 bg-primary-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">{t('courses.details.teacher')}</h3>
                    <p className="text-gray-700">{teacherName}</p>
                    {course.teacher.bio && (
                      <p className="text-gray-600 mt-2">{course.teacher.bio}</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'schedule' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <ScheduleTable schedules={schedules} />
              </motion.div>
            )}

            {activeTab === 'reviews' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center py-8 text-gray-500">
                  <p>Отзывы пока отсутствуют</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default CourseDetails;



