import mongoose, { Schema, Document } from 'mongoose';
import { DIDCommMessage } from '../types';

export interface IMessageQueue extends Document {
  recipientDid: string;
  message: DIDCommMessage;
  attempts: number;
  status: 'pending' | 'delivered' | 'failed';
  nextRetry?: Date;
}

const MessageQueueSchema: Schema = new Schema({
  recipientDid: { type: String, required: true, index: true },
  message: { type: Schema.Types.Mixed, required: true },
  attempts: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending' },
  nextRetry: { type: Date }
}, {
  timestamps: true
});

// Index for efficient querying
MessageQueueSchema.index({ recipientDid: 1, status: 1 });
MessageQueueSchema.index({ nextRetry: 1, status: 1 });

export default mongoose.model<IMessageQueue>('MessageQueue', MessageQueueSchema);