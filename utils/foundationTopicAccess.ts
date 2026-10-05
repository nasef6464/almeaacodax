export type FoundationTopicAccessReason =
  | 'staff'
  | 'hidden'
  | 'subject_hard_lock'
  | 'free_topic'
  | 'paid_topic_with_package'
  | 'paid_topic_without_package'
  | 'missing_topic';

export interface FoundationTopicAccessContext {
  isStaffViewer: boolean;
  hasFoundationPackageAccess: boolean;
  /** This explicit subject-wide commercial policy is the only override for a topic marked free. */
  lockFoundationForSubject: boolean;
}

export interface FoundationTopicAccess {
  isVisible: boolean;
  isFree: boolean;
  requiresPackage: boolean;
  hasAccess: boolean;
  reason: FoundationTopicAccessReason;
  entitlementSource: 'staff' | 'free_topic' | 'package' | 'none';
}

type FoundationTopicLike = {
  isLocked?: boolean;
  showOnPlatform?: boolean;
} | null | undefined;

/**
 * Resolves one foundation topic only. A parent is presentation structure, not
 * an entitlement source: a child explicitly saved as free remains free even
 * when its parent is paid. The subject-wide hard-lock switch is the explicit
 * exception because it intentionally locks the whole foundation area.
 */
export const resolveFoundationTopicAccess = (
  topic: FoundationTopicLike,
  context: FoundationTopicAccessContext,
): FoundationTopicAccess => {
  if (!topic) {
    return { isVisible: false, isFree: false, requiresPackage: false, hasAccess: false, reason: 'missing_topic', entitlementSource: 'none' };
  }

  if (context.isStaffViewer) {
    return { isVisible: true, isFree: true, requiresPackage: false, hasAccess: true, reason: 'staff', entitlementSource: 'staff' };
  }

  if (topic.showOnPlatform === false) {
    return { isVisible: false, isFree: false, requiresPackage: false, hasAccess: false, reason: 'hidden', entitlementSource: 'none' };
  }

  if (context.lockFoundationForSubject) {
    return {
      isVisible: true,
      isFree: false,
      requiresPackage: true,
      hasAccess: context.hasFoundationPackageAccess,
      reason: 'subject_hard_lock',
      entitlementSource: context.hasFoundationPackageAccess ? 'package' : 'none',
    };
  }

  if (topic.isLocked !== true) {
    return { isVisible: true, isFree: true, requiresPackage: false, hasAccess: true, reason: 'free_topic', entitlementSource: 'free_topic' };
  }

  return {
    isVisible: true,
    isFree: false,
    requiresPackage: true,
    hasAccess: context.hasFoundationPackageAccess,
    reason: context.hasFoundationPackageAccess ? 'paid_topic_with_package' : 'paid_topic_without_package',
    entitlementSource: context.hasFoundationPackageAccess ? 'package' : 'none',
  };
};
