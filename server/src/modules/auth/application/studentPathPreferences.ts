import { PathModel } from '../../../models/Path.js';
import { LevelModel } from '../../../models/Level.js';
import { UserModel } from '../../../models/User.js';

type Stage = { pathId: string; levelId: string };
type Preferences = { enrolledPaths?: string[]; pathStageSelections?: Stage[] };
type Current = { role?: string; enrolledPaths?: string[]; pathStageSelections?: Stage[] };
type Path = { _id: string; isActive?: boolean; showInHome?: boolean; showInNavbar?: boolean; settings?: Record<string, unknown> };
const invalid = (message: string, status = 400): never => { throw Object.assign(new Error(message), { status }); };

/** Presentation enrollment only: never grants courses, premium or assessment access. */
export function resolveStudentPathPreferences(current: Current, payload: Preferences, paths: Path[], levels: { _id: string; pathId: string }[]): Preferences {
  if (payload.enrolledPaths === undefined && payload.pathStageSelections === undefined) return {};
  const enrolledPaths = [...new Set(payload.enrolledPaths ?? current.enrolledPaths ?? [])];
  const existing = new Set(current.enrolledPaths ?? []);
  const selected = new Map((current.pathStageSelections ?? []).map((row) => [row.pathId, { pathId: row.pathId, levelId: row.levelId }]));
  // Partial writes retain other selections; prune only explicitly removed enrollments.
  if (payload.enrolledPaths !== undefined) for (const id of selected.keys()) if (!enrolledPaths.includes(id)) selected.delete(id);
  for (const row of payload.pathStageSelections ?? []) {
    if (!enrolledPaths.includes(row.pathId)) invalid('Stage path must be enrolled');
    // An unchanged enrolled legacy row is a roundtrip, not a new stage assignment.
    const unchanged = existing.has(row.pathId) && current.pathStageSelections?.some((saved) => saved.pathId === row.pathId && saved.levelId === row.levelId);
    if (!unchanged && (!paths.some((path) => path._id === row.pathId) || !levels.some((level) => level._id === row.levelId && level.pathId === row.pathId))) invalid('Invalid stage for path');
    selected.set(row.pathId, { ...row });
  }
  for (const pathId of enrolledPaths) {
    if (existing.has(pathId)) continue; // No forced backfill for legacy enrollment.
    const path = paths.find((item) => item._id === pathId);
    if (!path || path.isActive === false || (path.showInHome === false && path.showInNavbar === false)) return invalid('Path is not available for enrollment');
    const policy = path.settings?.stageSelection ?? 'auto';
    const needsStage = policy === 'required' || (policy === 'auto' && levels.some((level) => level.pathId === pathId));
    if (current.role === 'student' && needsStage && !selected.has(pathId)) invalid('Select a stage for this path');
    const stage = selected.get(pathId);
    if (needsStage && stage && !levels.some((level) => level._id === stage.levelId && level.pathId === pathId)) invalid('Invalid stage for path');
  }
  if (selected.size > 100) invalid('Too many path stage selections');
  return { ...(payload.enrolledPaths !== undefined ? { enrolledPaths } : {}), pathStageSelections: [...selected.values()] };
}

export async function prepareStudentPathPreferenceWrite(userId: string | undefined, payload: Preferences) {
  if (payload.enrolledPaths === undefined && payload.pathStageSelections === undefined) return { filter: { _id: userId }, update: {} };
  const current = await UserModel.findById(userId).select('role enrolledPaths pathStageSelections').lean();
  if (!current) return invalid('User not found', 404);
  const ids = [...new Set([...(payload.enrolledPaths ?? []), ...(payload.pathStageSelections ?? []).map((row) => row.pathId)])];
  const [paths, levels] = await Promise.all([
    PathModel.find({ _id: { $in: ids } }).select('_id isActive showInHome showInNavbar settings').lean(),
    LevelModel.find({ pathId: { $in: ids } }).select('_id pathId').lean(),
  ]);
  const update = resolveStudentPathPreferences(current, payload, paths as Path[], levels);
  // Optimistic guard prevents silent loss from concurrent partial preference saves.
  const filter = { _id: userId, $expr: { $and: [
    { $eq: [{ $ifNull: ['$enrolledPaths', []] }, { $literal: current.enrolledPaths ?? [] }] },
    { $eq: [{ $ifNull: ['$pathStageSelections', []] }, { $literal: current.pathStageSelections ?? [] }] },
  ] } };
  return { filter, update };
}
