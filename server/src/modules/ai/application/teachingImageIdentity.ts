import { createHash } from 'node:crypto';
import type { TeachingImageIdentity } from '../contracts/teachingImageStoryboard.js';

/** Exposes an opaque image identity, never the source metadata or answer. */
export function teachingImageIdentity(question: Record<string, any> | null | undefined): TeachingImageIdentity | null {
  if (!question || typeof question.imageUrl !== 'string' || !question.imageUrl.startsWith('https://')) return null;
  const hash = String(question.sourceMeta?.imageHash || '');
  const version = question.sourceMeta?.imageVersion;
  const reliable = /^[a-f0-9]{32,128}$/i.test(hash) ? hash :
    (typeof version === 'number' && Number.isFinite(version) && version > 0 ? String(version) : '');
  if (!reliable) return null;
  return { url: question.imageUrl, version: createHash('sha256').update(JSON.stringify([question.imageUrl,reliable])).digest('hex') };
}
