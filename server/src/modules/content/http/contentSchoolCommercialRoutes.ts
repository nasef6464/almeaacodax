import { Router } from "express";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { requireAuth, requireRole } from "../../../middleware/auth.js";
import { AccessCodeModel } from "../../../models/AccessCode.js";
import { AccessGrantModel } from "../../../models/AccessGrant.js";
import { B2BPackageModel } from "../../../models/B2BPackage.js";
import { UserModel } from "../../../models/User.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { resolvePagination } from "../../../utils/pagination.js";
import {
  accessCodeRedemptionsListQuerySchema,
  accessCodeSchema,
  accessCodesListQuerySchema,
  b2bPackageSchema,
} from "./schoolOperationsSchemas.js";
import {
  buildDocumentQuery,
  buildDocumentsByIdsQuery,
} from "../infrastructure/contentDocumentQuery.js";
import {
  hasSchoolIdManagementScope,
  resolveSupervisorManagementScope,
} from "../application/schoolOperationsScope.js";
import {
  buildPaginationMeta,
  escapeRegExp,
  parseDateToTimestamp,
} from "./contentQueryUtilities.js";

const normalizeAccessCodeResponse = (code: any) => ({
  id: String(code.id || code._id || ""),
  code: String(code.code || ""),
  schoolId: String(code.schoolId || ""),
  packageId: String(code.packageId || ""),
  maxUses: Number(code.maxUses || 0),
  currentUses: Number(code.currentUses || 0),
  expiresAt: Number(code.expiresAt || 0),
  createdAt: Number(code.createdAt || 0),
});

export const contentSchoolCommercialRouter = Router();

contentSchoolCommercialRouter.post(
  "/b2b-packages",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = b2bPackageSchema.parse(req.body);
    if (req.authUser?.role === "supervisor") {
      const canManageSchool = await hasSchoolIdManagementScope(req.authUser, String(payload.schoolId || ""));
      if (!canManageSchool) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
      }
    }
    const created = await B2BPackageModel.create(payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentSchoolCommercialRouter.patch(
  "/b2b-packages/:id",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = b2bPackageSchema.partial().parse(req.body);
    const existing = await B2BPackageModel.findOne(buildDocumentQuery(req.params.id));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Package not found" });
    }

    if (req.authUser?.role === "supervisor") {
      const canManageSchool = await hasSchoolIdManagementScope(req.authUser, String(existing.schoolId || ""));
      if (!canManageSchool) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
      }
    }

    const updated = await B2BPackageModel.findOneAndUpdate(buildDocumentQuery(String(existing._id)), payload, {
      new: true,
    });

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Package not found" });
    }

    return res.json(updated);
  }),
);

contentSchoolCommercialRouter.delete(
  "/b2b-packages/:id",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const existing = await B2BPackageModel.findOne(buildDocumentQuery(req.params.id));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Package not found" });
    }

    if (req.authUser?.role === "supervisor") {
      const canManageSchool = await hasSchoolIdManagementScope(req.authUser, String(existing.schoolId || ""));
      if (!canManageSchool) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
      }
    }

    const deleted = await B2BPackageModel.findOneAndDelete(buildDocumentQuery(String(existing._id)));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Package not found" });
    }

    await AccessCodeModel.deleteMany({ packageId: deleted.id || String(deleted._id) });
    return res.json({ success: true });
  }),
);

contentSchoolCommercialRouter.post(
  "/access-codes",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = accessCodeSchema.parse(req.body);
    if (req.authUser?.role === "supervisor") {
      const canManageSchool = await hasSchoolIdManagementScope(req.authUser, String(payload.schoolId || ""));
      if (!canManageSchool) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
      }
    }
    const created = await AccessCodeModel.create(payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentSchoolCommercialRouter.patch(
  "/access-codes/:id",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = accessCodeSchema.partial().parse(req.body);
    const existing = await AccessCodeModel.findOne(buildDocumentQuery(req.params.id));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Access code not found" });
    }

    if (req.authUser?.role === "supervisor") {
      const canManageSchool = await hasSchoolIdManagementScope(req.authUser, String(existing.schoolId || ""));
      if (!canManageSchool) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
      }
    }

    const updated = await AccessCodeModel.findOneAndUpdate(buildDocumentQuery(String(existing._id)), payload, {
      new: true,
    });

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Access code not found" });
    }

    return res.json(updated);
  }),
);

