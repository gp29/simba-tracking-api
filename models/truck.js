// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var truckSchema = new Schema({
    truck_id: {
        type: String,
        default: ''
    },
    title: {
        type: String,
        default: ''
    },
    volume: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    registration_no: {
        type: String,
        default: ''
    },
    weight: {
        type: String,
        default: ''
    },
    assurance: {
        type: String,
        default: ''
    },
    registration_date: {
        type: String,
        default: ''
    },
    insurance_date: {
        type: String,
        default: ''
    },
    maintenance_date: {
        type: String,
        default: ''
    },
    next_maintenance_date: {
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
truckSchema.pre('save', async function(callback) {
    this.truck_id = await idGenerator.generateId('TRK'); 
});

var Truck = mongoose.model('Truck', truckSchema);
module.exports = Truck;