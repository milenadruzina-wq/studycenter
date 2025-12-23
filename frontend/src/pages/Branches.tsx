import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MapPin, Phone, Clock, Mail } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Branch {
  id: number;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  hours?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  isActive: boolean;
}

const Branches = () => {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  
  // Адрес филиала Шопоков для карты
  const defaultBranchAddress = "Город Шопоков, улица Мира 13";
  
  // Получаем адрес для отображения на карте
  const getMapAddress = () => {
    if (selectedBranch && selectedBranch.address) {
      return selectedBranch.address;
    }
    return defaultBranchAddress;
  };
  
  // Формируем URL для Яндекс карты
  const getMapUrl = () => {
    const address = encodeURIComponent(getMapAddress());
    return `https://yandex.ru/map-widget/v1/?text=${address}&z=16&lang=ru_RU`;
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await fetch(`${API_URL}/branches`);
      if (response.ok) {
        const data = await response.json();
        // Показываем только активные филиалы
        const activeBranches = data.filter((branch: Branch) => branch.isActive);
        setBranches(activeBranches);
        
        // Автоматически выбираем филиал "Шопоков" при загрузке, если он есть
        const shopokovBranch = activeBranches.find((branch: Branch) => 
          branch.name.toLowerCase().includes('шопоков') || 
          branch.address.toLowerCase().includes('шопоков')
        );
        if (shopokovBranch) {
          setSelectedBranch(shopokovBranch);
        } else if (activeBranches.length > 0) {
          // Если филиал "Шопоков" не найден, выбираем первый активный филиал
          setSelectedBranch(activeBranches[0]);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки филиалов:', error);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('branches.title')}</h1>
          <p className="text-gray-600">Выберите удобный для вас филиал</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Яндекс Карта */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full h-96 lg:h-auto lg:min-h-[600px] rounded-xl shadow-lg overflow-hidden"
          >
            <iframe
              src={getMapUrl()}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              style={{ border: 0 }}
              className="rounded-xl"
              title={`Карта филиала ${selectedBranch?.name || 'Шопоков'}`}
              key={selectedBranch?.id || 'default'} // Обновляем iframe при изменении филиала
            />
          </motion.div>

          {/* Branches List */}
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Загрузка филиалов...</div>
            ) : branches.length > 0 ? branches.map((branch, index) => (
              <motion.div
                key={branch.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                onClick={() => {
                  setSelectedBranch(branch);
                }}
                className={`card cursor-pointer transition-all ${
                  selectedBranch?.id === branch.id ? 'ring-2 ring-primary-500 shadow-lg' : ''
                }`}
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{branch.name}</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('branches.address')}</p>
                      <p className="text-gray-900">{branch.address}</p>
                    </div>
                  </div>

                  {branch.phone && (
                    <div className="flex items-start space-x-3">
                      <Phone className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">{t('branches.phone')}</p>
                        <a href={`tel:${branch.phone}`} className="text-primary-600 hover:text-primary-700">
                          {branch.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {branch.email && (
                    <div className="flex items-start space-x-3">
                      <Mail className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <a href={`mailto:${branch.email}`} className="text-primary-600 hover:text-primary-700">
                          {branch.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {branch.hours && (
                    <div className="flex items-start space-x-3">
                      <Clock className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">{t('branches.hours')}</p>
                        <p className="text-gray-900">{branch.hours}</p>
                      </div>
                    </div>
                  )}
                  
                  {branch.description && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">{branch.description}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card text-center py-12"
              >
                <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg text-gray-600">Филиалы пока не добавлены</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Branches;




