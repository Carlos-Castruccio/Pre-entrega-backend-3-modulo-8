import mongoose from 'mongoose';
import { fileMetadataSchema } from './fileMetadata.schema.js';
import { DELIVERY_STATUS } from '../constants/index.js';

const deliverySchema = new mongoose.Schema({
  receipts: { type: [fileMetadataSchema], default: [] },
  order: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', required: 
    true, 
    unique: true
   },
  
   driver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null
   },
  
   status: { 
    type: String, 
    enum: Object.values(DELIVERY_STATUS), 
    default: DELIVERY_STATUS.PENDING }
}, { 
  timestamps: true, versionKey: false 
});

export const Delivery = mongoose.model('Delivery', deliverySchema);
