'service strict'

//require
const mongoose = require('mongoose')
//schema
const Schema = mongoose.Schema;

const ServiceSchema = new Schema(
    {
        name:{type: String, required: true},
        price:{type: Number, required: true}
    }, 
    {collection: 'Services'}
)

// model
const Service = mongoose.model('Service', ServiceSchema)

module.exports = Service