// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var instanceSchema = new Schema({
    instance_id: {
        type: String,
        default: ''
    },
    enterprise_id: {
        type: String,
        default: ''
    },
    rented_day: {
        type: String,
        default: ''
    },
    quantity: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        default: 'inactive'
    },
    start_date: {
        type: Date,
        default: Date.now
    },
    end_date: {
        type: Date,
        default: Date.now
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
instanceSchema.pre('save', async function(callback) {
    this.instance_id = await idGenerator.generateId('INS'); 
});

var Instance = mongoose.model('Instance', instanceSchema);
module.exports = Instance;