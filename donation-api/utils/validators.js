// ============================================
// FILE 12: utils/validators.js
// ============================================
import Joi from 'joi';

export const pledgeValidator = Joi.object({
  campaignId: Joi.string().required(),
  pledgedAmount: Joi.number().positive().required(),
  installmentPlan: Joi.string().valid('lump-sum', 'weekly', 'bi-weekly', 'monthly').default('lump-sum'),
  memberPhone: Joi.string().pattern(/^254[0-9]{9}$/).required(),
  memberEmail: Joi.string().email(),
  notes: Joi.string()
});

export const paymentValidator = Joi.object({
  pledgeId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  paymentMethod: Joi.string().valid('mpesa', 'manual', 'bank-transfer', 'cash').required(),
  phoneNumber: Joi.string().pattern(/^254[0-9]{9}$/),
  mpesaRef: Joi.string()
});

export const campaignValidator = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  goalAmount: Joi.number().positive().required(),
  type: Joi.string().valid('pledge', 'offering', 'tithe', 'emergency', 'building', 'other'),
  startDate: Joi.date().required(),
  endDate: Joi.date().required().min(Joi.ref('startDate')),
  impactStatement: Joi.string()
});