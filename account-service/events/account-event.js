const mongoose = require('mongoose');

const accountEventSchema = new mongoose.Schema({
  accountId: { type: String, required: true },
  sequence: { type: Number, required: true },
  type: { type: String, enum: ['AccountOpened', 'MoneyDeposited', 'MoneyWithdrawn'], required: true },
  amountCents: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  occurredAt: { type: Date, default: Date.now }
}, {
  versionKey: false,
  collection: 'account_events'
});

accountEventSchema.index({ accountId: 1, sequence: 1 }, { unique: true });

module.exports = mongoose.model('AccountEvent', accountEventSchema);
