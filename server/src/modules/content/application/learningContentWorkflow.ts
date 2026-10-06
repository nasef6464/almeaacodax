import { buildDocumentQuery } from "../infrastructure/contentDocumentQuery.js";

export type LearningContentActor = {
  id: string;
  role: string;
  schoolId?: string | null;
  managedPathIds?: string[];
  managedSubjectIds?: string[];
};

export const buildOwnedDocumentQuery = (
  value: string,
  authUser: LearningContentActor,
) => {
  const baseQuery = buildDocumentQuery(value);

  if (authUser.role === "admin") {
    return baseQuery;
  }

  const ownershipConditions: Array<Record<string, string>> = [
    { ownerId: authUser.id },
    { createdBy: authUser.id },
    { assignedTeacherId: authUser.id },
  ];

  if (authUser.schoolId) {
    ownershipConditions.push({ ownerId: authUser.schoolId }, { createdBy: authUser.schoolId });
  }

  return { $and: [baseQuery, { $or: ownershipConditions }] };
};

export const getWorkflowDefaults = (authUser?: LearningContentActor) => {
  if (!authUser) return {};

  if (authUser.role === "admin") {
    return {
      ownerType: "platform",
      ownerId: authUser.id,
      createdBy: authUser.id,
      approvalStatus: "approved",
      approvedBy: authUser.id,
      approvedAt: Date.now(),
    };
  }

  if (authUser.role === "teacher") {
    return {
      ownerType: "teacher",
      ownerId: authUser.id,
      createdBy: authUser.id,
      assignedTeacherId: authUser.id,
      approvalStatus: "pending_review",
      approvedBy: "",
      approvedAt: null,
    };
  }

  return {
    ownerType: "school",
    ownerId: authUser.schoolId || authUser.id,
    createdBy: authUser.id,
    approvalStatus: "pending_review",
    approvedBy: "",
    approvedAt: null,
  };
};

export const sanitizeWorkflowUpdate = (
  payload: Record<string, unknown>,
  authUser: LearningContentActor,
) => {
  const nextPayload = { ...payload };

  if (authUser.role !== "admin") {
    delete nextPayload.ownerType;
    delete nextPayload.ownerId;
    delete nextPayload.createdBy;
    delete nextPayload.approvedBy;
    delete nextPayload.approvedAt;
    delete nextPayload.reviewerNotes;
    delete nextPayload.revenueSharePercentage;
    if (typeof nextPayload.approvalStatus === "string" && nextPayload.approvalStatus === "approved") {
      nextPayload.approvalStatus = "pending_review";
    }
  } else if (typeof nextPayload.approvalStatus === "string") {
    if (nextPayload.approvalStatus === "approved") {
      nextPayload.approvedBy = authUser.id;
      nextPayload.approvedAt = Date.now();
    } else if (nextPayload.approvalStatus === "rejected" || nextPayload.approvalStatus === "pending_review") {
      nextPayload.approvedBy = "";
      nextPayload.approvedAt = null;
    }
  }

  return nextPayload;
};

export const hasTopicManagementScope = (
  authUser: LearningContentActor,
  topic: { pathId?: unknown; subjectId?: unknown },
) => {
  if (authUser.role === "admin") return true;

  const topicPathId = String(topic.pathId || "");
  const topicSubjectId = String(topic.subjectId || "");
  const managedPathIds = Array.isArray(authUser.managedPathIds) ? authUser.managedPathIds.map(String) : [];
  const managedSubjectIds = Array.isArray(authUser.managedSubjectIds) ? authUser.managedSubjectIds.map(String) : [];

  return managedPathIds.includes(topicPathId) || managedSubjectIds.includes(topicSubjectId);
};
