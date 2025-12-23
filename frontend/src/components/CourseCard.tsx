import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowRight, MessageCircle, Calendar, Users, MapPin, Clock } from 'lucide-react';

interface CourseCardProps {
  id: number;
  name: string;
  description: string;
  price: number;
  teacher?: string;
  image?: string;
  index?: number;
  ageRange?: string; // Например: "6–10 лет"
  format?: string; // Например: "Группа" или "Индивидуально"
  branch?: string; // Например: "Шопоков" или "Онлайн"
  duration?: string; // Например: "60 минут"
}

const CourseCard = ({ 
  id, 
  name, 
  description, 
  price, 
  teacher, 
  image, 
  index = 0,
  ageRange,
  format,
  branch,
  duration
}: CourseCardProps) => {
  const { t } = useTranslation();

  // Форматирование цены: убираем .00, добавляем пробелы, формат "3 000 сом / месяц"
  const formatPrice = (price: number) => {
    const roundedPrice = Math.round(price);
    return roundedPrice.toLocaleString('ru-RU', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="card-gradient group overflow-hidden relative h-full min-h-[420px] grid gap-4"
      style={{
        gridTemplateRows: 'auto auto auto 40px auto 1fr auto'
      }}
    >
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-200/30 to-accent-200/30 rounded-full blur-3xl -z-0"></div>
      
      {/* 1. Название курса - крупное, главное визуальное внимание */}
      <h3 className="relative z-10 text-2xl md:text-3xl font-extrabold text-gray-900 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-primary-600 group-hover:to-accent-600 group-hover:bg-clip-text transition-all duration-300 leading-tight">
        {name}
      </h3>
      
      {/* Краткое описание */}
      <p className="relative z-10 text-gray-600 line-clamp-2 leading-relaxed text-sm">
        {description}
      </p>
      
      {/* 2. Цена - заметная, но не агрессивная */}
      <div className="relative z-10 text-2xl font-bold text-primary-600">
        {formatPrice(price)} сом / месяц
      </div>

      {/* 3. Дополнительная информация - компактные бейджи (ОБЯЗАТЕЛЬНАЯ зона с фиксированной высотой 40px) */}
      <div className="relative z-10 course-meta flex flex-wrap gap-2 items-start content-start">
        {ageRange && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 rounded-lg text-blue-700 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Возраст: {ageRange}</span>
          </div>
        )}
        {format && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-purple-50 rounded-lg text-purple-700 text-xs font-medium">
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Формат: {format}</span>
          </div>
        )}
        {branch && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-orange-50 rounded-lg text-orange-700 text-xs font-medium">
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Филиал: {branch}</span>
          </div>
        )}
        {duration && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-green-50 rounded-lg text-green-700 text-xs font-medium">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{duration}</span>
          </div>
        )}
      </div>
      
      {/* 4. Преподаватель - спокойный вторичный стиль (фиксированная grid-строка) */}
      <div className="relative z-10 text-sm text-gray-600">
        {teacher ? (
          <>
            <span className="text-gray-500">Преподаватель: </span>
            <span className="font-medium">{teacher}</span>
          </>
        ) : (
          <span className="invisible">Преподаватель:</span>
        )}
      </div>
      
      {/* 5. Растягивающаяся зона для выравнивания */}
      <div className="relative z-10"></div>
      
      {/* 6. Кнопки действий - основная и вторичная (всегда в последней grid-строке) */}
      <div className="relative z-10 pt-4 border-t border-gray-200 space-y-2">
        <Link
          to={`/courses/${id}`}
          className="btn-primary flex items-center justify-center space-x-2 text-sm w-full"
          aria-label={`${t('courses.card.learnMore')} ${name}`}
        >
          <span>{t('courses.card.learnMore')}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
        </Link>
        <a
          href="https://wa.me/996500318269"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary flex items-center justify-center space-x-2 text-sm w-full bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:border-green-300"
          aria-label="Написать в WhatsApp"
        >
          <MessageCircle className="w-4 h-4" aria-hidden="true" />
          <span>Написать в WhatsApp</span>
        </a>
      </div>
    </motion.div>
  );
};

export default CourseCard;




