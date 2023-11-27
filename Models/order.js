'order strict'

const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    productID: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    serviceID: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    quantity: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;
