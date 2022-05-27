// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var roadSchema = new Schema({
    road_id: {
        type: String,
        default:''
    },
    prefix: {
        type: String,
        default:''
    },
    start_point: {
        type: String,
        default:''
    },
    start_latitude: {
        type: Number,
        default:0
    },
    start_longitude: {
        type: Number,
        default:0
    },
    end_point: {
        type: String,
        default:''
    },
    end_latitude: {
        type: Number,
        default:0
    },
    end_longitude: {
        type: Number,
        default:0
    },
    truck_id: {
        type: String,
        default:''
    },
    driver_id: {
        type: String,
        default:''
    },
    instance_id: {
        type: String,
        default:''
    },
    status: {
        type: String,
        default:''
    },
    road_status: {
        type: String,
        default:'pending'
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
roadSchema.pre('save', async function(callback) {
    this.road_id = await idGenerator.generateId('ROUTE'); 
});

var Road = mongoose.model('Road', roadSchema);
module.exports = Road;