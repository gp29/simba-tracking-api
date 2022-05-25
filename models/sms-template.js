// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var smsTemplateSchema = new Schema({
    sms_template_id: {
        type: String,
        default: ''
    },
    title: {
        type: String,
        default: ''
    },
    code: {
        type: String,
        default: ''
    },
    description: {
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
smsTemplateSchema.pre('save', async function(callback) {
    this.sms_template_id = await idGenerator.generateId('SMS'); 
});

var Sms_template = mongoose.model('Sms_template', smsTemplateSchema);
module.exports = Sms_template;