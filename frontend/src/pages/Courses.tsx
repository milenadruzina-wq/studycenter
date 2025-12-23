import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Filter, X } from 'lucide-react';
import CourseCard from '../components/CourseCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Course {
  id: number;
  name: string;
  description: string;
  price: number;
  category?: string;
  teacher?: {
    firstName: string;
    lastName: string;
  } | null;
  ageRange?: string;
  format?: string;
  branch?: string;
  duration?: string;
  groups?: Array<{
    id: number;
    name: string;
    startTime?: string;
    endTime?: string;
  }>;
}

const Courses = () => {
  const { t } = useTranslation();
  const { isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Редирект админа и преподавателя
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin');
    } else if (isTeacher) {
      navigate('/teacher');
    }
  }, [isAdmin, isTeacher, navigate]);
  const [filters, setFilters] = useState({
    category: '',
    priceRange: '',
  });

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch(`${API_URL}/courses`);
        if (res.ok) {
          const data = await res.json();
          setCourses(data);
        } else {
          console.error('Не удалось загрузить курсы', res.status);
        }
      } catch (error) {
        console.error('Ошибка загрузки курсов:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const categories = Array.from(new Set(courses.map(c => c.category).filter(Boolean))) as string[];

  const filteredCourses = courses.filter(course => {
    if (filters.category && course.category !== filters.category) return false;
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split('-').map(Number);
      if (course.price < min || (max && course.price > max)) return false;
    }
    return true;
  });

  const resetFilters = () => {
    setFilters({ category: '', priceRange: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('courses.title')}</h1>
          <p className="text-gray-600">Найдите курс, который подходит именно вам</p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-64">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                  <Filter className="w-5 h-5" aria-hidden="true" />
                  <span>{t('courses.filter.title')}</span>
                </h2>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="lg:hidden text-gray-500 hover:text-gray-700"
                  aria-label="Toggle filters"
                  aria-expanded={isFilterOpen}
                >
                  {isFilterOpen ? <X className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
                </button>
              </div>

              <div className={`space-y-4 ${isFilterOpen ? 'block' : 'hidden lg:block'}`}>
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('courses.filter.category')}
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="input"
                    aria-label="Filter by category"
                  >
                    <option value="">Все категории</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Price Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('courses.filter.price')}
                  </label>
                  <select
                    value={filters.priceRange}
                    onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
                    className="input"
                    aria-label="Filter by price"
                  >
                    <option value="">Любая цена</option>
                    <option value="0-20000">До 20,000 сом</option>
                    <option value="20000-30000">20,000 - 30,000 сом</option>
                    <option value="30000-40000">30,000 - 40,000 сом</option>
                    <option value="40000-999999">От 40,000 сом</option>
                  </select>
                </div>

                <button
                  onClick={resetFilters}
                  className="w-full btn-secondary text-sm"
                >
                  {t('courses.filter.reset')}
                </button>
              </div>
            </div>
          </aside>

          {/* Courses Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Загрузка курсов...</div>
            ) : (
              <>
                <div className="mb-4 text-gray-600">
                  Найдено курсов: {filteredCourses.length}
                </div>
                {filteredCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((course, index) => {
                      // Форматируем имя преподавателя: "Имя Фамилия"
                      const teacherName = course.teacher 
                        ? `${course.teacher.firstName} ${course.teacher.lastName}`
                        : undefined;
                      
                      // Вычисляем длительность занятия из групп, если доступно
                      const duration = course.groups && course.groups.length > 0 && course.groups[0].startTime && course.groups[0].endTime
                        ? (() => {
                            const start = new Date(`2000-01-01T${course.groups[0].startTime}`);
                            const end = new Date(`2000-01-01T${course.groups[0].endTime}`);
                            const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
                            return `${diffMinutes} минут`;
                          })()
                        : course.duration;

                      return (
                        <CourseCard
                          key={course.id}
                          id={course.id}
                          name={course.name}
                          description={course.description}
                          price={course.price}
                          teacher={teacherName}
                          index={index}
                          ageRange={course.ageRange}
                          format={course.format}
                          branch={course.branch}
                          duration={duration}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>Курсы не найдены. Попробуйте изменить фильтры.</p>
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

export default Courses;




