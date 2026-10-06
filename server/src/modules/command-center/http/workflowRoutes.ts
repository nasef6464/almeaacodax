import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  getCommandPrincipal,
  requireCommandScope,
} from "../application/commandAuthorization.js";
import {
  executeCommandWorkflow,
  getCommandWorkflow,
  listCommandWorkflows,
  planCommandWorkflow,
} from "../application/workflowService.js";

export const workflowRouter = Router();

workflowRouter.post(
  "/plan",
  requireCommandScope("workflows:plan"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const result = await planCommandWorkflow(req.body, principal);
    return res
      .status(result.idempotentReplay ? StatusCodes.OK : StatusCodes.CREATED)
      .json(result);
  }),
);

workflowRouter.get(
  "/",
  requireCommandScope("workflows:read"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const limit = z.coerce.number().int().min(1).max(100).default(30).parse(req.query.limit);
    const status = z
      .enum(["planned", "running", "completed", "failed"])
      .optional()
      .parse(req.query.status);
    const workflows = await listCommandWorkflows(principal, { limit, status });
    return res.json({ workflows });
  }),
);

workflowRouter.get(
  "/:id",
  requireCommandScope("workflows:read"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const workflow = await getCommandWorkflow(req.params.id, principal);
    return res.json({ workflow });
  }),
);

workflowRouter.post(
  "/:id/execute",
  requireCommandScope("workflows:execute"),
  asyncHandler(async (req, res) => {
    const principal = getCommandPrincipal(res)!;
    const result = await executeCommandWorkflow(req.params.id, principal);
    return res.json(result);
  }),
);
