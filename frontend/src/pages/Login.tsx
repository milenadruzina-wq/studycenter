import { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { LogIn, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Проверка доступности сервера при загрузке (тихая проверка без ошибок в консоли)
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let controller: AbortController | null = null;
    
    const checkServer = async () => {
      try {
        const healthUrl = `${API_URL.replace('/api', '')}/health`;
        
        // Используем fetch с правильной обработкой ошибок
        controller = new AbortController();
        timeoutId = setTimeout(() => {
          if (controller) {
            controller.abort();
          }
        }, 3000); // Таймаут 3 секунды
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-cache',
        }).catch(() => {
          // Тихая обработка ошибок сети - не логируем в консоль
          // ERR_CONNECTION_REFUSED - это нормально, если сервер не запущен
          return null;
        });
        
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (isMounted) {
          if (response && response.ok) {
            setServerStatus('online');
          } else {
            setServerStatus('offline');
          }
        }
      } catch (error: any) {
        // Тихая обработка - проверка сервера не критична
        // Не логируем ошибки в консоль, так как это ожидаемое поведение
        if (isMounted) {
          setServerStatus('offline');
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    // Запускаем проверку с небольшой задержкой, чтобы дать серверу время запуститься
    const timer = setTimeout(() => {
      checkServer();
    }, 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (controller) {
        controller.abort();
      }
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      // Проверяем роль пользователя и перенаправляем соответственно
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        if (user.role === 'admin') {
          navigate('/admin');
        } else if (user.role === 'teacher') {
          navigate('/teacher');
        } else {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 glass p-10 rounded-3xl shadow-2xl border border-white/50"
      >
        <div className="text-center">
          <h2 className="text-4xl font-extrabold gradient-text mb-2">
            Вход в систему
          </h2>
          <p className="text-gray-600 font-medium">
            Учебный центр "Люблю Учиться"
          </p>
          {serverStatus === 'checking' && (
            <div className="mt-2 text-sm text-gray-500">Проверка подключения к серверу...</div>
          )}
          {serverStatus === 'online' && (
            <div className="mt-2 flex items-center justify-center space-x-1 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>Сервер доступен</span>
            </div>
          )}
          {serverStatus === 'offline' && (
            <div className="mt-2 p-3 bg-orange-50 border-l-4 border-orange-500 rounded-lg">
              <div className="text-sm text-orange-800 font-semibold mb-2">
                ⚠️ Backend сервер недоступен
              </div>
              <div className="text-xs text-orange-700 mb-3">
                Не удалось подключиться к серверу. Это нормально, если сервер еще не запущен.
              </div>
              <div className="text-xs text-orange-800 font-semibold mb-2">
                📋 Инструкция по запуску:
              </div>
              <div className="text-xs font-mono bg-orange-100 p-3 rounded mb-3 border border-orange-200">
                <div className="mb-1">1. Откройте новое окно PowerShell</div>
                <div className="mb-1">2. Выполните команды:</div>
                <div className="ml-4 mb-1">cd c:\Users\user\Desktop\studycenter</div>
                <div className="ml-4 mb-1">npm run dev</div>
                <div className="mt-2 text-orange-600">3. Дождитесь сообщения: 🚀 Сервер запущен на порту 3000</div>
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={async () => {
                    setServerStatus('checking');
                    try {
                      const healthUrl = `${API_URL.replace('/api', '')}/health`;
                      const controller = new AbortController();
                      const timeoutId = setTimeout(() => controller.abort(), 3000);
                      
                      const response = await fetch(healthUrl, { 
                        method: 'GET', 
                        cache: 'no-cache',
                        signal: controller.signal
                      }).catch(() => null);
                      
                      clearTimeout(timeoutId);
                      setServerStatus(response?.ok ? 'online' : 'offline');
                    } catch {
                      setServerStatus('offline');
                    }
                  }}
                  className="text-xs px-3 py-1.5 bg-orange-200 text-orange-800 rounded hover:bg-orange-300 font-medium"
                >
                  🔄 Проверить снова
                </button>
                <div className="text-xs text-orange-600 italic">
                  Примечание: Ошибка в консоли браузера - это нормально, если сервер не запущен
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg"
          >
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="whitespace-pre-line text-sm font-medium">{error}</div>
                {error.includes('Не удалось подключиться') && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-xs font-semibold text-red-800 mb-2">Быстрое решение:</p>
                    <div className="text-xs text-red-700 bg-red-100 p-2 rounded font-mono">
                      <div>1. Откройте PowerShell</div>
                      <div>2. cd c:\Users\user\Desktop\studycenter</div>
                      <div>3. npm run dev</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Имя пользователя
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                placeholder="Введите имя пользователя"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Пароль
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Введите пароль"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="w-5 h-5" />
              <span>{isLoading ? 'Вход...' : 'Войти'}</span>
            </button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm">
              <Link to="/forgot-password" className="text-primary-600 hover:text-primary-700 font-medium">
                Забыли пароль?
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              Нет аккаунта?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;



