// Shared read-time policy; missing dates retain legacy permanent membership.
export const hasActivePremium = (user: { subscription?: { plan?: string; expiresAt?: unknown } | null } | null | undefined, now = Date.now()) => {
  if (user?.subscription?.plan !== 'premium') return false;
  const expiry = user.subscription.expiresAt;
  return expiry == null || new Date(expiry as string | number).getTime() > now;
};
