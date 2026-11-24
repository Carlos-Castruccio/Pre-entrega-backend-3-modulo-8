import { Order } from '../models/order.model.js';
import { Delivery } from '../models/delivery.model.js';
import { User } from '../models/user.model.js';
import { ORDER_STATUS, ORDER_PRIORITY, DELIVERY_STATUS, USER_ROLES } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';
import { validateBody, validateId, validateText } from './validation.js';
const types = { orders: { model: Order, states: ORDER_STATUS, missing: 'ORDER_NOT_FOUND' }, deliveries: { model: Delivery, states: DELIVERY_STATUS, missing: 'DELIVERY_NOT_FOUND' } };
export function getAll(type, { skip, limit }) {
  const query = types[type].model.find().sort({ _id: 1 }).skip(skip).limit(limit);
  if (type === 'deliveries') query.select('-receipts');
  return query.lean();
}
export async function getById(type, id) {
  validateId(id);
  const result = await types[type].model.findById(id).lean();
  if (!result) throw new AppError(types[type].missing);
  return result;
}
async function reference(model, id, code) {
  validateId(id);
  const result = await model.findById(id).select('_id role').lean();
  if (!result) throw new AppError(code);
  return result;
}
export async function create(type, body) {
  if (type === 'orders') {
    validateBody(body, ['user', 'address', 'description', 'priority', 'items']);
    const address = validateText(body.address, 'address');
    const description = validateText(body.description, 'description');
    await reference(User, body.user, 'USER_NOT_FOUND');
    if (body.priority !== undefined && !Object.values(ORDER_PRIORITY).includes(body.priority)) throw new AppError('INVALID_INPUT');
    if (body.items !== undefined) {
      if (!Array.isArray(body.items)) throw new AppError('INVALID_INPUT');
      for (const item of body.items) {
        validateBody(item, ['name', 'quantity']);
        validateText(item.name, 'name');
        if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new AppError('INVALID_INPUT');
      }
    }
    return Order.create({ ...body, address, description });
  }
  validateBody(body, ['order', 'driver']);
  await reference(Order, body.order, 'ORDER_NOT_FOUND');
  if (body.driver !== undefined && body.driver !== null) {
    const driver = await reference(User, body.driver, 'USER_NOT_FOUND');
    if (driver.role !== USER_ROLES.DELIVERY_DRIVER) throw new AppError('INVALID_INPUT', { message: 'driver debe tener rol DELIVERY_DRIVER' });
  }
  return Delivery.create({ order: body.order, driver: body.driver ?? null });
}
export async function updateStatus(type, id, body) {
  validateId(id);
  validateBody(body, ['status']);
  if (!Object.values(types[type].states).includes(body.status)) throw new AppError(type === 'orders' ? 'INVALID_ORDER_STATUS' : 'INVALID_DELIVERY_STATUS');
  const result = await types[type].model.findByIdAndUpdate(id, { $set: { status: body.status } }, { returnDocument: 'after', runValidators: true }).lean();
  if (!result) throw new AppError(types[type].missing);
  return result;
}
