'order strict'

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
  clientId: {
    type: Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  },
  paymentType: {
    type: String,
    required: true,
  },
  storeId: {
    type: Schema.Types.ObjectId,
    ref: "Store",
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});


const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;
