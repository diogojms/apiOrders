const express = require('express');
const router = express.Router();
const orderController = require('../Controllers/orderController')
const jwt = require('jsonwebtoken')

function checkToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ msg: "Token inválida" });
    }

    try {
        const secret = process.env.SECRET;
        jwt.verify(token, secret);
        next();
    } catch (err) {
        console.error("Error verifying token:", err);
        res.status(401).json({ msg: "Erro na verificação do token", error: err.message });
    }
}

function isAdmin(req, res, next) {
    const usertoken = req.headers.authorization;
    const token = usertoken.split(' ');
    const tokenData = jwt.verify(token[1], process.env.SECRET);

    if (tokenData.role == 3)
        next()
    else
        res.status(403).json()
}

function isClient(req, res, next) {
    const usertoken = req.headers.authorization;
    const token = usertoken.split(' ');
    const tokenData = jwt.verify(token[1], process.env.SECRET);

    if(tokenData.role == 1)
        next()
    else
        res.status(403).json() 
}

router.post('/', checkToken, orderController.createOrder)
router.put('/:id', checkToken, orderController.editOrder)
router.delete('/:id', checkToken, isAdmin, orderController.RemoveOrder)
router.get('/:id', checkToken, orderController.ReadOrder)
router.get('/', checkToken, orderController.ReadOrders)

module.exports = router;