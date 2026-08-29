type QuizWorkflowUser = {
  id: string;
  role: string;
  schoolId?: string | null;
};

export const getWorkflowDefaults = (authUser?: QuizWorkflowUser) => {
  if (!authUser) return {};

  if (authUser.role === "admin") {
    return {
      ownerType: "platform",
      ownerId: authUser.id,
      createdBy: authUser.id,
      approvalStatus: "approved",
      approvedBy: authUser.id,
      approvedAt: Date.now(),
      isPublished: true,
    };
  }

  if (authUser.role === "supervisor") {
    return {
      ownerType: "school",
      ownerId: authUser.schoolId || authUser.id,
      createdBy: authUser.id,
      approvalStatus: "approved",
      approvedBy: authUser.id,
      approvedAt: Date.now(),
      isPublished: true,
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
  authUser: QuizWorkflowUser,
  options?: { respectPublished?: boolean },
) => {
  const nextPayload = { ...payload };

  if (authUser.role !== "admin" && authUser.role !== "supervisor") {
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
    if (options?.respectPublished && nextPayload.isPublished === true) {
      nextPayload.isPublished = false;
    }
  } else if (typeof nextPayload.approvalStatus === "string") {
    if (nextPayload.approvalStatus === "approved") {
      nextPayload.approvedBy = authUser.id;
      nextPayload.approvedAt = Date.now();
    } else if (nextPayload.approvalStatus === "rejected" || nextPayload.approvalStatus === "pending_review") {
      nextPayload.approvedBy = "";
      nextPayload.approvedAt = null;
      if (options?.respectPublished) {
        nextPayload.isPublished = false;
      }
    }
  }

  return nextPayload;
};
