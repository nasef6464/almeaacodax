import mongoose, { Schema } from 'mongoose';
const schema = new Schema({ resourceKey: { type: String, required: true }, sessionId: { type: String, required: true }, startAt: { type: Date, required: true }, endAt: { type: Date, required: true } });
schema.index({ resourceKey: 1, sessionId: 1 }, { unique: true });
schema.index({ resourceKey: 1, startAt: 1, endAt: 1 });
const revisionSchema = new Schema({ _id: { type: String, required: true }, revision: { type: Number, default: 0 } });
export const LiveReservationModel = mongoose.model('LiveReservation', schema);
export const LiveResourceRevisionModel = mongoose.model('LiveResourceRevision', revisionSchema);
