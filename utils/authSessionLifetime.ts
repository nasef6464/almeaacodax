type AuthActor = { id?: unknown; _id?: unknown; email?: string } | null | undefined;
let revision = 0;
export const advanceAuthSession = () => ++revision;
export const captureAuthActor = (user: AuthActor) => ({ revision, actorId: String(user?.id || user?._id || '').trim() });
export const isCurrentAuthActor = (snapshot: ReturnType<typeof captureAuthActor>, user: AuthActor) =>
  snapshot.revision === revision && snapshot.actorId === String(user?.id || user?._id || '').trim();
