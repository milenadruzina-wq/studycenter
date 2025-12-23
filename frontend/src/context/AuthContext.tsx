import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'admin' | 'user';
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Проверяем сохраненные данные при загрузке
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      // Проверяем валидность токена
      checkAuth(savedToken);
    }
  }, []);

  const checkAuth = async (authToken: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        // Токен невалиден
        logout();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    }
  };

  const login = async (username: string, password: string) => {
    try {
      // Проверяем доступность API URL
      const loginUrl = `${API_URL}/auth/login`;
      console.log('[Auth] Attempting login to:', loginUrl);
      console.log('[Auth] API_URL:', API_URL);

      // Сначала проверяем доступность сервера через health endpoint (опционально, не блокируем вход)
      try {
        const healthUrl = API_URL.replace('/api', '') + '/health';
        const healthCheck = await fetch(healthUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(2000), // Уменьшаем таймаут до 2 секунд
        });
        if (healthCheck.ok) {
          console.log('[Auth] Health check passed');
        } else {
          console.warn('[Auth] Health check returned non-OK status:', healthCheck.status);
        }
      } catch (healthError) {
        // Health check не критичен - просто логируем, но не блокируем попытку входа
        console.warn('[Auth] Health check failed (non-blocking):', healthError);
        // Продолжаем попытку входа - возможно, сервер запустится к моменту запроса
      }

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        signal: AbortSignal.timeout(10000), // Таймаут 10 секунд
      }).catch((fetchError: any) => {
        // Обработка сетевых ошибок
        console.error('[Auth] Network error:', fetchError);
        
        // Детальная обработка различных типов ошибок
        if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
          throw new Error(
            '⏱️ Превышено время ожидания ответа от сервера (10 секунд).\n\n' +
            'Возможные причины:\n' +
            '1. Backend сервер не запущен\n' +
            '   Решение: Откройте PowerShell и выполните: npm run dev\n\n' +
            '2. Сервер запускается медленно\n' +
            '   Подождите несколько секунд и попробуйте снова\n\n' +
            '3. Проблемы с сетью\n' +
            '   Проверьте подключение к интернету'
          );
        }
        
        if (fetchError.message?.includes('Failed to fetch') || 
            fetchError.message?.includes('ERR_CONNECTION_REFUSED') ||
            fetchError.message?.includes('NetworkError')) {
          const baseUrl = API_URL.replace('/api', '');
          throw new Error(
            '❌ Не удалось подключиться к серверу!\n\n' +
            `Сервер недоступен по адресу: ${baseUrl}\n\n` +
            '📋 Пошаговая инструкция:\n' +
            '1. Откройте новое окно PowerShell\n' +
            '2. Перейдите в папку проекта:\n' +
            '   cd c:\\Users\\user\\Desktop\\studycenter\n' +
            '3. Запустите сервер:\n' +
            '   npm run dev\n' +
            '4. Дождитесь сообщения:\n' +
            '   🚀 Сервер запущен на порту 3000\n' +
            '5. Вернитесь сюда и попробуйте войти снова\n\n' +
            `Текущий URL: ${API_URL}`
          );
        }
        
        throw fetchError;
      });

      // Проверяем статус ответа перед парсингом JSON
      if (!response.ok) {
        let errorMessage = 'Ошибка входа';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error?.message || errorMessage;
        } catch (e) {
          // Если не удалось распарсить JSON, используем статус
          errorMessage = `Ошибка сервера (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.user || !data.token) {
        throw new Error('Некорректный ответ от сервера');
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      console.log('[Auth] Login successful for user:', data.user.username);
    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      // Если ошибка уже имеет понятное сообщение, пробрасываем её дальше
      if (error.message && (error.message.includes('❌') || error.message.includes('Не удалось'))) {
        throw error;
      }
      // Иначе создаем понятное сообщение
      if (error.name === 'TypeError' && error.message?.includes('Failed to fetch')) {
        throw new Error(
          '❌ Не удалось подключиться к серверу!\n\n' +
          'Пожалуйста, убедитесь, что:\n' +
          '1. Backend сервер запущен (команда: npm run dev в корневой папке проекта)\n' +
          '2. Сервер работает на порту 3000\n' +
          '3. URL сервера правильный: ' + API_URL
        );
      }
      throw error;
    }
  };

  const register = async (username: string, password: string, email: string, firstName: string, lastName: string) => {
    try {
      console.log('Attempting to register:', { username, email, firstName, lastName });
      console.log('API URL:', API_URL);
      
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, email, firstName, lastName }),
      }).catch((fetchError) => {
        // Обработка сетевых ошибок (сервер не запущен, CORS, и т.д.)
        console.error('Fetch error:', fetchError);
        if (fetchError instanceof TypeError) {
          throw new Error('Не удалось подключиться к серверу. Убедитесь, что сервер запущен на порту 3000. Проверьте консоль браузера для деталей.');
        }
        throw fetchError;
      });

      // Проверяем, есть ли ответ вообще
      if (!response) {
        throw new Error('Сервер не отвечает. Убедитесь, что сервер запущен на порту 3000.');
      }

      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          const text = await response.text();
          throw new Error(`Ошибка сервера: ${text || 'Неизвестная ошибка'}`);
        }
      } else {
        // Если ответ не JSON, читаем как текст
        const text = await response.text();
        throw new Error(`Сервер вернул неожиданный ответ: ${text || 'Пустой ответ'}`);
      }

      if (!response.ok) {
        const errorMessage = data?.message || data?.error?.message || data?.error || `Ошибка регистрации (${response.status})`;
        console.error('Registration failed:', errorMessage);
        throw new Error(errorMessage);
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (error: any) {
      console.error('Register error details:', error);
      
      // Если это уже Error с сообщением, пробрасываем его
      if (error instanceof Error) {
        throw error;
      }
      
      // Если это объект с сообщением
      if (error && typeof error === 'object' && 'message' in error) {
        throw new Error(String(error.message));
      }
      
      throw new Error('Не удалось подключиться к серверу. Убедитесь, что сервер запущен на порту 3000.');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.role === 'admin',
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


