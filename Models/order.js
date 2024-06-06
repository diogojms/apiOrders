'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderSchema = new Schema({
  items: [
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
      serviceId: {
        type: Schema.Types.ObjectId,
        ref: "Service",
      },
      name: {
        type: String,
      },
      price: {
        type: Number,
      },
      quantity: {
        type: Number,
        required: function () {
          return this.productId ? true : false;
        },
      },
    },
  ],
  total: {
    type: Number,
    required: true,
  },
  client: {
    _id: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
  },
  store: {
    _id: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
  },
  paymentType: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  order_number: {
    type: String,
    required: true,
    unique: true,
  },
});

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;
