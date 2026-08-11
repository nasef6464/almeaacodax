import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  ChevronDown,
  Menu,
  X,
  User,
  LayoutGrid,
  BookOpen,
  FileText,
  Award,
  LogOut,
  Home,
  Grid,
  Book,
  LogIn,
  Shield,
  Gift,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { useStore } from '../store/useStore';
import type { HomepageSettings } from '../types';
import { sanitizeHomepageSettings } from '../utils/sanitizeMojibakeArabic';
import { ThemeToggle } from './ThemeToggle';
import { SearchModal } from './SearchModal';
import { NotificationBell } from './NotificationBell';
import { calculateStreak } from '../utils/streak';

const NavIcons: Record<string, React.ReactNode> = {
  home: <Home size={18} />,
  grid: <Grid size={18} />,
  'book-open': <BookOpen size={18} />,
  'file-text': <FileText size={18} />,
  book: <Book size={18} />,
  'layout-grid': <LayoutGrid size={18} />,
  gift: <Gift size={18} />,
  award: <Award size={18} />,
};

const text = {
  account: '\u062d\u0633\u0627\u0628\u064a',
  guest: '\u0645\u0633\u062a\u062e\u062f\u0645',
  dashboard: '\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645',
  courses: '\u062f\u0648\u0631\u0627\u062a\u064a',
  quizzes: '\u0627\u062e\u062a\u0628\u0627\u0631\u0627\u062a\u064a',
  achievements: '\u0627\u0644\u0634\u0647\u0627\u062f\u0627\u062a \u0648\u0627\u0644\u0625\u0646\u062c\u0627\u0632\u0627\u062a',
  profile: '\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a',
  adminPanel: '\u0644\u0648\u062d\u0629 \u0627\u0644\u0625\u062f\u0627\u0631\u0629',
  logout: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c',
  login: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
  createAccount: '\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u062c\u062f\u064a\u062f',
  email: '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',
  password: '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
  signUp: '\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628',
  signIn: '\u062f\u062e\u0648\u0644',
  or: '\u0623\u0648',
  continueWithGoogle: '\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u062c\u0648\u062c\u0644',
  forgotPassword: '\u0646\u0633\u064a\u062a \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\u061f',
  hasAccount: '\u0644\u062f\u064a \u062d\u0633\u0627\u0628 \u0628\u0627\u0644\u0641\u0639\u0644\u061f \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
  noAccount: '\u0644\u064a\u0633 \u0644\u062f\u064a\u0643 \u062d\u0633\u0627\u0628\u061f \u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u062c\u062f\u064a\u062f',
  main: '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
  quizzesNav: '\u0627\u062e\u062a\u0628\u0627\u0631\u0627\u062a',
  blog: '\u0627\u0644\u0645\u062f\u0648\u0646\u0629',
  offersPrefix: '\u0639\u0631\u0648\u0636 \u0648\u0628\u0627\u0642\u0627\u062a',
  platform: '\u0645\u0646\u0635\u0629',
  hundred: '\u0627\u0644\u0645\u0626\u0629',
  subtitle: '\u0642\u062f\u0631\u0627\u062a & \u062a\u062d\u0635\u064a\u0644\u064a',
  authFallbackError: '\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
  continueWithWhatsApp: '\u062a\u0633\u062c\u064a\u0644 \u0628\u0627\u0644\u0648\u0627\u062a\u0633\u0627\u0628',
  otpPhone: '\u0631\u0642\u0645 \u0627\u0644\u0648\u0627\u062a\u0633\u0627\u0628',
  otpCode: '\u0631\u0645\u0632 \u0627\u0644\u062a\u062d\u0642\u0642',
  otpSend: '\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0645\u0632',
  otpVerify: '\u062a\u062d\u0642\u0642 \u0648\u062f\u062e\u0648\u0644',
};
export const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [smartInput, setSmartInput] = useState('');
  const [smartPassword, setSmartPassword] = useState('');
  const [smartLoginLoading, setSmartLoginLoading] = useState(false);

  const detectInputType = (value: string): 'email' | 'phone' | 'nationalId' | 'unknown' => {
    const v = value.trim();
    if (v.includes('@')) return 'email';
    const digits = v.replace(/\D/g, '');
    if (/^[12]\d{9}$/.test(digits)) return 'nationalId';
    if (digits.length >= 8) return 'phone';
    return 'unknown';
  };

  const smartInputType = detectInputType(smartInput);
  // Password field shows for email, nationalId, AND phone (phone users may have password OR use OTP)
  const smartInputNeedsPassword = smartInputType === 'email' || smartInputType === 'nationalId' || smartInputType === 'phone';
  const smartInputIsPhone = smartInputType === 'phone';
  const [navigationLoadingExpired, setNavigationLoadingExpired] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [homepageSettings, setHomepageSettings] = useState<HomepageSettings | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { paths, subjects, levels, cartItems, recentActivity } = useStore();
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, logout } = useAuth();

  const getDashboardPathForRole = (role?: string | null) => {
    switch (role) {
      case 'admin':
        return '/admin-dashboard';
      case 'teacher':
        return '/instructor-dashboard';
      case 'supervisor':
        return '/supervisor-dashboard';
      case 'parent':
        return '/parent-dashboard';
      default:
        return '/dashboard';
    }
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    setActiveDropdown(null);
  }, [location]);

  useEffect(() => {
    const authParam = new URLSearchParams(location.search).get('auth');
    const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup';
    const shouldOpen = isAuthRoute || authParam === 'login' || authParam === 'signup';
    if (!shouldOpen) return;

    setIsSignUp(location.pathname === '/signup' || authParam === 'signup');
    setIsLoginModalOpen(true);
  }, [location.pathname, location.search]);

  const navigationMenu = useMemo(() => {
    const navSettings = homepageSettings?.navigation || {};
    const navItems = navSettings.items || [];
    const getNavItem = (id: string) => navItems.find((item) => item.id === id);
    const isNavVisible = (id: string) => getNavItem(id)?.visible !== false;
    const getNavLabel = (id: string, fallback: string) => getNavItem(id)?.label?.trim() || fallback;
    const getNavOrder = (id: string, fallback: number) => Number(getNavItem(id)?.order ?? fallback);
    const menu: Array<Record<string, any>> = [];

    if (isNavVisible('home')) {
      menu.push({ id: 'home', label: getNavLabel('home', text.main), link: '/', iconName: 'home' });
    }

    const canSeeHiddenPaths = ['admin', 'teacher', 'supervisor'].includes(user?.role || '');
    const activePaths = paths.filter(
      (path) =>
        (canSeeHiddenPaths || path.isActive !== false) &&
        path.showInNavbar !== false &&
        typeof path.id === 'string' &&
        path.id.trim().length > 0 &&
        typeof path.name === 'string' &&
        path.name.trim().length > 0
    );
    const topLevelPaths = activePaths.filter((path) => !path.parentPathId);
    const childPaths = activePaths.filter((path) => path.parentPathId);

    if (navSettings.showAutoPaths !== false) {
      topLevelPaths.forEach((path) => {
        const menuNode: Record<string, any> = {
          id: path.id,
          label: path.name,
          link: `/category/${path.id}`,
          iconName: 'book',
          children: [],
        };

        const pathLevels = levels.filter((level) => level.pathId === path.id);
        const pathSubjects = subjects.filter((subject) => subject.pathId === path.id);

        if (pathLevels.length > 0) {
          pathLevels.forEach((level) => {
            menuNode.children.push({
              id: level.id,
              label: level.name,
              link: `/category/${path.id}?level=${level.id}`,
              isGroup: true,
            });

            const levelSubjects = pathSubjects.filter((subject) => subject.levelId === level.id);
            levelSubjects.forEach((subject) => {
              menuNode.children.push({
                id: subject.id,
                label: subject.name,
                link: `/category/${path.id}?subject=${subject.id}`,
                isChild: true,
              });
            });
          });
        } else {
          pathSubjects.forEach((subject) => {
            menuNode.children.push({
              id: subject.id,
              label: subject.name,
              link: `/category/${path.id}?subject=${subject.id}`,
            });
          });
        }

        const subPaths = childPaths.filter((childPath) => childPath.parentPathId === path.id);
        if (subPaths.length > 0 && menuNode.children.length > 0) {
          menuNode.children.push({ isDivider: true });
        }

        subPaths.forEach((subPath) => {
          menuNode.children.push({
            id: subPath.id,
            label: subPath.name,
            link: `/category/${subPath.id}`,
          });
        });

        if (pathSubjects.length > 0 || subPaths.length > 0 || pathLevels.length > 0) {
          if (menuNode.children.length > 0) {
            menuNode.children.push({ isDivider: true });
          }

          menuNode.children.push({
            id: `${path.id}_mock_exams`,
            label: `اختبارات محاكية ${path.name}`,
            link: `/category/${path.id}?tab=mock-exams`,
            iconName: 'award',
          });

          menuNode.children.push({
            id: `${path.id}_packages`,
            label: `${text.offersPrefix} ${path.name}`,
            link: `/category/${path.id}?tab=packages`,
            iconName: 'gift',
          });
        } else {
          delete menuNode.children;
        }

        menu.push(menuNode);
      });
    }

    const mockExamPaths = topLevelPaths.filter((path) => path.settings?.showMockExamCard !== false);

    if (isNavVisible('mock-exams') && mockExamPaths.length > 0) {
      menu.push({
        id: 'mock-exams',
        label: getNavLabel('mock-exams', 'اختبارات محاكية'),
        link: '/mock-exams',
        iconName: 'award',
        children: mockExamPaths.map((path) => ({
          id: `mock-${path.id}`,
          label: path.name,
          link: `/category/${path.id}?tab=mock-exams`,
        })),
      });
    }

    const moreChildren = [
      isNavVisible('pricing') ? { id: 'pricing', label: getNavLabel('pricing', 'العضويات'), link: '/pricing', iconName: 'gift' } : null,
      isNavVisible('blog') ? { id: 'blog', label: getNavLabel('blog', text.blog), link: '/blog', iconName: 'layout-grid' } : null,
    ].filter(Boolean);

    if (moreChildren.length > 0) {
      menu.push({
        id: 'more',
        label: navSettings.moreLabel?.trim() || 'أخرى',
        link: moreChildren.length === 1 ? moreChildren[0]?.link : '#',
        iconName: 'layout-grid',
        children: moreChildren,
      });
    }

    return menu.sort((a, b) => getNavOrder(a.id, a.id === 'more' ? 100 : 50) - getNavOrder(b.id, b.id === 'more' ? 100 : 50));
  }, [homepageSettings?.navigation, levels, paths, subjects, user?.role]);
  const isPrivilegedUser = user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'supervisor';
  const showNavigationLoading = Boolean(user) && paths.length === 0 && navigationMenu.length <= 2 && !navigationLoadingExpired;
  const isStrongPassword = (value: string) => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

  useEffect(() => {
    if (!user || paths.length > 0) {
      setNavigationLoadingExpired(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setNavigationLoadingExpired(true);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [paths.length, user]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    let cancelled = false;

    api.getHomepageSettings()
      .then((settings) => {
        if (!cancelled) {
          setHomepageSettings(sanitizeHomepageSettings(settings as HomepageSettings));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHomepageSettings(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const brandLogoUrl = String(homepageSettings?.brand?.logoUrl || '').trim();
  const brandLogoAlt = String(homepageSettings?.brand?.logoAlt || 'منصة المئة').trim();
  const brandLogoText = String(homepageSettings?.brand?.logoText || text.platform).trim();
  const brandLogoAccentText = String(homepageSettings?.brand?.logoAccentText || text.hundred).trim();

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isAuthSubmitting) return;
    setAuthError('');
    setIsAuthSubmitting(true);

    if (isSignUp && !isStrongPassword(password)) {
      setAuthError('كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف ورقم.');
      setIsAuthSubmitting(false);
      return;
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();
      const sessionUser = isSignUp
        ? await signUpWithEmail(normalizedEmail, normalizedPassword)
        : await signInWithEmail(normalizedEmail, normalizedPassword);

      const nextPath = getDashboardPathForRole(sessionUser.role);

      setIsUserMenuOpen(false);
      setActiveDropdown(null);
      setIsMobileMenuOpen(false);
      setIsLoginModalOpen(false);
      setEmail('');
      setPassword('');

      navigate(nextPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : text.authFallbackError;
      setAuthError(message);
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleSmartLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (smartLoginLoading) return;
    setAuthError('');
    setSmartLoginLoading(true);
    const v = smartInput.trim();
    const pw = smartPassword.trim();
    const digits = v.replace(/\D/g, '');
    try {
      let sessionUser: any;
      if (smartInputType === 'email') {
        sessionUser = await signInWithEmail(v.toLowerCase(), pw);
      } else if (smartInputType === 'nationalId') {
        await api.nationalIdLogin(digits, pw);
        window.location.reload();
        return;
      } else if (smartInputType === 'phone') {
        // الدخول بالجوال + كلمة المرور مباشرة
        await api.post('/auth/login/phone-password', { phone: digits || v, password: pw });
        window.location.reload();
        return;
      } else {
        setAuthError('أدخل بريد إلكتروني أو رقم جوال أو رقم الهوية');
        setSmartLoginLoading(false);
        return;
      }
      if (sessionUser) {
        setIsLoginModalOpen(false);
        setSmartInput('');
        setSmartPassword('');
        navigate(getDashboardPathForRole(sessionUser.role));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : text.authFallbackError;

      setAuthError(message);
    } finally {
      setSmartLoginLoading(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm font-sans dark:bg-gray-950 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20 gap-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsMobileMenuOpen((value) => !value)}
              aria-label={isMobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <Link to="/" className="flex items-center gap-2 min-w-0">
              {brandLogoUrl ? (
                <img
                  src={brandLogoUrl}
                  alt={brandLogoAlt}
                  className="h-9 w-9 sm:h-11 sm:w-11 rounded-full object-contain bg-white border border-amber-100 shadow-sm"
                />
              ) : null}
              <div className="text-lg sm:text-2xl font-black text-amber-500 flex items-baseline min-w-0">
                <span className="text-blue-900">{brandLogoText}</span>
                <span className="mx-1">{brandLogoAccentText}</span>
                <span className="hidden sm:block text-xs font-normal text-gray-400 -mt-2">{text.subtitle}</span>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {showNavigationLoading ? (
              <div className="flex items-center gap-3 px-3 py-2" aria-label="جارٍ تجهيز قائمة المنصة">
                {Array.from({ length: 4 }).map((_, index) => (
                  <span
                    key={`nav-loading-${index}`}
                    className={`h-4 animate-pulse rounded-full bg-gray-100 ${index === 0 ? 'w-16' : index === 1 ? 'w-24' : 'w-20'}`}
                  />
                ))}
              </div>
            ) : navigationMenu.map((item, index) => {
              const icon = item.iconName ? NavIcons[item.iconName] : null;

              return (
                <div
                  key={`nav-${item.id}-${index}`}
                  className="relative group px-3 py-2"
                  onMouseEnter={() => setActiveDropdown(item.id)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    to={item.link || '#'}
                    className="flex items-center gap-2 text-gray-700 font-bold hover:text-amber-500 transition-colors text-sm"
                  >
                    {icon ? (
                      <span className="text-gray-400 group-hover:text-amber-500 transition-colors">{icon}</span>
                    ) : null}
                    {item.label}
                    {item.children ? <ChevronDown size={14} /> : null}
                  </Link>

                  {item.children && activeDropdown === item.id ? (
                    <div className="absolute top-full right-0 w-56 bg-white shadow-xl rounded-b-xl border-t-2 border-amber-500 py-2 animate-fade-in z-50">
                      {item.children.map((child: Record<string, any>, childIndex: number) => {
                        if (child.isDivider) {
                          return <div key={`divider-${childIndex}`} className="h-px bg-gray-100 my-1 mx-2" />;
                        }

                        return (
                          <Link
                            key={`child-${child.id}-${childIndex}`}
                            to={child.link || '#'}
                            className={`block px-4 py-2 text-sm transition-colors ${
                              child.isGroup
                                ? 'bg-gray-50 text-gray-800 font-bold border-b border-gray-100'
                                : child.isChild
                                  ? 'text-gray-600 hover:bg-blue-50 hover:text-blue-700 pr-8'
                                  : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700 font-medium'
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <ThemeToggle />

            <button
              onClick={() => setIsSearchOpen(true)}
              className="text-gray-500 hover:text-amber-500 transition-colors dark:text-gray-300"
              title="بحث (Ctrl+K)"
              aria-label="فتح البحث"
            >
              <Search size={20} />
            </button>

            {/* جرس الإشعارات — للمستخدمين المسجلين فقط */}
            {user && <NotificationBell token={user.token} />}

            <Link to="/cart" className="relative text-gray-500 hover:text-amber-500 transition-colors dark:text-gray-300">
              <ShoppingCart size={20} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartItems.length}
              </span>
            </Link>

            {user ? (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full text-orange-600 shadow-sm" title="أيام متتالية">
                <span className="text-[13px] font-black">{calculateStreak(recentActivity)}</span>
                <span className="text-base leading-none drop-shadow-sm">🔥</span>
              </div>
            ) : null}

            <div className="relative">
              {user ? (
                <>
                  <button
                    onClick={() => setIsUserMenuOpen((value) => !value)}
                    className="flex items-center gap-2 hover:bg-gray-50 p-1 sm:pr-3 rounded-full border border-transparent hover:border-gray-100 transition-all"
                  >
                    <div className="hidden lg:block text-left">
                      <span className="block text-xs text-gray-500 font-normal">{text.account}</span>
                      <span className="block text-sm font-bold text-gray-800 leading-none">
                        {user.displayName || text.guest}
                      </span>
                    </div>
                    <img
                      src={user.photoURL}
                      alt="User"
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  </button>

                  {isUserMenuOpen ? (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white shadow-xl rounded-xl border border-gray-100 py-2 animate-fade-in z-50">
                      <div className="px-4 py-3 border-b border-gray-100 mb-2">
                        <p className="font-bold text-gray-800">{user.displayName || text.guest}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>

                      <UserMenuItem to={getDashboardPathForRole(user.role)} icon={<LayoutGrid size={18} />} label={text.dashboard} />
                      <UserMenuItem to="/dashboard?tab=my-courses" icon={<BookOpen size={18} />} label={text.courses} />
                      <UserMenuItem to="/my-quizzes" icon={<FileText size={18} />} label={text.quizzes} />
                      <UserMenuItem to="/achievements" icon={<Award size={18} />} label={text.achievements} />
                      <UserMenuItem to="/profile" icon={<User size={18} />} label={text.profile} />

                      {isPrivilegedUser ? (
                        <UserMenuItem
                          to={getDashboardPathForRole(user.role)}
                          icon={<Shield size={18} />}
                          label={user.role === 'admin' ? text.adminPanel : text.dashboard}
                        />
                      ) : null}

                      <div className="border-t border-gray-100 mt-2 pt-2">
                        <button
                          data-logout-explicit="true"
                          onClick={async () => {
                            await logout();
                            setIsUserMenuOpen(false);
                            navigate('/?auth=login', { replace: true });
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors"
                        >
                          <LogOut size={18} />
                          {text.logout}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-lg font-bold transition-colors"
                >
                  <LogIn size={18} />
                  <span className="hidden sm:inline">{text.login}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isMobileMenuOpen ? (
        <div className="md:hidden fixed inset-0 z-40 bg-white overflow-y-auto pb-20 animate-fade-in">
          <div className="p-4 pt-20">
            {navigationMenu.map((item, index) => {
              const icon = item.iconName ? NavIcons[item.iconName] : null;

              return (
                <div key={`mobile-nav-${item.id}-${index}`} className="mb-4">
                  <Link
                    to={item.link || '#'}
                    data-mobile-nav={String(item.id || '')}
                    className="flex items-center gap-3 font-bold text-lg text-gray-800 mb-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {icon ? <span className="text-amber-500">{icon}</span> : null}
                    {item.label}
                  </Link>

                  {item.children ? (
                    <div className="pr-9 space-y-2 border-r-2 border-gray-100 mr-1">
                      {item.children
                        .filter((child: Record<string, any>) => !child.isDivider)
                        .map((child: Record<string, any>, childIndex: number) => (
                          <Link
                            key={`mobile-child-${child.id}-${childIndex}`}
                            to={child.link || '#'}
                            className={`block py-1 ${child.isGroup ? 'font-bold text-gray-800' : 'text-gray-600'}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            {child.label}
                          </Link>
                        ))}
                    </div>
                  ) : null}
                </div>
              );
            })}

            {!user ? (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  data-mobile-login="true"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsLoginModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 font-bold text-white transition-colors hover:bg-emerald-600"
                >
                  <LogIn size={18} />
                  <span>{text.login}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isLoginModalOpen ? (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">

            <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isSignUp ? 'انضم إلى منصة المئة اليوم' : 'مرحباً بعودتك!'}
                </p>
              </div>
              <button
                id="login-modal-close"
                onClick={() => { setIsLoginModalOpen(false); setAuthError(''); setSmartInput(''); setSmartPassword(''); setOtpSent(false); setOtpCode(''); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {authError ? (
                <div id="login-error-banner" className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">⚠️</span>
                  <span>{authError}</span>
                </div>
              ) : null}

              {!isSignUp ? (
                <button
                  id="login-google-btn"
                  onClick={async () => {
                    try {
                      await signInWithGoogle();
                      setIsLoginModalOpen(false);
                    } catch (error) {
                      const message = error instanceof Error ? error.message : text.authFallbackError;
                      setAuthError(message);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 font-bold py-3 rounded-xl transition-all"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  الدخول بحساب Google
                </button>
              ) : null}

              {!isSignUp ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">أو سجّل بأحد الطرق التالية</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              ) : null}

              {!isSignUp ? (
                <form id="smart-login-form" onSubmit={handleSmartLogin} className="space-y-3">
                  <div>
                    <div className="relative">
                      <input
                        id="smart-login-input"
                        type="text"
                        inputMode="email"
                        value={smartInput}
                        onChange={(e) => { setSmartInput(e.target.value); setAuthError(''); setOtpSent(false); setOtpCode(''); }}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-emerald-400 outline-none transition-colors"
                        dir="auto"
                        placeholder="البريد الإلكتروني أو رقم الجوال أو رقم الهوية"
                        autoComplete="username"
                        autoFocus
                      />
                      {smartInput.trim().length > 3 && (
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-0.5 rounded-full ${
                          smartInputType === 'email' ? 'bg-blue-100 text-blue-700' :
                          smartInputType === 'nationalId' ? 'bg-purple-100 text-purple-700' :
                          smartInputType === 'phone' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-400'
                        }`}>
                          {smartInputType === 'email' ? '✉ إيميل' :
                           smartInputType === 'nationalId' ? '🪪 هوية' :
                           smartInputType === 'phone' ? '📱 جوال' : '...'}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">الهوية: 10 أرقام تبدأ بـ 1 أو 2</p>
                  </div>

                  {/* ─── كلمة المرور — تظهر دائماً ─── */}
                  {smartInput.trim().length > 3 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-bold text-gray-700">كلمة المرور</label>
                        <Link to="/forgot-password" onClick={() => setIsLoginModalOpen(false)} className="text-xs text-emerald-600 hover:underline font-bold">
                          {text.forgotPassword}
                        </Link>
                      </div>
                      <input
                        id="smart-login-password"
                        type="password"
                        value={smartPassword}
                        onChange={(e) => setSmartPassword(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-emerald-400 outline-none text-left transition-colors"
                        dir="ltr"
                        placeholder="كلمة المرور"
                        autoComplete="current-password"
                      />
                    </div>
                  )}

                  {/* ─── زر الدخول الرئيسي ─── */}
                  <button
                    id="smart-login-submit"
                    type="submit"
                    disabled={
                      smartLoginLoading ||
                      smartInput.trim().length < 4 ||
                      !smartPassword.trim()
                    }
                    className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-black py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
                  >
                    {smartLoginLoading && !otpSent ? (
                      <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />جارٍ...</span>
                    ) : 'دخول'}
                  </button>

                  {/* ─── WhatsApp OTP — خيار مستقل فقط للجوال ─── */}
                  {smartInputIsPhone && smartInput.trim().length > 3 && (
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      <p className="text-xs text-center text-gray-400 font-medium">أو الدخول عبر رمز واتساب</p>

                      {!otpSent ? (
                        <button
                          id="smart-otp-send-btn"
                          type="button"
                          disabled={smartLoginLoading}
                          onClick={async () => {
                            setAuthError('');
                            setSmartLoginLoading(true);
                            try {
                              await api.whatsappStartLogin(smartInput.trim());
                              setOtpSent(true);
                            } catch (err) {
                              setAuthError(err instanceof Error ? err.message : 'حدث خطأ');
                            } finally {
                              setSmartLoginLoading(false);
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-50 text-sm"
                        >
                          {smartLoginLoading ? (
                            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          )}
                          إرسال رمز على واتساب
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <input
                            id="smart-otp-code"
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-4 py-3 border-2 border-[#25D366] rounded-xl focus:ring-0 focus:border-[#1ebe5d] outline-none text-center text-2xl font-mono tracking-widest"
                            dir="ltr"
                            placeholder="• • • • • •"
                            autoFocus
                          />
                          <p className="text-xs text-[#25D366] text-center font-medium">✓ تم إرسال الرمز على واتساب</p>
                          <button
                            id="smart-otp-verify-btn"
                            type="button"
                            disabled={smartLoginLoading || otpCode.length !== 6}
                            onClick={async () => {
                              setAuthError('');
                              setSmartLoginLoading(true);
                              try {
                                await api.whatsappVerifyLogin(smartInput.trim(), otpCode.trim());
                                window.location.reload();
                              } catch (err) {
                                setAuthError(err instanceof Error ? err.message : 'رمز غير صحيح');
                                setSmartLoginLoading(false);
                              }
                            }}
                            className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-50 text-sm"
                          >
                            {smartLoginLoading ? (
                              <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />جارٍ...</span>
                            ) : 'تحقق وادخل'}
                          </button>
                          <button type="button" onClick={() => { setOtpSent(false); setOtpCode(''); }} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">إعادة إرسال الرمز</button>
                        </div>
                      )}
                    </div>
                  )}
                </form>

              ) : null}

              {isSignUp ? (
                <form id="signup-form" onSubmit={handleEmailAuth} className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">الاسم الكامل</label>
                    <input
                      type="text"
                      aria-label="Name"
                      required
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-400 outline-none"
                      placeholder="الاسم الثلاثي"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">البريد الإلكتروني</label>
                    <input
                      type="email"
                      aria-label="Email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-400 outline-none text-left"
                      dir="ltr"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">كلمة المرور</label>
                    <input
                      type="password"
                      aria-label="Password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-400 outline-none text-left"
                      dir="ltr"
                      placeholder="8 أحرف على الأقل"
                    />
                    <p className="mt-1 text-xs text-gray-400">8 أحرف على الأقل، مع حرف ورقم.</p>
                  </div>
                  <button
                    type="submit"
                    disabled={isAuthSubmitting}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-xl transition-colors disabled:opacity-60"
                  >
                    {isAuthSubmitting ? '...' : 'إنشاء الحساب'}
                  </button>
                </form>
              ) : null}

              <div className="text-center pt-2 border-t border-gray-100">
                <button
                  id="toggle-signup-login"
                  onClick={() => { setIsSignUp((v) => !v); setAuthError(''); setSmartInput(''); setSmartPassword(''); }}
                  className="text-sm text-emerald-600 hover:underline font-bold"
                >
                  {isSignUp ? 'لديّ حساب بالفعل — تسجيل الدخول' : 'ليس لديّ حساب — إنشاء حساب جديد'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <SearchModal open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
};

const UserMenuItem = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <Link
    to={to}
    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium"
  >
    {icon}
    {label}
  </Link>
);
