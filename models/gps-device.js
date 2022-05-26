// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var deviceSchema = new Schema({
    device_id: {
        type: String,
        default: ''
    },
    uniq_code: {
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
deviceSchema.pre('save', async function(callback) {
    this.device_id = await idGenerator.generateId('GPS'); 
});

var Gps_device = mongoose.model('Gps_device', deviceSchema);
module.exports = Gps_device;