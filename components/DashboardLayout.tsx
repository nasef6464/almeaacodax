import React, { useState } from 'react';
import { Header } from './Header';
import { Menu, X } from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
    sidebar: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, sidebar }) => {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col" dir="rtl">
            <Header />

            {/* Mobile Sidebar Navigation Bar */}
            <div className="md:hidden sticky top-16 z-20 flex items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-2.5 backdrop-blur shadow-xs">
                <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs font-black text-gray-800 transition hover:bg-gray-100 active:scale-95"
                    aria-label="فتح أقسام لوحة التحكم"
                >
                    <Menu size={16} className="text-indigo-600" />
                    <span>أقسام اللوحة والتبويبات</span>
                </button>
                <span className="text-[11px] font-bold text-gray-400">إدارة المنصة</span>
            </div>

            {/* Mobile Slide-Over Drawer */}
            {isMobileSidebarOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
                        onClick={() => setIsMobileSidebarOpen(false)}
                    />
                    {/* Drawer Content */}
                    <aside className="relative flex w-4/5 max-w-xs flex-1 flex-col bg-white shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3">
                            <span className="text-sm font-black text-gray-900">أقسام اللوحة</span>
                            <button
                                type="button"
                                onClick={() => setIsMobileSidebarOpen(false)}
                                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200/70 hover:text-gray-800"
                                aria-label="إغلاق القائمة"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div
                            className="flex-1 overflow-y-auto"
                            onClick={(e) => {
                                if ((e.target as HTMLElement).closest('button')) {
                                    setIsMobileSidebarOpen(false);
                                }
                            }}
                        >
                            {sidebar}
                        </div>
                    </aside>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 bg-white border-l border-gray-200 overflow-y-auto hidden md:block shadow-sm z-20">
                    {sidebar}
                </aside>
                
                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};
