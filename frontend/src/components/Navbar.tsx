import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, User, LogOut, LogIn, UserPlus } from 'lucide-react';

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  const toggleLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setIsLangOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const { isTeacher } = useAuth();
  
  const navLinks = [];
  
  // Админ и преподаватель не видят главную страницу, курсы и филиалы
  if (!isAdmin && !isTeacher) {
    navLinks.push(
      { path: '/', label: t('nav.home') },
      { path: '/courses', label: t('nav.courses') },
      { path: '/branches', label: t('nav.branches') }
    );
  }

  if (isAuthenticated && !isAdmin && !isTeacher) {
    navLinks.push({ path: '/account', label: t('nav.account') });
  }

  if (isTeacher) {
    navLinks.push({ path: '/teacher', label: 'Панель преподавателя' });
  }

  if (isAdmin) {
    navLinks.push({ path: '/admin', label: t('nav.admin') });
  }

  return (
    <nav className="glass sticky top-0 z-50 backdrop-blur-xl border-b border-gray-200/50" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link 
            to={isAdmin ? "/admin" : isTeacher ? "/teacher" : "/"} 
            className="text-3xl font-extrabold gradient-text hover:scale-105 transition-transform duration-300"
            aria-label="Люблю Учиться Home"
          >
            Люблю Учиться
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  location.pathname === link.path
                    ? 'text-white bg-gradient-to-r from-primary-600 to-primary-700 shadow-md shadow-primary-500/30'
                    : 'text-gray-700 hover:text-primary-600 hover:bg-gradient-to-r hover:from-primary-50 hover:to-accent-50'
                }`}
                aria-current={location.pathname === link.path ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}

            {/* Auth Section */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-gray-700">
                  <User className="w-5 h-5" />
                  <span className="text-sm">
                    {user?.firstName} {user?.lastName}
                  </span>
                  {isAdmin && (
                    <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                      Админ
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Выйти</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Войти</span>
                </Link>
                <Link
                  to="/register"
                  className="btn-accent flex items-center space-x-2 text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Регистрация</span>
                </Link>
              </div>
            )}

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Select language"
                aria-expanded={isLangOpen}
                aria-haspopup="true"
              >
                <Globe className="w-5 h-5" aria-hidden="true" />
                <span className="uppercase">{i18n.language}</span>
              </button>

              <AnimatePresence>
                {isLangOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg py-1 z-50"
                    role="menu"
                  >
                    <button
                      onClick={() => toggleLanguage('ru')}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-primary-50 transition-colors ${
                        i18n.language === 'ru' ? 'text-primary-600 font-semibold' : 'text-gray-700'
                      }`}
                      role="menuitem"
                    >
                      Русский
                    </button>
                    <button
                      onClick={() => toggleLanguage('en')}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-primary-50 transition-colors ${
                        i18n.language === 'en' ? 'text-primary-600 font-semibold' : 'text-gray-700'
                      }`}
                      role="menuitem"
                    >
                      English
                    </button>
                    <button
                      onClick={() => toggleLanguage('ky')}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-primary-50 transition-colors ${
                        i18n.language === 'ky' ? 'text-primary-600 font-semibold' : 'text-gray-700'
                      }`}
                      role="menuitem"
                    >
                      Кыргызча
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-200"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    location.pathname === link.path
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                  aria-current={location.pathname === link.path ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              ))}
              
              {isAuthenticated ? (
                <div className="px-3 py-2 space-y-2">
                  <div className="flex items-center space-x-2 text-gray-700">
                    <User className="w-5 h-5" />
                    <span className="text-sm">
                      {user?.firstName} {user?.lastName}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Выйти</span>
                  </button>
                </div>
              ) : (
                <div className="px-3 py-2 space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                  >
                    Войти
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full text-center btn-primary"
                  >
                    Регистрация
                  </Link>
                </div>
              )}

                  <div className="px-3 py-2 flex items-center space-x-2">
                    <Globe className="w-5 h-5 text-gray-700" />
                    <button
                      onClick={() => toggleLanguage('ru')}
                      className={`px-3 py-1 rounded-md text-sm ${
                        i18n.language === 'ru' ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      RU
                    </button>
                    <button
                      onClick={() => toggleLanguage('en')}
                      className={`px-3 py-1 rounded-md text-sm ${
                        i18n.language === 'en' ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => toggleLanguage('ky')}
                      className={`px-3 py-1 rounded-md text-sm ${
                        i18n.language === 'ky' ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      KY
                    </button>
                  </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
