import { Router } from "express";
import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UserModel } from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { signAccessToken } from "../utils/jwt.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const adminCreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["student", "teacher", "admin", "supervisor", "parent"]),
});

export const authRouter = Router();

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const payload = registerSchema.parse(req.body);
    const exists = await UserModel.findOne({ email: payload.email.toLowerCase() });

    if (exists) {
      return res.status(StatusCodes.CONFLICT).json({
        message: "Email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await UserModel.create({
      name: payload.name,
      email: payload.email.toLowerCase(),
      passwordHash,
      role: "student",
    });

    const token = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.status(StatusCodes.CREATED).json({
      token,
      user,
    });
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    const user = await UserModel.findOne({ email: payload.email.toLowerCase() });

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Invalid email or password",
      });
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Invalid email or password",
      });
    }

    const token = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.json({
      token,
      user,
    });
  }),
);

authRouter.post(
  "/admin/users",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = adminCreateUserSchema.parse(req.body);
    const email = payload.email.toLowerCase();
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await UserModel.findOneAndUpdate(
      { email },
      {
        name: payload.name,
        email,
        passwordHash,
        role: payload.role,
        isActive: true,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.status(StatusCodes.CREATED).json({
      user,
    });
  }),
);
