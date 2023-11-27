'stock strict'

//require
const mongoose = require('mongoose')
//schema
const Schema = mongoose.Schema;

const StockSchema = new Schema(
    {
        quantity:{type: Number, required: true},
        ProductID:{type: Object, required: true}
    }, 
    {collection: 'Stock'}
)

// model
const Stock = mongoose.model('ProductByPurchase', StockSchema)

module.exports = Stock