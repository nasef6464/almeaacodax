import { useEffect, useState } from 'react';
import { hasActivePremium } from '../server/src/utils/premiumAccess';
type PremiumUser = Parameters<typeof hasActivePremium>[0];
export const usePremiumExpiryClock = (users: PremiumUser[]) => {
  const [clock, setClock] = useState(Date.now);
  const expiryKey = users.filter(user => user?.subscription?.plan === 'premium')
    .map(user => String(user?.subscription?.expiresAt ?? '')).join('|');
  useEffect(() => {
    const futureDates = users.filter(user => user?.subscription?.plan === 'premium')
      .map(user => new Date(user?.subscription?.expiresAt as string | number).getTime()).filter(date => date > Date.now());
    const refresh = () => setClock(Date.now());
    const remaining = futureDates.length ? Math.min(...futureDates) - Date.now() : NaN;
    const timer = remaining > 0 ? window.setTimeout(refresh, Math.min(remaining + 1, 2147483647)) : undefined;
    window.addEventListener('focus', refresh);
    return () => { if (timer !== undefined) window.clearTimeout(timer); window.removeEventListener('focus', refresh); };
  }, [expiryKey, clock]);
  return clock;
};
export const useActivePremium = (user: PremiumUser) => {
  usePremiumExpiryClock([user]);
  return hasActivePremium(user);
};
