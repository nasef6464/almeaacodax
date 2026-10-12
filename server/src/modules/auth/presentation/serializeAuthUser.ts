export const serializeUser = (user: any) => {
  const plain = typeof user?.toJSON === "function" ? user.toJSON() : user?.toObject?.() || user;
  const {
    passwordHash,
    failedLoginAttempts,
    lastFailedLoginAt,
    loginLockedUntil,
    emailVerificationTokenHash,
    passwordResetTokenHash,
    __v,
    ...safeUser
  } = plain;
  return safeUser;
};
