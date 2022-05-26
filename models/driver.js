// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var driverSchema = new Schema({
    driver_id: {
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
    dob: {
        type: String,
        default:''
    },
    family_mobile_country_code: {
        type: String,
        default:''
    },
    family_mobile: {
        type: String,
        default:''
    },
    address: {
        type: String,
        default:''
    },
    profile_photo: {
        type: String,
        default:''
    },
    licence_number: {
        type: String,
        default:''
    },
    licence_photo: {
        type: String,
        default:''
    },
    status: {
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
driverSchema.pre('save', async function(callback) {
    this.driver_id = await idGenerator.generateId('DRI'); 
});

var Driver = mongoose.model('Driver', driverSchema);
module.exports = Driver;