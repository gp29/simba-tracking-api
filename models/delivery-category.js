// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var deliveryCatSchema = new Schema({
    delivery_category_id: {
        type: String,
        default: ''
    },
    title: {
        type: String,
        default: ''
    },
    code: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        default: ''
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

// // Execute before each user.save() call
deliveryCatSchema.pre('save', async function(callback) {
    this.delivery_category_id = await idGenerator.generateId('DCT'); 
});

var Delivery_category = mongoose.model('Delivery_category', deliveryCatSchema);
module.exports = Delivery_category;