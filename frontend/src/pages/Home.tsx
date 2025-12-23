import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { ArrowRight, Award, Clock, Headphones, Users, BookOpen, GraduationCap, MapPin, Phone, Mail } from 'lucide-react';
import CourseCard from '../components/CourseCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Course {
  id: number;
  name: string;
  description: string;
  price: number;
  teacher?: {
    firstName: string;
    lastName: string;
  };
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

interface Teacher {
  id: number;
  firstName: string;
  lastName: string;
  specialization: string;
  bio: string;
}

interface Branch {
  id: number;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  hours?: string;
  description?: string;
  isActive: boolean;
}

const Home = () => {
  const { t } = useTranslation();
  const { isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Редирект админа на админ-панель, преподавателя на панель преподавателя
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin');
    } else if (isTeacher) {
      navigate('/teacher');
    }
  }, [isAdmin, isTeacher, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, teachersRes, branchesRes] = await Promise.all([
          fetch(`${API_URL}/courses`),
          fetch(`${API_URL}/teachers`),
          fetch(`${API_URL}/branches`),
        ]);

        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          // Показываем все активные курсы (или первые 6 для главной страницы)
          setCourses(coursesData.slice(0, 6));
        }

        if (teachersRes.ok) {
          const teachersData = await teachersRes.json();
          setTeachers(teachersData.slice(0, 4)); // Показываем первых 4 преподавателей
        }

        if (branchesRes.ok) {
          const branchesData = await branchesRes.json();
          // Показываем только активные филиалы
          setBranches(branchesData.filter((branch: Branch) => branch.isActive));
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const uspItems = [
    {
      icon: Users,
      title: t('usp.expert.title'),
      description: t('usp.expert.description'),
    },
    {
      icon: Clock,
      title: t('usp.flexible.title'),
      description: t('usp.flexible.description'),
    },
    {
      icon: Headphones,
      title: t('usp.support.title'),
      description: t('usp.support.description'),
    },
    {
      icon: Award,
      title: t('usp.certificate.title'),
      description: t('usp.certificate.description'),
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600 text-white py-24 md:py-40 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-400/20 rounded-full blur-3xl animate-float"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.h1 
              className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Учебный центр
              <br />
              <span className="bg-gradient-to-r from-white to-accent-200 bg-clip-text text-transparent">
                "Люблю Учиться"
              </span>
            </motion.h1>
            <motion.p 
              className="text-xl md:text-3xl mb-10 text-white/90 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Качественное образование для всех. Откройте для себя мир знаний с нашими профессиональными курсами.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <Link
                to="/courses"
                className="inline-flex items-center space-x-3 bg-white text-primary-600 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-accent-50 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-white/20 focus:outline-none focus:ring-4 focus:ring-white/50"
              >
                <BookOpen className="w-6 h-6" aria-hidden="true" />
                <span>Начать обучение</span>
                <ArrowRight className="w-6 h-6" aria-hidden="true" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-100/20 rounded-full blur-3xl -z-0"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-100/20 rounded-full blur-3xl -z-0"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold mb-8 gradient-text">
              О нашем центре
            </h2>
            <div className="space-y-6">
              <p className="text-xl text-gray-700 leading-relaxed">
                Учебный центр <span className="font-bold gradient-text">"Люблю Учиться"</span> — это современная образовательная платформа, 
                где каждый может найти курс по душе. Мы предлагаем широкий спектр программ 
                обучения от основ программирования до продвинутых технологий.
              </p>
              <p className="text-xl text-gray-700 leading-relaxed">
                Наши опытные преподаватели помогут вам освоить новые навыки и достичь 
                профессиональных целей. Мы верим, что обучение должно быть доступным, 
                интересным и эффективным.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* USP Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-extrabold text-center mb-16 gradient-text"
          >
            {t('usp.title')}
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {uspItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ y: -10, scale: 1.05 }}
                  className="card-gradient text-center relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary-200/30 to-accent-200/30 rounded-full blur-2xl -z-0"></div>
                  <div className="relative z-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl mb-6 shadow-lg shadow-primary-500/30 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-10 h-10 text-white" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-900 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-primary-600 group-hover:to-accent-600 group-hover:bg-clip-text transition-all">{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex justify-between items-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold gradient-text">{t('courses.title')}</h2>
            <Link
              to="/courses"
              className="text-primary-600 hover:text-accent-600 font-bold flex items-center space-x-2 transition-all hover:scale-105 group"
            >
              <span>{t('courses.all')}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </Link>
          </motion.div>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Загрузка курсов...</div>
          ) : courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course, index) => {
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
            <div className="text-center py-12 text-gray-500">Курсы пока не добавлены</div>
          )}
        </div>
      </section>

      {/* Teachers Section */}
      {teachers.length > 0 && (
        <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl font-extrabold text-center mb-16 gradient-text"
            >
              Наши преподаватели
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {teachers.map((teacher, index) => (
                <motion.div
                  key={teacher.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ y: -10, scale: 1.05 }}
                  className="card-gradient text-center relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary-200/30 to-accent-200/30 rounded-full blur-2xl -z-0"></div>
                  <div className="relative z-10">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl mb-6 shadow-lg shadow-primary-500/30 group-hover:scale-110 transition-transform duration-300">
                      <GraduationCap className="w-12 h-12 text-white" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">
                      {teacher.firstName} {teacher.lastName}
                    </h3>
                    <p className="text-sm font-semibold text-primary-600 mb-3 px-3 py-1 bg-primary-50 rounded-lg inline-block">{teacher.specialization}</p>
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{teacher.bio}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Branches Section */}
      {branches.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex justify-between items-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-extrabold gradient-text">Наши филиалы</h2>
              <Link
                to="/branches"
                className="text-primary-600 hover:text-accent-600 font-bold flex items-center space-x-2 transition-all hover:scale-105 group"
              >
                <span>Все филиалы</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {branches.slice(0, 6).map((branch, index) => (
                <motion.div
                  key={branch.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="card-gradient relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary-200/30 to-accent-200/30 rounded-full blur-2xl -z-0"></div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl shadow-lg">
                        <MapPin className="w-6 h-6 text-white" aria-hidden="true" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-primary-600 group-hover:to-accent-600 group-hover:bg-clip-text transition-all">
                        {branch.name}
                      </h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-4 h-4 text-primary-600 mt-1 flex-shrink-0" aria-hidden="true" />
                        <p className="text-sm text-gray-700">{branch.address}</p>
                      </div>

                      {branch.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-primary-600 flex-shrink-0" aria-hidden="true" />
                          <a href={`tel:${branch.phone}`} className="text-sm text-primary-600 hover:text-primary-700">
                            {branch.phone}
                          </a>
                        </div>
                      )}

                      {branch.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-primary-600 flex-shrink-0" aria-hidden="true" />
                          <a href={`mailto:${branch.email}`} className="text-sm text-primary-600 hover:text-primary-700 truncate">
                            {branch.email}
                          </a>
                        </div>
                      )}

                      {branch.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mt-3 pt-3 border-t border-gray-200">
                          {branch.description}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-400/10 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-6xl font-extrabold mb-6">
              Готовы начать обучение?
            </h2>
            <p className="text-xl md:text-2xl mb-10 text-white/90 max-w-2xl mx-auto">
              Присоединяйтесь к тысячам студентов, которые уже начали свой путь к успеху
            </p>
            <Link
              to="/courses"
              className="inline-flex items-center space-x-3 bg-white text-primary-600 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-accent-50 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-white/30 focus:outline-none focus:ring-4 focus:ring-white/50"
            >
              <BookOpen className="w-6 h-6" aria-hidden="true" />
              <span>Посмотреть все курсы</span>
              <ArrowRight className="w-6 h-6" aria-hidden="true" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