contentSchoolCommercialRouter.delete(
  "/access-codes/:id",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const existing = await AccessCodeModel.findOne(buildDocumentQuery(req.params.id));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Access code not found" });
    }

    if (req.authUser?.role === "supervisor") {
      const canManageSchool = await hasSchoolIdManagementScope(req.authUser, String(existing.schoolId || ""));
      if (!canManageSchool) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "You cannot manage this school" });
      }
    }

    const deleted = await AccessCodeModel.findOneAndDelete(buildDocumentQuery(String(existing._id)));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Access code not found" });
    }

    return res.json({ success: true });
  }),
);

contentSchoolCommercialRouter.get(
  "/access-codes",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const query = accessCodesListQuerySchema.parse(req.query);
    const safePage = Math.max(1, Number(query.page || 1));
    const safeLimit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const pagination = resolvePagination({ page: safePage, limit: safeLimit }, { page: safePage, limit: safeLimit });
    const authUser = req.authUser!;
    const filter: Record<string, unknown> = {};
    let scopedSchoolIds: string[] | null = null;

    if (authUser.role === "supervisor") {
      scopedSchoolIds = (await resolveSupervisorManagementScope({ id: authUser.id })).schoolIds;
      if (query.schoolId && !scopedSchoolIds.includes(query.schoolId)) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "School scope denied" });
      }
      filter.schoolId = query.schoolId ? query.schoolId : { $in: scopedSchoolIds };
    } else if (query.schoolId) {
      filter.schoolId = query.schoolId;
    }

    if (query.packageId) {
      filter.packageId = query.packageId;
    }

    if (query.search) {
      filter.code = { $regex: escapeRegExp(query.search), $options: "i" };
    }

    const createdAtFilter: Record<string, number> = {};
    const dateFrom = parseDateToTimestamp(query.dateFrom);
    const dateTo = parseDateToTimestamp(query.dateTo);
    if (dateFrom !== null) {
      createdAtFilter.$gte = dateFrom;
    }
    if (dateTo !== null) {
      createdAtFilter.$lte = dateTo;
    }
    if (Object.keys(createdAtFilter).length > 0) {
      filter.createdAt = createdAtFilter;
    }

    const now = Date.now();
    if (query.status === "active") {
      filter.$expr = {
        $and: [
          { $gt: ["$expiresAt", now] },
          { $lt: ["$currentUses", "$maxUses"] },
        ],
      };
    } else if (query.status === "expired") {
      filter.expiresAt = { $lte: now };
    } else if (query.status === "exhausted") {
      filter.$expr = { $gte: ["$currentUses", "$maxUses"] };
    }

    const direction = query.sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [query.sortBy]: direction };
    if (query.sortBy !== "createdAt") {
      sort.createdAt = -1;
    }

    const [codes, total] = await Promise.all([
      AccessCodeModel.find(filter).sort(sort).skip(pagination.skip).limit(pagination.limit).lean(),
      AccessCodeModel.countDocuments(filter),
    ]);

    return res.json({
      data: codes.map(normalizeAccessCodeResponse),
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    });
  }),
);

