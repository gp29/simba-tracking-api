// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var jobSchema = new Schema({
    job_id: {
        type: String,
        default:''
    },
    title: {
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
jobSchema.pre('save', async function(callback) {
    this.job_id = await idGenerator.generateId('JOB'); 
});

var Job = mongoose.model('Job', jobSchema);
module.exports = Job;