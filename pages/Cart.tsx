import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { PaymentModal } from '../components/PaymentModal';
import type { CartItem } from '../types';

const typeLabel: Record<CartItem['type'], string> = {
  course: 'دورة',
  package: 'باقة',
  skill: 'تأسيس',
  test: 'اختبار',
  bank: 'بنك أسئلة',
};

const Cart: React.FC = () => {
  const { cartItems, removeFromCart, clearCart } = useStore();
  const [activeItem, setActiveItem] = useState<CartItem | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isCheckoutPage = location.pathname === '/checkout';

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.price || 0), 0),
    [cartItems],
  );

  const confirmRemoveItem = (item: CartItem) => {
    const confirmed = window.confirm(`هل تريد حذف "${item.title}" من السلة؟ يمكنك إضافته مرة أخرى لاحقًا.`);
    if (!confirmed) return;
    removeFromCart(item.id, item.type);
  };

  const confirmClearCart = () => {
    const confirmed = window.confirm('هل تريد تفريغ السلة بالكامل؟ ستحتاج لإضافة العناصر مرة أخرى قبل الشراء.');
    if (!confirmed) return;
    clearCart();
  };

  if (!cartItems.length) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10" dir="rtl">
        <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <ShoppingCart className="mx-auto mb-3 text-gray-400" size={32} />
          <h1 className="text-xl font-black text-gray-900">سلة المشتريات فارغة</h1>
          <p className="mt-2 text-sm font-bold text-gray-500">أضف دورة أو باقة من صفحة الشراء أولاً.</p>
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            className="mt-5 inline-flex rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700"
          >
            تصفح العضويات
          </button>
          {isCheckoutPage ? (
            <button
              type="button"
              disabled
              className="mt-3 inline-flex cursor-not-allowed rounded-2xl bg-indigo-300 px-5 py-3 text-sm font-black text-white"
            >
              إتمام الدفع الآن
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8" dir="rtl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-gray-900">سلة المشتريات</h1>
        <button
          type="button"
          data-testid="cart-clear-confirm"
          onClick={confirmClearCart}
          className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-black text-rose-700 hover:bg-rose-50"
        >
          تفريغ السلة
        </button>
      </div>

      <div className="space-y-3">
        {cartItems.map((item) => (
          <div key={`${item.type}-${item.id}`} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-2 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-black text-indigo-700">
                  {typeLabel[item.type]}
                </div>
                <h3 className="text-base font-black text-gray-900">{item.title}</h3>
              </div>
              <div className="text-left">
                <div className="text-sm font-black text-indigo-700">{item.price} {item.currency || 'SAR'}</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveItem(item)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700"
              >
                شراء الآن
              </button>
              <button
                type="button"
                data-testid="cart-remove-confirm"
                onClick={() => confirmRemoveItem(item)}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-xs font-black text-gray-600 hover:bg-gray-50"
              >
                <Trash2 size={14} />
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-500">إجمالي السلة</span>
          <span className="text-xl font-black text-indigo-700">{total} SAR</span>
        </div>
        {isCheckoutPage ? (
          <button
            type="button"
            onClick={() => setActiveItem(cartItems[0] || null)}
            className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white hover:bg-indigo-700"
          >
            إتمام الدفع الآن
          </button>
        ) : null}
      </div>

      {activeItem ? (
        <PaymentModal
          isOpen
          onClose={() => setActiveItem(null)}
          item={activeItem}
          type={activeItem.type}
        />
      ) : null}
    </div>
  );
};

export default Cart;
