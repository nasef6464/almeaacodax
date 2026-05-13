
import React from 'react';
import { Header } from './Header';
import { Phone } from 'lucide-react';

const ChatWidget = React.lazy(() => import('./ChatWidget').then((module) => ({ default: module.ChatWidget })));

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-white font-sans text-gray-900" dir="rtl">
            <Header />
            
            <main>
                {children}
            </main>

            <React.Suspense fallback={null}>
                <ChatWidget />
            </React.Suspense>

            {/* WhatsApp Float Button */}
            <a 
                href="https://wa.me/123456789" 
                target="_blank" 
                rel="noreferrer"
                className="fixed bottom-8 right-8 bg-[#25D366] hover:bg-[#20bd5a] text-white p-4 rounded-full shadow-lg transition-all z-50 flex items-center justify-center animate-bounce-slow"
            >
                <Phone size={24} fill="white" />
            </a>
        </div>
    );
};
