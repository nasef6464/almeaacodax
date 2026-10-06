import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center" dir="rtl">
      <div className="mb-6 text-8xl font-black text-gray-200">404</div>
      <h1 className="mb-3 text-2xl font-bold text-gray-800">الصفحة غير موجودة</h1>
      <p className="mb-8 max-w-md text-gray-500">
        عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
      </p>
      <div className="flex gap-4">
        <Link
          to="/"
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
        >
          العودة للرئيسية
        </Link>
        <Link
          to="/dashboard"
          className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
        >
          لوحة التحكم
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
