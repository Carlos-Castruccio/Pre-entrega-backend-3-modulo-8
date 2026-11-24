import { User } from '../models/user.model.js';
import { Delivery } from '../models/delivery.model.js';
const models = { users: User, deliveries: Delivery };

export function findEntity(type, id) {
  return models[type].exists({ _id: id });
}
export function appendMetadata(type, id, metadata) {
  const field = type === 'users' ? 'documents' : 'receipts';
  return models[type].findByIdAndUpdate(id, { $push: { [field]: metadata } }, {
    returnDocument: 'after', runValidators: true
  }).lean();
}
