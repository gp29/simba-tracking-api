// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var accessRightSchema = new Schema({
    access_right_id: {
        type: String,
        default:''
    },
    role_id: {
        type: String,
        default:''
    },
    module: {
        type: Object,
        default:{}
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
accessRightSchema.pre('save', async function(callback) {
    this.access_right_id = await idGenerator.generateId('ACC'); 
});

var Access_right = mongoose.model('Access_right', accessRightSchema);
module.exports = Access_right;