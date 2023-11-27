'product strict'

//require
const mongoose = require('mongoose')
//schema
const Schema = mongoose.Schema;

const ProductSchema = new Schema(
    {
        name:{type: String, required: true},
        price:{type: Number, required: true}
    }, 
    {collection: 'Products'}
)

// model
const Product = mongoose.model('Product', ProductSchema)

module.exports = Product