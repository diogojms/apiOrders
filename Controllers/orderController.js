// controllers/orderController.js

const Purchase = require('../models/order');
const Product = require('../models/products');
const Service = require('../models/service');

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
