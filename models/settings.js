// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var settingsSchema = new Schema({
    settings_id:{
        type: String,
        default:''
    },
    fb_url:{
        type: String,
        default:''
    },
    twitter_url:{
        type: String,
        default:''
    },
    instagram_url:{
        type: String,
        default:''
    },
    linkedin_url:{
        type: String,
        default:''
    },
    youtube_url:{
        type: String,
        default:''
    },
    default_currency:{
        type: String,
        default:''
    },
    call_us:{
        type: String,
        default:''
    },
    sos_number:{
        type: String,
        default:''
    },
    support_email:{
        type: String,
        default:''
    },
    company_address:{
        type: String,
        default:''
    },
    is_payment_live: {
        type: Boolean,
        default:false
    },
    stripe_sandbox_key:{
        type: String,
        default:''
    },
    stripe_production_key:{
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

settingsSchema.pre('save', async function(callback) {
    this.settings_id = await idGenerator.generateId('SET'); 
});

var Settings = mongoose.model('Settings', settingsSchema);
module.exports = Settings;