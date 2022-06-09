'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const moment = require('moment');
const timeZone = require('moment-timezone');
const encryptDecryptHandler = require('./../model_handlers/encrypt-decrypt-handler');
const imgHandler = require('./../model_handlers/image-handler');

const get = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnValue = {}
            if(requestParam.job_id){
                columnValue.job_id = requestParam.job_id
            }
            let response = await query.selectWithAndOne(dbConstants.dbSchema.jobs, columnValue, { _id: 0}, { created_at: 1 });
            resolve(response);
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const getSort = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnAndValue = {}
            if(requestParam.status){
                columnAndValue.status = requestParam.status
            }
            if(requestParam.road_id){
                columnAndValue.road_id = requestParam.road_id
            }
            if(requestParam.text && requestParam.text !=''){
                columnAndValue['$or'] = [{
                    job_id: new RegExp(requestParam.text, 'i')
                }, {
                    'cusDetails.first_name': new RegExp(requestParam.text, 'i')
                }, {
                    'cusDetails.last_name': new RegExp(requestParam.text, 'i')
                }, {
                    'deliveryCatDetails.title': new RegExp(requestParam.text, 'i')
                }, {
                    'truckDetails.title': new RegExp(requestParam.text, 'i')
                }, {
                    pickup_address: new RegExp(requestParam.text, 'i')
                }, {
                    delivery_address: new RegExp(requestParam.text, 'i')
                }];
            }
            let page = requestParam.page ? requestParam.page : 0 ;
            let sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10 ;
            let skip = page * sizePerPage;
            let obj = {};

            let joinArr = [{
                $lookup: {
                    from: 'customers',
                    localField: 'customer_id',
                    foreignField: 'customer_id',
                    as: 'cusDetails'
                }
            }, {
                $unwind: "$cusDetails"
            }, {
                $lookup: {
                    from: 'trucks',
                    localField: 'truck_id',
                    foreignField: 'truck_id',
                    as: 'truckDetails',
                },
            }, {
                $unwind: "$truckDetails"
            }, {
                $lookup: {
                    from: 'delivery_categories',
                    localField: 'delivery_category_id',
                    foreignField: 'delivery_category_id',
                    as: 'deliveryCatDetails',
                },
            }, {
                $unwind: "$deliveryCatDetails"
            }, { 
                $match : columnAndValue
            }, { 
                $sort : {created_at:-1}
            }, {
                $skip: skip
            }, {
                $limit: sizePerPage
            }, {
                $project: {
                    _id: 0,
                    job_id: 1
                }
            }];
            let count = await query.joinWithAnd(dbConstants.dbSchema.jobs, joinArr);

            joinArr = [{
                $lookup: {
                    from: 'customers',
                    localField: 'customer_id',
                    foreignField: 'customer_id',
                    as: 'cusDetails'
                }
            }, {
                $unwind: "$cusDetails"
            }, {
                $lookup: {
                    from: 'trucks',
                    localField: 'truck_id',
                    foreignField: 'truck_id',
                    as: 'truckDetails',
                },
            }, {
                $unwind: "$truckDetails"
            }, {
                $lookup: {
                    from: 'delivery_categories',
                    localField: 'delivery_category_id',
                    foreignField: 'delivery_category_id',
                    as: 'deliveryCatDetails',
                },
            }, {
                $unwind: "$deliveryCatDetails"
            }, { 
                $match : columnAndValue
            }, { 
                $sort : {created_at:-1}
            }, {
                $skip: skip
            }, {
                $limit: sizePerPage
            }, {
                $project: {
                    _id: 0,
                    job_id: "$job_id",
                    customer: { $concat: [ "$cusDetails.first_name", " ", "$cusDetails.last_name" ] },
                    customer_mobile: { $concat: [ "$cusDetails.mobile_country_code", " ", "$cusDetails.mobile" ] },
                    customer_email: "$cusDetails.email",
                    delivery_category: "$deliveryCatDetails.title",
                    delivery_category_code:"$deliveryCatDetails.code",
                    vehicle: "$truckDetails.title",
                    pickup_address: "$pickup_address",
                    delivery_address: "$delivery_address",
                    pickup_from: "$pickup_from",
                    created_at: "$created_at",
                    status: "$status",
                    delivered_at: "$delivered_at",
                    formatted_distance: "$formatted_distance",
                    formatted_duration: "$formatted_duration",
                    pickup_contact_name: "$pickup_contact_name",
                    pickup_contact_number: "$pickup_contact_number",
                    pickup_instructions: "$pickup_instructions",
                    pickup_landmark: "$pickup_landmark",
                    delivery_landmark: "$delivery_landmark",
                    items: "$items",
                    pickup_latitude: "$pickup_latitude",
                    pickup_longitude: "$pickup_longitude",
                    delivery_latitude: "$delivery_latitude",
                    delivery_longitude: "$delivery_longitude",
                }
            }];
            let data = await query.joinWithAnd(dbConstants.dbSchema.jobs, joinArr);
            data = JSON.parse(JSON.stringify(data))
            let allLtLngArr = []
            _.each(data, (elem) => {
                elem.deliver_time = ''
                if(elem.status == 'new' || elem.status == 'pickedup'){
                    let dt;
                    if(elem.delivery_category_code == '2H'){
                        dt = moment(new Date(elem.pickup_from)).add(2, 'days');
                    }
                    if(elem.delivery_category_code == '4H'){
                        dt = moment(new Date(elem.pickup_from)).add(4, 'days');
                    }
                    if(elem.delivery_category_code == 'SAME_WEEK'){
                        dt = moment().endOf('week')
                    }
                    elem.deliver_time = timeZone(new Date(dt)).tz(requestParam.time_zone).format('lll')
                }
                if(elem.status == 'delivered'){
                    elem.deliver_time = timeZone(new Date(elem.delivered_at)).tz(requestParam.time_zone).format('lll')
                }

                elem.pickup_from = timeZone(new Date(elem.pickup_from)).tz(requestParam.time_zone).format('lll')
                elem.created_at = timeZone(new Date(elem.created_at)).tz(requestParam.time_zone).format('lll')

                allLtLngArr.push({
                    lat: elem.pickup_latitude, lng: elem.pickup_longitude, label:'Pickup', address: elem.pickup_address,
                },{
                    lat: elem.delivery_latitude, lng: elem.delivery_longitude, label:'Delivery', address: elem.delivery_address,
                })
            })
            obj.data = data;
            obj.count = count.length;
            obj.allLtLngArr = allLtLngArr;
            resolve(obj);
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const action = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            if (requestParam['type']=="delete") {
                await query.removeMultiple(dbConstants.dbSchema.jobs, { job_id: { $in: requestParam['ids']}});
            }
            else{
                let obj = {status: requestParam.type}
                if(requestParam.type == 'pickedup'){
                    obj.pickedup_at = new Date()
                }
                if(requestParam.type == 'delivered'){
                    obj.delivered_at = new Date()
                }
                await query.updateMultiple(dbConstants.dbSchema.jobs, obj, {job_id: { $in: requestParam['ids']}});
            }
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const assignRoad = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.roads, {road_id:requestParam.road_id}, { _id:0, road_id: 1, driver_id:1, instance_id:1} );
            if(response){
                await query.updateSingle(dbConstants.dbSchema.jobs, {road_id: requestParam.road_id, status:'accepted', driver_id: response.driver_id, instance_id: response.instance_id}, {job_id: requestParam.job_id});
            }
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const cancelJob = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.customers, {customer_id:requestParam.customer_id}, { _id:0, customer_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let job = await query.selectWithAndOne(dbConstants.dbSchema.jobs, {job_id:requestParam.job_id}, { _id:0, job_id: 1, status:1} );
            if(!job){
                reject(errors(labels.LBL_JOB_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            if(job.status != 'new'){
                reject(errors(labels.LBL_YOU_CAN_NOT_CANCEL_JOB[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            await query.updateSingle(dbConstants.dbSchema.jobs, {status:'cancelled'}, {job_id: requestParam.job_id});
            resolve(await encryptDecryptHandler.encrypt({}));
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const pickedupJob = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.drivers, {driver_id:requestParam.driver_id}, { _id:0, driver_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let job = await query.selectWithAndOne(dbConstants.dbSchema.jobs, {job_id:requestParam.job_id}, { _id:0, job_id: 1, status:1} );
            if(!job){
                reject(errors(labels.LBL_JOB_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            await query.updateSingle(dbConstants.dbSchema.jobs, {status:'pickedup', pickedup_at:new Date()}, {job_id: requestParam.job_id});
            resolve(await encryptDecryptHandler.encrypt({}));
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const deliveredJob = async(requestParam, req) => {
    return new Promise(async(resolve, reject) => {
        try {
            if(requestParam.driver_id){
                requestParam.driver_id = await encryptDecryptHandler.decryptString(requestParam.driver_id)
            }
            if(requestParam.job_id){
                requestParam.job_id = await encryptDecryptHandler.decryptString(requestParam.job_id)
            }
            if(requestParam.delivery_recipient_name){
                requestParam.delivery_recipient_name = await encryptDecryptHandler.decryptString(requestParam.delivery_recipient_name)
            }
            if(requestParam.specified_recipient){
                requestParam.specified_recipient = await encryptDecryptHandler.decryptString(requestParam.specified_recipient)
            }
            if(requestParam.note){
                requestParam.note = await encryptDecryptHandler.decryptString(requestParam.note)
            }
            if(requestParam.is_safe){
                requestParam.is_safe = await encryptDecryptHandler.decryptString(requestParam.is_safe)
            }
            let response = await query.selectWithAndOne(dbConstants.dbSchema.drivers, {driver_id:requestParam.driver_id}, { _id:0, driver_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let job = await query.selectWithAndOne(dbConstants.dbSchema.jobs, {job_id:requestParam.job_id}, { _id:0, job_id: 1, status:1} );
            if(!job){
                reject(errors(labels.LBL_JOB_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            if(req.files && req.files.signature_proof_image){
                requestParam.signature_proof_image = await imgHandler.uploadImage(req.files.signature_proof_image, config.aws.s3.signatureBucket)
            }
            requestParam.status = 'delivered'
            requestParam.delivered_at = new Date()
            await query.updateSingle(dbConstants.dbSchema.jobs, requestParam, {job_id: requestParam.job_id});
            resolve(await encryptDecryptHandler.encrypt({}));
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

module.exports = {
    get,
    getSort,
    action,
    assignRoad,
    cancelJob,
    pickedupJob,
    deliveredJob
};