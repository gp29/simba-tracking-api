// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var moduleSchema = new Schema({
    module_id: {
        type: String,
        default:''
    },
    title: {
        type: String,
        default:''
    },
    path: {
        type: String,
        default:''
    },
    order_no: {
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
moduleSchema.pre('save', async function(callback) {
    this.module_id = await idGenerator.generateId('MDL'); 
});

var Module = mongoose.model('Module', moduleSchema);
module.exports = Module;