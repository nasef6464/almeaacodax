import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { requireAuth, requireRole } from "../../../middleware/auth.js";
import { AccessCodeModel } from "../../../models/AccessCode.js";
import { B2BPackageModel } from "../../../models/B2BPackage.js";
import { GroupModel } from "../../../models/Group.js";
import { UserModel } from "../../../models/User.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { groupSchema } from "./schoolOperationsSchemas.js";
import { buildDocumentQuery } from "../infrastructure/contentDocumentQuery.js";
import { hasGroupManagementScope } from "../application/schoolOperationsScope.js";

const uniqueStrings = (values: Array<string | undefined | null>) =>
  [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))];

export const contentGroupRouter = Router();

type GroupCreatePayload = z.infer<typeof groupSchema>;

type ScopedGroupCreateResult =
  | { ok: true; payload: GroupCreatePayload }
  | { ok: false; statusCode: number; message: string };

const buildScopedGroupCreatePayload = async (
  authUser: { id: string; role: string },
  payload: GroupCreatePayload,
): Promise<ScopedGroupCreateResult> => {
  if (authUser.role === "admin") {
    return { ok: true, payload };
  }

  if (payload.type === "SCHOOL") {
    return {
      ok: false,
      statusCode: StatusCodes.FORBIDDEN,
      message: "Only admins can create schools",
    };
  }

  const parentId = String(payload.parentId || "");
  if (!parentId) {
    return {
      ok: false,
      statusCode: StatusCodes.BAD_REQUEST,
      message: "Group parent is required",
    };
  }

  const parentGroup = await GroupModel.findOne(buildDocumentQuery(parentId));
  if (!parentGroup) {
    return {
      ok: false,
      statusCode: StatusCodes.NOT_FOUND,
      message: "Parent group not found",
    };
  }

  if (payload.type === "CLASS" && parentGroup.type !== "SCHOOL") {
    return {
      ok: false,
      statusCode: StatusCodes.BAD_REQUEST,
      message: "Classes must belong to a school",
    };
  }

  if (payload.type === "PRIVATE_GROUP" && parentGroup.type !== "SCHOOL" && parentGroup.type !== "CLASS") {
    return {
      ok: false,
      statusCode: StatusCodes.BAD_REQUEST,
      message: "Private groups must belong to a school or class",
    };
  }

  const canManageParentGroup = await hasGroupManagementScope(authUser, parentGroup as any);
  if (!canManageParentGroup) {
    return {
      ok: false,
      statusCode: StatusCodes.FORBIDDEN,
      message: "You cannot create a group under this school",
    };
  }

  return {
    ok: true,
    payload: {
      name: payload.name,
      type: payload.type,
      parentId,
      ownerId: String(authUser.id),
      supervisorIds: uniqueStrings([String(authUser.id)]),
      studentIds: [],
      courseIds: [],
      metadata: payload.metadata || {},
    },
  };
};

contentGroupRouter.post(
  "/groups",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = groupSchema.parse(req.body);
    const createScope = await buildScopedGroupCreatePayload(req.authUser!, payload);
    if (createScope.ok === false) {
      return res.status(createScope.statusCode).json({ message: createScope.message });
    }

    const created = await GroupModel.create(createScope.payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentGroupRouter.patch(
  "/groups/:id",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = groupSchema.partial().parse(req.body);
    const existing = await GroupModel.findOne(buildDocumentQuery(req.params.id));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Group not found" });
    }

    const canManageGroup = await hasGroupManagementScope(req.authUser!, existing as any);
    if (!canManageGroup) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this group" });
    }

    const updated = await GroupModel.findOneAndUpdate(buildDocumentQuery(String(existing._id)), payload, {
      new: true,
    });

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Group not found" });
    }

    return res.json(updated);
  }),
);

contentGroupRouter.delete(
  "/groups/:id",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const existing = await GroupModel.findOne(buildDocumentQuery(req.params.id));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Group not found" });
    }

    const canManageGroup = await hasGroupManagementScope(req.authUser!, existing as any);
    if (!canManageGroup) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this group" });
    }

    const groupId = existing.id || String(existing._id);
    const childClasses = existing.type === "SCHOOL"
      ? await GroupModel.find({ type: "CLASS", parentId: groupId }).select("id _id")
      : [];
    const deletedGroupIds = [
      groupId,
      String(existing._id),
      ...childClasses.flatMap((group: any) => [group.id, String(group._id)]),
    ].map((value) => String(value || "")).filter(Boolean);

    const deleted = await GroupModel.findOneAndDelete(buildDocumentQuery(String(existing._id)));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Group not found" });
    }

    if (existing.type === "SCHOOL") {
      await Promise.all([
        GroupModel.deleteMany({ type: "CLASS", parentId: groupId }),
        UserModel.updateMany(
          { $or: [{ schoolId: { $in: deletedGroupIds } }, { groupIds: { $in: deletedGroupIds } }] },
          { $unset: { schoolId: "" }, $pull: { groupIds: { $in: deletedGroupIds } } },
        ),
        B2BPackageModel.deleteMany({ schoolId: { $in: deletedGroupIds } }),
        AccessCodeModel.deleteMany({ schoolId: { $in: deletedGroupIds } }),
      ]);
    } else {
      await Promise.all([
        UserModel.updateMany({ groupIds: { $in: deletedGroupIds } }, { $pull: { groupIds: { $in: deletedGroupIds } } }),
        GroupModel.updateMany({}, {
          $pull: {
            studentIds: { $in: deletedGroupIds },
            supervisorIds: { $in: deletedGroupIds },
          },
        }),
      ]);
    }

    return res.json({ success: true });
  }),
);
