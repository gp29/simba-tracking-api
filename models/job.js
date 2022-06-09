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
    customer_id: {
        type: String,
        default:''
    },
    instance_id: {
        type: String,
        default:''
    },
    driver_id: {
        type: String,
        default:''
    },
    truck_id: {
        type: String,
        default:''
    },
    delivery_category_id: {
        type: String,
        default:''
    },
    road_id: {
        type: String,
        default:''
    },
    pickup_from: {
        type: Date,
        //default: Date.now
    },
    pickup_landmark: {
        type: String,
        default: ''
    },
    pickup_address: {
        type: String,
        default: ''
    },
    pickup_latitude: {
        type: Number,
        default: 0
    },
    pickup_longitude: {
        type: Number,
        default: 0
    },
    delivery_landmark: {
        type: String,
        default: ''
    },
    delivery_address: {
        type: String,
        default: ''
    },
    delivery_latitude: {
        type: Number,
        default: 0
    },
    delivery_longitude: {
        type: Number,
        default: 0
    },
    total_distance: {
        type: Number,
        default:0
    },
    total_duration: {
        type: Number,
        default:0
    },
    formatted_distance: {
        type: String,
        default:''
    },
    formatted_duration: {
        type: String,
        default:''
    },
    pickup_contact_name: {
        type: String,
        default: ''
    },
    pickup_contact_number: {
        type: String,
        default: ''
    },
    pickup_instructions: {
        type: String,
        default: ''
    },
    items: {
        type: Array,
        default:[]
    },
    is_customer_rated: {
        type: Boolean,
        default:false
    },
    rating: {
        type: Object,
        default: {
            rating: '',
            comment: ''
        }
    },
    status: {
        type: String,
        default:'new'
    },
    pickedup_at: {
        type: Date
    },
    delivered_at: {
        type: Date
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

let Job = mongoose.model('Job', jobSchema);
module.exports = Job;