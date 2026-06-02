
import React, { useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { Phone } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../services/api';

const ChatWidget = React.lazy(() => import('./ChatWidget').then((module) => ({ default: module.ChatWidget })));

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const location = useLocation();
    const [contactWidget, setContactWidget] = useState<{
        enabled: boolean;
        channel: 'whatsapp' | 'telegram' | 'phone';
        whatsappNumber: string;
        whatsappMessage: string;
        openInNewTab: boolean;
        showOnPublicPages: boolean;
        showOnDashboardPages: boolean;
    } | null>(null);

    useEffect(() => {
        let cancelled = false;
        api.getPublicContactWidget().then((payload) => {
            if (!cancelled) setContactWidget(payload);
        }).catch(() => {
            if (!cancelled) setContactWidget(null);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const showFloatingContact = useMemo(() => {
        if (!contactWidget?.enabled) return false;
        const path = location.pathname || '/';
        const isDashboard =
            path.includes('dashboard') ||
            path.startsWith('/quiz') ||
            path.startsWith('/results') ||
            path.startsWith('/profile') ||
            path.startsWith('/reports');
        if (isDashboard) return contactWidget.showOnDashboardPages;
        return contactWidget.showOnPublicPages;
    }, [contactWidget, location.pathname]);

    const whatsappHref = useMemo(() => {
        const number = String(contactWidget?.whatsappNumber || '').replace(/[^\d]/g, '');
        if (!number) return '';
        const text = encodeURIComponent(contactWidget?.whatsappMessage || 'مرحبًا');
        return `https://wa.me/${number}?text=${text}`;
    }, [contactWidget]);

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 dark:bg-gray-950 dark:text-gray-100" dir="rtl">
            <Header />
            
            <main>
                {children}
            </main>

            <footer className="border-t border-gray-100 bg-gray-50">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm font-bold text-gray-600 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                        <Link to="/about" className="hover:text-indigo-700">من نحن</Link>
                        <Link to="/contact" className="hover:text-indigo-700">تواصل معنا</Link>
                        <Link to="/faq" className="hover:text-indigo-700">الأسئلة الشائعة</Link>
                        <Link to="/privacy" className="hover:text-indigo-700">سياسة الخصوصية</Link>
                        <Link to="/terms" className="hover:text-indigo-700">الشروط والأحكام</Link>
                    </div>
                    <div className="text-xs text-gray-500">منصة المئة للقدرات والتحصيلي</div>
                </div>
            </footer>

            <React.Suspense fallback={null}>
                <ChatWidget />
            </React.Suspense>

            {showFloatingContact && whatsappHref ? (
                <a
                    href={whatsappHref}
                    target={contactWidget?.openInNewTab ? '_blank' : '_self'}
                    rel="noreferrer"
                    className="fixed bottom-8 right-8 bg-[#25D366] hover:bg-[#20bd5a] text-white p-4 rounded-full shadow-lg transition-all z-50 flex items-center justify-center animate-bounce-slow"
                    aria-label="WhatsApp contact"
                    title="تواصل معنا عبر واتساب"
                >
                    <Phone size={24} fill="white" />
                </a>
            ) : null}
        </div>
    );
};
