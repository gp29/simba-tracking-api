// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var customerSchema = new Schema({
    customer_id: {
        type: String,
        default:''
    },
    first_name: {
        type: String,
        default:''
    },
    last_name: {
        type: String,
        default:''
    },
    mobile_country_code: {
        type: String,
        default:''
    },
    mobile: {
        type: String,
        default:''
    },
    email: {
        type: String,
        default:''
    },
    password: {
        type: String,
        default:''
    },
    profile_photo: {
        type: String,
        default:''
    },
    business_name: {
        type: String,
        default:''
    },
    business_mobile_country_code: {
        type: String,
        default:''
    },
    business_mobile: {
        type: String,
        default:''
    },
    preferred_contact: {
        type: String,
        default:''
    },
    status: {
        type: String,
        default:''
    },
    reset_code: {
        type: String,
        default:''
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
customerSchema.pre('save', async function(callback) {
    this.customer_id = await idGenerator.generateId('CUS'); 
});

var Customer = mongoose.model('Customer', customerSchema);
module.exports = Customer;