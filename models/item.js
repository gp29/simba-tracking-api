// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var itemSchema = new Schema({
    item_id: {
        type: String,
        default: ''
    },
    title: {
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
itemSchema.pre('save', async function(callback) {
    this.item_id = await idGenerator.generateId('ITM'); 
});

var Item = mongoose.model('Item', itemSchema);
module.exports = Item;