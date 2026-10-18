import { createHash } from 'node:crypto';
import type { TeachingImageIdentity } from '../contracts/teachingImageStoryboard.js';
import {approvedTeachingRegions,teachingRegionSourceKey} from '../contracts/verifiedTeachingRegions.js';

/** Exposes an opaque image identity, never the source metadata or answer. */
export function teachingImageIdentity(question: Record<string, any> | null | undefined): TeachingImageIdentity | null {
  const source=teachingRegionSourceKey(question);if(!source||!question)return null;
  const regions=approvedTeachingRegions(question);
  const seed=regions?JSON.stringify([source,'verified-regions-v1',regions.items]):source;
  return { url: question.imageUrl, version: createHash('sha256').update(seed).digest('hex') };
}
