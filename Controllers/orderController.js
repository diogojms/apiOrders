// controllers/orderController.js

const Purchase = require('../Models/order');
const Product = require('../Models/products');
const Service = require('../Models/service');
/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order
 *     description: Endpoint to create a new order with the provided items.
 *     tags:
 *       - Orders
 *     requestBody:
 *       description: Order creation data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [product, service]
 *                     itemID:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *             required:
 *               - items
 *     responses:
 *       '200':
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [success]
 *                 purchase:
 *                   type: object
 *                   // Define your purchase properties here
 *       '400':
 *         description: Bad Request - Invalid or missing input data
 *       '500':
 *         description: Internal Server Error - Failed to create the order
 */
exports.createOrder = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ msg: 'A compra deve conter pelo menos um item' });
    }

    let totalPurchasePrice = 0;

    for (const item of items) { 
        const { type, itemID, quantity } = item;
      try {
        let itemTotalPrice = 0;

        if (type === 'product') {
          const product = await Product.findById(itemID);
          if (!product) {
            return res.status(400).json({ msg: `Produto com ID ${itemID} não encontrado` });
          }

          if (product.stock < quantity) {
            return res.status(400).json({
              msg: `Quantidade solicitada para o produto ${product.name} excede o estoque disponível`,
            });
          }

          itemTotalPrice = quantity * product.price;
          totalPurchasePrice += itemTotalPrice;

          await Product.findByIdAndUpdate(itemID, { $inc: { stock: -quantity } });
        } else if (type === 'service') {
          const service = await Service.findById(itemID);
          if (!service) {
            return res.status(400).json({ msg: `Serviço com ID ${itemID} não encontrado` });
          }

          itemTotalPrice = quantity * service.price;
          totalPurchasePrice += itemTotalPrice;
        } else {
          return res.status(400).json({ msg: `Tipo de item inválido: ${type}` });
        }
      } catch (error) {
        console.error('Erro ao processar item:', error);
        return res.status(500).json({ msg: 'Erro interno do servidor ao processar um item' });
      }
    }

    const purchase = await Purchase.create({
      items,
      totalPrice: totalPurchasePrice,
    });

    res.json({ status: 'success', purchase });
  } catch (error) {
    console.error('Erro ao criar compra:', error);
    res.status(500).json({ msg: 'Erro interno do servidor' });
  }
};

