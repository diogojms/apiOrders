const { log } = require('console');
const Order = require('../Models/order');
const { default: axios } = require("axios");

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.json({ status: 200, message: "Orders", data: orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Error fetching orders", data: {} });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ status: 404, message: "Order not found", data: {} });
    } else {
      res.json({ status: 200, message: "Order", data: order });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Error fetching order", data: {} });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    const savedOrder = await newOrder.save();
    const token = req.headers.authorization;

    const updateStockPromises = req.body.items.map(async (item) => {
      const quantityUsed = item.quantity || 1;
      const { productId, serviceId } = item;
      try {
        if (productId){
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
        }
        else if (serviceId){
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
        }
        else {
          throw new Error("Invalid item in the order");
        }
      } catch (error) {
        console.error(error);
        throw new Error("Error updating products stock");
      }
    });

    const updatedStocks = await Promise.all(updateStockPromises);

    res.json({ status: 200, message: "Order created", data: { order: savedOrder, stocks: updatedStocks } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Error creating order", data: {} });
  }
};


exports.updateOrder = async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!updatedOrder) {
      res.status(404).json({ status: 404, message: "Order not found", data: {} });
    } else {
      res.json({ status: 200, message: "Order updated", data: updatedOrder });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Error updating order", data: {} });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);

    if (!deletedOrder) {
      res.status(404).json({ status: 404, message: "Order not found", data: {} });
    } else {
      res.json({ status: 200, message: "Order deleted", data: deletedOrder });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, message: "Error deleting order", data: {} });
  }
};
