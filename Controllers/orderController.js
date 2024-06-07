const { log } = require('console');
const Order = require('../Models/order');
const mongoose = require('mongoose');
const { default: axios } = require("axios");

/**
 * @swagger
 * /ReadOrders:
 *   get:
 *     summary: Get all orders
 *     description: Retrieve a list of all orders.
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         description: Page number for pagination
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of items per page
 *         schema:
 *           type: integer
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
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *                     totalOrders:
 *                       type: number
 *       '500':
 *         description: Internal Server Error - Failed to fetch orders
 */
exports.ReadOrders = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  if (limit > 100) {
    return res.status(400).json({ message: 'Limit cannot exceed 100' });
  }
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const orders = await Order.find().skip(startIndex).limit(limit);
  const totalOrders = await Order.countDocuments();

  const pagination = {
    currentPage: page,
    totalPages: Math.ceil(totalOrders / limit),
    totalOrders: totalOrders
  };

  res.json({ status: 'success', orders: orders, pagination: pagination });
}

/**
 * @swagger
 * /ReadOrder:
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
  const { id } = req.params;

  console.log(id);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ msg: 'Invalid order ID' });
  }

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    res.json({ status: 'success', order: order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: 'Error fetching order', data: {} });
  }
};

/**
 * @swagger
 * /CreateOrder:
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
    const token = req.headers.authorization;

    // Validate input
    if (!req.body.items || !Array.isArray(req.body.items) || req.body.items.length === 0) {
      throw new Error("Items array is required and must not be empty");
    }

    if (!req.body.clientId || !req.body.storeId) {
      throw new Error("Client ID and Store ID are required");
    }

    // Fetch client and store details
    const clientResponse = await axios.get(
      `http://${process.env.AUTH_URI}:8081/user/${req.body.clientId}`,
      { headers: { Authorization: token } }
    );
    const storeResponse = await axios.get(
      `http://${process.env.STORES_URI}:8086/stores/${req.body.storeId}`,
      { headers: { Authorization: token } }
    );

    const client = clientResponse.data;
    const store = storeResponse.data.store;

    // Check if client and store data are correctly fetched
    if (!client || !store) {
      throw new Error("Failed to fetch client or store data");
    }

    // Initialize total
    let total = 0;

    // Fetch item details and calculate total
    const itemDetailsPromises = req.body.items.map(async (item) => {
      const { productId, serviceId, quantity } = item;
      let name = '';
      let price = 0;

      if (productId) {
        const productResponse = await axios.get(
          `http://${process.env.PRODUCTS_URI}:8083/product/${productId}`,
          {
            headers: {
              Authorization: token,
            },
          }
        );
        const product = productResponse.data.product;
        name = product.name;
        price = product.price;

        // Validate price and quantity
        if (typeof price !== 'number' || isNaN(price)) {
          throw new Error(`Invalid price for product: ${JSON.stringify(product)}`);
        }
        if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
          throw new Error(`Invalid quantity for product: ${JSON.stringify(item)}`);
        }

        total += price * quantity;
      } else if (serviceId) {
        const serviceResponse = await axios.get(
          `http://${process.env.SERVICES_URI}:8084/service/${serviceId}`,
          {
            headers: {
              Authorization: token,
            },
          }
        );
        const service = serviceResponse.data.service;
        name = service.name;
        price = service.price;

        // Validate price
        if (typeof price !== 'number' || isNaN(price)) {
          throw new Error(`Invalid price for service: ${JSON.stringify(service)}`);
        }

        total += price;
      } else {
        throw new Error("Invalid item in the order");
      }

      return {
        productId,
        serviceId,
        quantity,
        name,
        price,
      };
    });

    const itemsWithDetails = await Promise.all(itemDetailsPromises);

    // Log the calculated total
    console.log("Calculated total:", total);

    // Check if total is a valid number
    if (isNaN(total)) {
      throw new Error('Total calculation resulted in NaN');
    }

    // Get the current number of orders and increment it
    const orderCount = await Order.countDocuments();
    const orderNumber = orderCount + 1;

    // Create new order with calculated total and client/store details
    const newOrder = new Order({
      ...req.body,
      items: itemsWithDetails,
      total,
      client: {
        _id: req.body.clientId,
        name: client.name,
        email: client.email,
        phone: client.phone,
      },
      store: {
        _id: store._id,
        name: store.name,
        address: store.address,
      },
      order_number: orderNumber,
    });

    const savedOrder = await newOrder.save();

    // Update stock for products
    const updateStockPromises = itemsWithDetails.map(async (item) => {
      const quantityUsed = item.quantity || 1;
      const { productId } = item;
      if (productId) {
        try {
          const stock = await axios.put(
            `http://${process.env.PRODUCTS_URI}:8083/stock/${productId}`,
            {
              newQuantity: quantityUsed,
            },
            {
              headers: {
                Authorization: token,
              },
            }
          );
          return stock.data;
        } catch (error) {
          console.error(error);
          throw new Error("Error updating products stock");
        }
      }
      // No stock update needed for services in this case
      return null;
    });

    const updatedStocks = await Promise.all(updateStockPromises);

    res.json({
      status: 200,
      message: "Order created",
      data: { order: savedOrder, stocks: updatedStocks },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Error creating order", data: {} });
  }
};


/**
 * @swagger
 * /EditOrder/{id}:
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
    const { id } = req.params; 

    if (!id) {
      return res.status(400).json({ status: 400, message: 'Invalid order ID', data: {} });
    }

    const existingOrder = await Order.findById(id);

    if (!existingOrder) {
      return res.status(404).json({ status: 404, message: 'Order not found', data: {} });
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, req.body, { new: true });

    const token = req.headers.authorization;
    const updateStockPromises = req.body.items.map(async (item) => {
      const quantityUsed = item.quantity || 1;
      const { productId, serviceId } = item;
      try {
        if (productId) {
            const stock = await axios.put(
            `http://${process.env.PRODUCTS_URI}:8083/stock/${productId}`,
            {
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
            `http://${process.env.SERVICES_URI}:8084/service/${serviceId}`,
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
 * /RemoveOrder:
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
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ status: 400, message: 'Invalid order ID', data: {} });
  }

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ status: 404, message: 'Order not found', data: {} });
    }

    await Order.deleteOne({ _id: id });
    res.json({ status: 200, message: 'Order deleted successfully', data: order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: 'Error deleting order', data: {} });
  }
};


exports.ReadClientOrders = async (req, res) => {
  const { clientId } = req.params;
  try {
    const orders = await Order.find({ "client._id": clientId });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.CountOrders = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    res.json({ status: 200, message: 'Count retrieved successfully', data: { totalOrders } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: 'Error counting orders', data: {} });
  }
};



