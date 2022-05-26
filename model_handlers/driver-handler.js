'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const driver = require('./../models/driver');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const timeZone = require('moment-timezone');
const imgHandler = require('./../model_handlers/image-handler');

const get = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnValue = {}
            if(requestParam.driver_id){
                columnValue.driver_id = requestParam.driver_id
            }
            if(requestParam.status){
                columnValue.status = requestParam.status
            }
            let response = await query.selectWithAnd(dbConstants.dbSchema.drivers, columnValue, { _id: 0}, { created_at: 1 });
            if(requestParam.driver_id){
                response = response[0]
                response.profile_photo = response.profile_photo != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`simba-tracking/drivers/${response.profile_photo}`}) : ''
                response.licence_photo = response.licence_photo != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`simba-tracking/drivers/${response.licence_photo}`}) : ''
                resolve(response);
                return;
            }
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
            if(requestParam.text && requestParam.text !=''){
                columnAndValue['$or'] = [{
                    driver_id: new RegExp(requestParam.text, 'i')
                }, {
                    first_name: new RegExp(requestParam.text, 'i')
                }, {
                    last_name: new RegExp(requestParam.text, 'i')
                }, {
                    status: new RegExp(requestParam.text, 'i')
                }, {
                    mobile_country_code: new RegExp(requestParam.text, 'i')
                }, {
                    mobile: new RegExp(requestParam.text, 'i')
                }, {
                    dob: new RegExp(requestParam.text, 'i')
                }, {
                    family_mobile_country_code: new RegExp(requestParam.text, 'i')
                }, {
                    family_mobile: new RegExp(requestParam.text, 'i')
                }, {
                    address: new RegExp(requestParam.text, 'i')
                }, {
                    licence_number: new RegExp(requestParam.text, 'i')
                }];
            }
            let page = requestParam.page ? requestParam.page : 0 ;
            let sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10 ;
            let skip = page * sizePerPage;
            let obj = {};

            let count = await query.countRecord(dbConstants.dbSchema.drivers, columnAndValue)
            let joinArr = [{
                $lookup: {
                    from: 'jobs',
                    localField: 'driver_id',
                    foreignField: 'driver_id',
                    as: 'jobDetails'
                }
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
                    driver_id: "$driver_id",
                    name: { $concat: [ "$first_name", " ", "$last_name" ] },
                    mobile: { $concat: [ "$mobile_country_code", " ", "$mobile" ] },
                    dob: "$dob",
                    licence_number: "$licence_number",
                    family_mobile: { $concat: [ "$family_mobile_country_code", " ", "$family_mobile" ] },
                    address: "$address",
                    created_at: "$created_at",
                    status: "$status",
                    total_jobs: { $size: "$jobDetails" },
                }
            }];
            let data = await query.joinWithAnd(dbConstants.dbSchema.drivers, joinArr);
            data = JSON.parse(JSON.stringify(data))
            _.each(data, (elem) => {
                elem.created_at = timeZone(new Date(elem.created_at)).tz(requestParam.time_zone).format('lll')
            })
            obj.data = data;
            obj.count = count;
            resolve(obj);
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const create = async(requestParam, req) => {
    return new Promise(async(resolve, reject) => {
        try {
            let compareColumnAndValues = {
                mobile: requestParam.mobile,
                mobile_country_code: requestParam.mobile_country_code,
            };
            let response = await query.selectWithAndOne(dbConstants.dbSchema.drivers, compareColumnAndValues, { _id: 0, driver_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_MOBILE_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            if(req.files){
                if(req.files.profile_photo){
                    requestParam.profile_photo = await imgHandler.uploadImage(req.files.profile_photo, config.aws.s3.driverBucket)
                }
                if(req.files.licence_photo){
                    requestParam.licence_photo = await imgHandler.uploadImage(req.files.licence_photo, config.aws.s3.driverBucket)
                }
            }
            requestParam.dob = timeZone(new Date(requestParam.dob)).tz(requestParam.time_zone).format('YYYY-MM-DD')
            await query.insertSingle(dbConstants.dbSchema.drivers, requestParam);
            resolve({});
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const update = async(requestParam, req) => {
    return new Promise(async(resolve, reject) => {
        try {
            let compareColumnAndValues = {
                mobile: requestParam.mobile,
                mobile_country_code: requestParam.mobile_country_code,
                driver_id: {
                    $ne: requestParam.driver_id
                }
            };
            let response = await query.selectWithAndOne(dbConstants.dbSchema.drivers, compareColumnAndValues, { _id: 0, driver_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_MOBILE_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let res = await query.selectWithAndOne(dbConstants.dbSchema.drivers, {driver_id: requestParam.driver_id}, { _id: 0}, { created_at: 1 });
            if (requestParam.change_profile_photo) {
                const objects = [{
                    Key: `simba-tracking/drivers/${res.profile_photo}`
                }];
                await imgHandler.deleteImage(objects, config.aws.bucketName)
                requestParam.profile_photo = await imgHandler.uploadImage(req.files.profile_photo, config.aws.s3.driverBucket)
            }
            else{
                delete requestParam.profile_photo
            }
            if (requestParam.change_licence_photo) {
                const objects = [{
                    Key: `simba-tracking/drivers/${res.licence_photo}`
                }];
                await imgHandler.deleteImage(objects, config.aws.bucketName)
                requestParam.licence_photo = await imgHandler.uploadImage(req.files.licence_photo, config.aws.s3.driverBucket)
            }
            else{
                delete requestParam.licence_photo
            }
            requestParam.dob = timeZone(new Date(requestParam.dob)).tz(requestParam.time_zone).format('YYYY-MM-DD')
            await query.updateSingle(dbConstants.dbSchema.drivers, requestParam, {driver_id: requestParam.driver_id});
            resolve({});
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
                await removeImages(requestParam)
                await query.removeMultiple(dbConstants.dbSchema.drivers, { driver_id: { $in: requestParam['ids']}});
            }
            else{
                await query.updateMultiple(dbConstants.dbSchema.drivers, {status: requestParam.type}, {driver_id: { $in: requestParam['ids']}});
            }
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const removeImages = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAnd(dbConstants.dbSchema.drivers, {driver_id: {$in: requestParam.ids}}, { _id: 0, driver_id:1, profile_photo:1, licence_photo:1}, { created_at: 1 });
            let objects = []
            await Promise.all(response.map(async (elem) => {
                objects.push({Key: `simba-tracking/drivers/${elem.profile_photo}`})
                objects.push({Key: `simba-tracking/drivers/${elem.licence_photo}`})
            }))
            await imgHandler.deleteImage(objects, config.aws.bucketName)
            resolve({});
            return;
        } catch (error) {
            return false;
        }
    })
};

module.exports = {
    get,
    getSort,
    create,
    update,
    action,
    removeImages
};