contentSchoolCommercialRouter.get(
  "/access-code-redemptions",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const query = accessCodeRedemptionsListQuerySchema.parse(req.query);
    const safePage = Math.max(1, Number(query.page || 1));
    const safeLimit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const pagination = resolvePagination({ page: safePage, limit: safeLimit }, { page: safePage, limit: safeLimit });
    const authUser = req.authUser!;
    const grantFilter: Record<string, unknown> = { sourceType: "access_code" };
    const accessCodeFilter: Record<string, unknown> = {};
    let shouldResolveScopedCodes = false;
    let scopedSchoolIds: string[] | null = null;

    if (authUser.role === "supervisor") {
      scopedSchoolIds = (await resolveSupervisorManagementScope({ id: authUser.id })).schoolIds;
      if (query.schoolId && !scopedSchoolIds.includes(query.schoolId)) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "School scope denied" });
      }
      accessCodeFilter.schoolId = query.schoolId ? query.schoolId : { $in: scopedSchoolIds };
      shouldResolveScopedCodes = true;
    } else if (query.schoolId) {
      accessCodeFilter.schoolId = query.schoolId;
      shouldResolveScopedCodes = true;
    }

    if (query.accessCodeId) {
      accessCodeFilter.$or = [
        { id: query.accessCodeId },
        { _id: mongoose.Types.ObjectId.isValid(query.accessCodeId) ? new mongoose.Types.ObjectId(query.accessCodeId) : null },
      ].filter((entry) => entry._id !== null) as Array<Record<string, unknown>>;
      if (!accessCodeFilter.$or || (accessCodeFilter.$or as unknown[]).length === 0) {
        accessCodeFilter.$or = [{ id: query.accessCodeId }];
      }
      shouldResolveScopedCodes = true;
    }

    if (query.userId) {
      grantFilter.userId = query.userId;
    }
    if (query.status) {
      grantFilter.status = query.status;
    }

    const grantedAtFilter: Record<string, number> = {};
    const dateFrom = parseDateToTimestamp(query.dateFrom);
    const dateTo = parseDateToTimestamp(query.dateTo);
    if (dateFrom !== null) {
      grantedAtFilter.$gte = dateFrom;
    }
    if (dateTo !== null) {
      grantedAtFilter.$lte = dateTo;
    }
    if (Object.keys(grantedAtFilter).length > 0) {
      grantFilter.grantedAt = grantedAtFilter;
    }

    if (shouldResolveScopedCodes) {
      const scopedCodes = await AccessCodeModel.find(accessCodeFilter).select("id _id schoolId packageId code").lean();
      const scopedAccessCodeIds = scopedCodes.map((code) => String(code._id));
      if (scopedAccessCodeIds.length === 0) {
        return res.json({
          data: [],
          pagination: buildPaginationMeta(0, pagination.page, pagination.limit),
        });
      }
      grantFilter["metadata.accessCodeId"] = { $in: scopedAccessCodeIds };
    }

    const direction = query.sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [query.sortBy]: direction };
    if (query.sortBy !== "grantedAt") {
      sort.grantedAt = -1;
    }

    const [grants, total] = await Promise.all([
      AccessGrantModel.find(grantFilter).sort(sort).skip(pagination.skip).limit(pagination.limit).lean(),
      AccessGrantModel.countDocuments(grantFilter),
    ]);

    const accessCodeIds = Array.from(
      new Set(
        grants
          .map((grant) => String((grant as any)?.metadata?.accessCodeId || ""))
          .filter(Boolean),
      ),
    );
    const userIds = Array.from(new Set(grants.map((grant) => String((grant as any)?.userId || "")).filter(Boolean)));

    const [codes, users] = await Promise.all([
      accessCodeIds.length
        ? AccessCodeModel.find({ _id: { $in: accessCodeIds } }).select("id _id code schoolId packageId").lean()
        : Promise.resolve([]),
      userIds.length ? UserModel.find(buildDocumentsByIdsQuery(userIds)).select("id _id name email").lean() : Promise.resolve([]),
    ]);

    const codeById = new Map(codes.map((code) => [String(code._id), code]));
    const userById = new Map(users.map((user) => [String((user as any).id || user._id), user]));

    return res.json({
      data: grants.map((grant: any) => {
        const accessCodeId = String(grant?.metadata?.accessCodeId || "");
        const code = codeById.get(accessCodeId);
        const userItem = userById.get(String(grant.userId || ""));
        return {
          id: String(grant.id || grant._id || ""),
          userId: String(grant.userId || ""),
          userName: String(userItem?.name || ""),
          userEmail: String(userItem?.email || ""),
          accessCodeId,
          accessCode: String(code?.code || grant?.metadata?.accessCode || ""),
          schoolId: String(code?.schoolId || ""),
          packageId: String(code?.packageId || grant.packageId || ""),
          status: String(grant.status || ""),
          grantedBy: String(grant.grantedBy || ""),
          grantedAt: Number(grant.grantedAt || 0),
          expiresAt: typeof grant.expiresAt === "number" ? grant.expiresAt : null,
        };
      }),
      pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
    });
  }),
);
