// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var enterpriseSchema = new Schema({
    enterprise_id: {
        type: String,
        default:''
    },
    company_name: {
        type: String,
        default:''
    },
    key_person_name: {
        type: String,
        default:''
    },
    street_name: {
        type: String,
        default:''
    },
    city: {
        type: String,
        default:''
    },
    country: {
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
    registration_doc: {
        type: String,
        default:''
    },
    company_details: {
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
enterpriseSchema.pre('save', async function(callback) {
    this.enterprise_id = await idGenerator.generateId('ETP'); 
});

var Enterprise = mongoose.model('Enterprise', enterpriseSchema);
module.exports = Enterprise;