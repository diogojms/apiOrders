const { log } = require('console');
const Order = require('../Models/order');
const { default: axios } = require("axios");

/**
 * @swagger
 * /orders/getAllOrders:
 *   get:
 *     summary: Get all orders
 *     description: Retrieve a list of all orders.
 *     tags:
 *       - Orders
 *     responses:
 *       '200':
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   enum: [200]
 *                 message:
 *                   type: string
 *                   enum: [Orders]
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *       '500':
 *         description: Internal Server Error - Failed to fetch orders
 */
exports.ReadOrders = async (req, res) => {
  const orders = await Order.find();
  res.json({ status: 'success', orders: orders })
}

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     description: Retrieve an order by its ID.
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the order to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   enum: [200]
 *                 message:
 *                   type: string
 *                   enum: [Order]
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       '404':
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   enum: [404]
 *                 message:
 *                   type: string
 *                   enum: [Order not found]
 *                 data: {}
 *       '500':
 *         description: Internal Server Error - Failed to fetch order
 */
exports.ReadOrder = async (req, res) => {
  const { orderID } = req.query;

  if (!orderID) {
      return res.status(400).json({ msg: 'Invalid order ID' });
  }

  const order = await Order.findById(orderID);
  if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
  }

  res.json({ status: 'success', service: order})
}

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order
 *     description: Create a new order with the provided items.
 *     tags:
 *       - Orders
 *     requestBody:
 *       description: Order details
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewOrder'
 *     responses:
 *       '200':
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   enum: [200]
 *                 message:
 *                   type: string
 *                   enum: [Order created]
 *                 data:
 *                   $ref: '#/components/schemas/OrderWithStocks'
 *       '500':
 *         description: Internal Server Error - Failed to create order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   enum: [500]
 *                 message:
 *                   type: string
 *                   enum: [Error creating order]
 *                 data: {}
 */
exports.createOrder = async (req, res) => {
  try {
    const newOrder = new Order({
      ...req.body,
    });

    const savedOrder = await newOrder.save();
    const token = req.headers.authorization;

    const updateStockPromises = req.body.items.map(async (item) => {
      const quantityUsed = item.quantity || 1;
      const { productId, serviceId } = item;
      try {
        if (productId) {
          const stock = await axios.post(
            `http://${process.env.PRODUCTS_URI}:8083/stock/EditStock`,
            {
              ProductID: productId,
              newQuantity: quantityUsed,
            },
            {
              headers: {
                Authorization: token,
              },
            }
          );
          return stock.data;
        } else if (serviceId) {
          const service = await axios.get(
            `http://${process.env.SERVICES_URI}:8084/service/ReadService/`,
            {
              params: {
                serviceID: serviceId,
              },
            }
          );
          if (!service.data || !service.data.service) {
            throw new Error("Service not found");
          }
          return service.data.service;
        } else {
          throw new Error("Invalid item in the order");
        }
      } catch (error) {
        console.error(error);
        throw new Error("Error updating products stock");
      }
    });

    const updatedStocks = await Promise.all(updateStockPromises);

    res.json({
      status: 200,
      message: "Order created",
      data: { order: savedOrder, stocks: updatedStocks },
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ status: 500, message: "Error creating order", data: {} });
  }
};

/**
 * @swagger
 * /orders/{id}:
 *   put:
 *     summary: Update an existing order
 *     description: Update an existing order with the provided data.
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the order to update
 *         schema:
 *           type: string
 *     requestBody:
 *       description: Updated order details
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateOrder'
 *     responses:
 *       '200':
 *         description: Order updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   enum: [200]
 *                 message:
 *                   type: string
 *                   enum: [Order updated]
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       '404':
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   enum: [404]
 *                 message:
 *                   type: string
 *                   enum: [Order not found]
 *                 data: {}
 *       '500':
 *         description: Internal Server Error - Failed to update order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   enum: [500]
 *                 message:
 *                   type: string
 *                   enum: [Error updating order]
 *                 data: {}
 */
exports.editOrder = async (req, res) => {
  try {
    const { orderId } = req.query; 

    if (!orderId) {
      return res.status(400).json({ status: 400, message: 'Invalid order ID', data: {} });
    }

    const existingOrder = await Order.findById(orderId);

    if (!existingOrder) {
      return res.status(404).json({ status: 404, message: 'Order not found', data: {} });
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, req.body, { new: true });

    const token = req.headers.authorization;
    const updateStockPromises = req.body.items.map(async (item) => {
      const quantityUsed = item.quantity || 1;
      const { productId, serviceId } = item;
      try {
        if (productId) {
          const stock = await axios.post(
            `http://${process.env.PRODUCTS_URI}:8083/stock/EditStock`,
            {
              ProductID: productId,
              newQuantity: quantityUsed,
            },
            {
              headers: {
                Authorization: token,
              },
            }
          );
          return stock.data;
        } else if (serviceId) {
          const service = await axios.get(
            `http://${process.env.SERVICES_URI}:8084/service/ReadService/`,
            {
              params: {
                serviceID: serviceId,
              },
            }
          );
          if (!service.data || !service.data.service) {
            throw new Error("Service not found");
          }
          return service.data.service;
        } else {
          throw new Error("Invalid item in the order");
        }
      } catch (error) {
        console.error(error);
        throw new Error("Error updating products stock");
      }
    });

    const updatedStocks = await Promise.all(updateStockPromises);

    res.json({
      status: 200,
      message: 'Order updated',
      data: { order: updatedOrder, stocks: updatedStocks },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: 'Error updating order', data: {} });
  }
};

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Delete an existing order
 *     description: Delete an existing order by ID.
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the order to delete
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Order deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   enum: [200]
 *                 message:
 *                   type: string
 *                   enum: [Order deleted]
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       '404':
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   enum: [404]
 *                 message:
 *                   type: string
 *                   enum: [Order not found]
 *                 data: {}
 *       '500':
 *         description: Internal Server Error - Failed to delete order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   enum: [500]
 *                 message:
 *                   type: string
 *                   enum: [Error deleting order]
 *                 data: {}
 */
exports.RemoveOrder = async (req, res) => {
  const { orderID } = req.query;

  if (!orderID) {
      return res.status(400).json({ msg: 'Invalid order ID' });
  }

  const order = await Order.findById(orderID);

  if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
  }

  await Order.deleteOne(order);

  res.json({ status: 'success', order: order});
}
