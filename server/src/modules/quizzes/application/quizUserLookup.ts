import mongoose from "mongoose";
import { UserModel } from "../../../models/User.js";

export const resolveAuthUserByAuthId = async (authId: string) =>
  mongoose.isValidObjectId(authId)
    ? UserModel.findById(authId)
    : UserModel.findOne({ id: authId });
