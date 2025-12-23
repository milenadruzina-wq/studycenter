import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';

interface ScheduleItem {
  id: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

interface ScheduleTableProps {
  schedules: ScheduleItem[];
}

const ScheduleTable = ({ schedules }: ScheduleTableProps) => {
  const { t } = useTranslation();

  const dayOrder: { [key: string]: number } = {
    'Понедельник': 1,
    'Вторник': 2,
    'Среда': 3,
    'Четверг': 4,
    'Пятница': 5,
    'Суббота': 6,
    'Воскресенье': 7,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
    'Sunday': 7,
  };

  const sortedSchedules = [...schedules].sort((a, b) => {
    return (dayOrder[a.dayOfWeek] || 99) - (dayOrder[b.dayOfWeek] || 99);
  });

  if (schedules.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{t('courses.details.schedule')} не доступно</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200" role="table" aria-label={t('courses.details.schedule')}>
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                <span>День недели</span>
              </div>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" aria-hidden="true" />
                <span>Время</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedSchedules.map((schedule, index) => (
            <motion.tr
              key={schedule.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="hover:bg-gray-50 transition-colors"
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {schedule.dayOfWeek}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {schedule.startTime} - {schedule.endTime}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ScheduleTable;




