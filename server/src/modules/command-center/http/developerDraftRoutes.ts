import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { getCommandPrincipal, requireCommandScope } from "../application/commandAuthorization.js";
import { createDeveloperTaskDraft, getApprovedDeveloperTaskHandoff, validateDeveloperTaskDraft } from "../application/developerTaskTools.js";

export const developerDraftRouter = Router();

developerDraftRouter.get(
  "/tasks/:id/handoff",
  requireCommandScope("developer:read"),
  asyncHandler(async (req, res) =>
    res.json(await getApprovedDeveloperTaskHandoff(req.params.id, getCommandPrincipal(res)!)),
  ),
);

developerDraftRouter.post(
  "/tasks/validate",
  requireCommandScope("developer:write"),
  asyncHandler(async (req, res) => res.json(validateDeveloperTaskDraft(req.body))),
);

developerDraftRouter.post(
  "/tasks/draft",
  requireCommandScope("developer:write"),
  asyncHandler(async (req, res) => {
    const result = await createDeveloperTaskDraft(req.body, getCommandPrincipal(res)!);
    return res
      .status(result.idempotentReplay ? StatusCodes.OK : StatusCodes.CREATED)
      .json(result);
  }),
);
