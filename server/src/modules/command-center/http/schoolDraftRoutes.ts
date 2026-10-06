import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { CommandCenterDraftModel } from "../../../models/CommandCenterDraft.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { getCommandPrincipal, requireCommandScope } from "../application/commandAuthorization.js";
import { recordCommandAudit } from "../application/commandAudit.js";
import {
  schoolSetupDraftSchema,
  validateSchoolSetupDraft,
} from "../application/schoolSetupDraftTools.js";
import {
  schoolRosterImportDraftSchema,
  validateSchoolRosterImportDraft,
} from "../application/schoolRosterImportTools.js";

export const schoolDraftRouter = Router();

schoolDraftRouter.post(
  "/validate",
  requireCommandScope("drafts:write"),
  asyncHandler(async (req, res) => {
    const input = schoolSetupDraftSchema.parse(req.body);
    return res.json(await validateSchoolSetupDraft(input));
  }),
);

schoolDraftRouter.post(
  "/draft",
  requireCommandScope("drafts:write"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const input = schoolSetupDraftSchema.parse(req.body);
    const validation = await validateSchoolSetupDraft(input);

    if (!validation.ok) {
      await recordCommandAudit({
        principal,
        action: "school.setup.validate",
        toolId: "create_school_setup_draft",
        requestId: input.requestId,
        outcome: "rejected",
        metadata: { issues: validation.issues.length },
      });
      return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ validation });
    }

    if (input.idempotencyKey) {
      const existing = await CommandCenterDraftModel.findOne({
        idempotencyKey: input.idempotencyKey,
      }).lean();
      if (existing) {
        return res.json({ draft: existing, idempotentReplay: true, validation });
      }
    }

    const draft = await CommandCenterDraftModel.create({
      kind: "school_setup",
      title: input.schoolName,
      payload: {
        ...validation.normalizedPlan,
        strategy: "validated_plan_first",
        applyPolicy: "reuse_existing_accounts",
        accountCreationPolicy: "explicit_only",
      },
      source: principal.source,
      requiredScopes: ["schools:write"],
      createdBy: principal.id,
      createdByType: principal.type,
      requestId: input.requestId,
      idempotencyKey: input.idempotencyKey,
      status: "pending",
    });

    await recordCommandAudit({
      principal,
      action: "school.setup.draft.create",
      toolId: "create_school_setup_draft",
      draftId: String(draft._id),
      requestId: input.requestId,
      outcome: "success",
      metadata: validation.stats,
    });

    return res.status(StatusCodes.CREATED).json({ draft, validation });
  }),
);


schoolDraftRouter.post(
  "/roster/validate",
  requireCommandScope("drafts:write"),
  asyncHandler(async (req, res) => {
    const input = schoolRosterImportDraftSchema.parse(req.body);
    const validation = await validateSchoolRosterImportDraft(input);
    return res
      .status(validation.ok ? StatusCodes.OK : StatusCodes.UNPROCESSABLE_ENTITY)
      .json({ validation });
  }),
);

schoolDraftRouter.post(
  "/roster/draft",
  requireCommandScope("drafts:write"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const input = schoolRosterImportDraftSchema.parse(req.body);
    const validation = await validateSchoolRosterImportDraft(input);
    if (!validation.ok || !validation.school || !validation.normalizedRows) {
      await recordCommandAudit({
        principal,
        action: "school.roster.validate",
        toolId: "create_school_roster_import_draft",
        requestId: input.requestId,
        outcome: "rejected",
        metadata: { issues: validation.issues.length },
      });
      return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ validation });
    }

    if (input.idempotencyKey) {
      const existing = await CommandCenterDraftModel.findOne({
        idempotencyKey: input.idempotencyKey,
      }).lean();
      if (existing) {
        return res.json({ draft: existing, idempotentReplay: true, validation });
      }
    }

    const draft = await CommandCenterDraftModel.create({
      kind: "school_roster_import",
      title: `استيراد طلاب — ${validation.school.name}`,
      payload: {
        schoolId: validation.school.id,
        rows: validation.normalizedRows.map(({ password: _password, ...row }: any) => row),
        createMissingUsers: input.createMissingUsers,
        createMissingClasses: input.createMissingClasses,
        policy: {
          resetExistingPasswords: false,
          allowCrossSchoolTransfer: false,
          credentialsGeneratedAtApply: true,
        },
        validationStats: validation.stats,
      },
      source: principal.source,
      requiredScopes: ["schools:write"],
      createdBy: principal.id,
      createdByType: principal.type,
      requestId: input.requestId,
      idempotencyKey: input.idempotencyKey,
      status: "pending",
    });

    await recordCommandAudit({
      principal,
      action: "school.roster.draft.create",
      toolId: "create_school_roster_import_draft",
      draftId: String(draft._id),
      requestId: input.requestId,
      outcome: "success",
      metadata: validation.stats,
    });

    return res.status(StatusCodes.CREATED).json({ draft, validation });
  }),
);
