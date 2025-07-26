import mongoose, { Schema, Document } from 'mongoose';

export interface IEdgeConnection extends Document {
  did: string;
  endpoint: string;
  lastSeen: Date;
  status: 'online' | 'offline';
  metadata?: any;
}

const EdgeConnectionSchema: Schema = new Schema({
  did: { type: String, required: true, unique: true },
  endpoint: { type: String, required: true },
  lastSeen: { type: Date, default: Date.now },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

export default mongoose.model<IEdgeConnection>('EdgeConnection', EdgeConnectionSchema);