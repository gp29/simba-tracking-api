'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const road = require('./../models/road');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const timeZone = require('moment-timezone');

const get = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnValue = {}
            if(requestParam.road_id){
                columnValue.road_id = requestParam.road_id
            }
            if(requestParam.status){
                columnValue.status = requestParam.status
            }
            let response = await query.selectWithAnd(dbConstants.dbSchema.roads, columnValue, { _id: 0}, { created_at: 1 });
            if(requestParam.road_id){
                response = response[0]
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
                    road_id: new RegExp(requestParam.text, 'i')
                }, {
                    'truckDetails.title': new RegExp(requestParam.text, 'i')
                }, {
                    'truckDetails.volume': new RegExp(requestParam.text, 'i')
                }, {
                    'driverDetails.first_name': new RegExp(requestParam.text, 'i')
                }, {
                    'driverDetails.last_name': new RegExp(requestParam.text, 'i')
                }, {
                    instance_id: new RegExp(requestParam.text, 'i')
                }, {
                    prefix: new RegExp(requestParam.text, 'i')
                }, {
                    start_point: new RegExp(requestParam.text, 'i')
                }, {
                    end_point: new RegExp(requestParam.text, 'i')
                }, {
                    status: new RegExp(requestParam.text, 'i')
                }];
            }
            let page = requestParam.page ? requestParam.page : 0 ;
            let sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10 ;
            let skip = page * sizePerPage;
            let obj = {};

            let count = await query.countRecord(dbConstants.dbSchema.roads, columnAndValue)
            let joinArr = [{
                $lookup: {
                    from: 'jobs',
                    localField: 'road_id',
                    foreignField: 'road_id',
                    as: 'jobDetails'
                }
            }, {
                $lookup: {
                    from: 'trucks',
                    localField: 'truck_id',
                    foreignField: 'truck_id',
                    as: 'truckDetails'
                }
            }, {
                "$unwind": {
                    "path": "$truckDetails",
                    "preserveNullAndEmptyArrays": true
                }
            }, {
                $lookup: {
                    from: 'drivers',
                    localField: 'driver_id',
                    foreignField: 'driver_id',
                    as: 'driverDetails'
                }
            }, {
                "$unwind": {
                    "path": "$driverDetails",
                    "preserveNullAndEmptyArrays": true
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
                    road_id: "$road_id",
                    prefix: "$prefix",
                    start_point: "$start_point",
                    end_point: "$end_point",
                    instance_id: "$instance_id",
                    status: "$status",
                    road_status: "$road_status",
                    truck: "$truckDetails",
                    driver: "$driverDetails",
                    jobs: "$jobDetails",
                }
            }];
            let data = await query.joinWithAnd(dbConstants.dbSchema.roads, joinArr);
            data = JSON.parse(JSON.stringify(data))
            _.each(data, (elem) => {
                if(!elem.truck) elem.truck = ''

                if(!elem.driver) elem.driver = '' 
                else elem.driver = elem.driver.first_name +' '+ elem.driver.last_name

                elem.total_jobs = elem.jobs.length
                let total_volume = 0;
                _.each(elem.jobs, (rec) => {
                    total_volume += rec.volume
                })
                elem.total_volume = total_volume    
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

const create = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.roads, {prefix: requestParam.prefix}, { _id: 0, road_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_RECORD_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            await query.insertSingle(dbConstants.dbSchema.roads, requestParam);
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
                road_id: { $ne: requestParam.road_id },
                prefix: requestParam.prefix
            };
            let response = await query.selectWithAndOne(dbConstants.dbSchema.roads, compareColumnAndValues, { _id: 0, road_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_RECORD_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            await query.updateSingle(dbConstants.dbSchema.roads, requestParam, {road_id: requestParam.road_id});
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const action = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            if (requestParam['type']=="delete") {
                await query.removeMultiple(dbConstants.dbSchema.roads, { road_id: { $in: requestParam['ids']}});
            }
            else{
                await query.updateMultiple(dbConstants.dbSchema.roads, {status: requestParam.type}, {road_id: { $in: requestParam['ids']}});
            }
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const roadAction = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            if (requestParam.type == 'cancelled') {
                await query.updateSingle(dbConstants.dbSchema.roads, {road_status: requestParam.type}, {road_id: requestParam.road_id});
            }
            else if(requestParam.type == 'completed'){
                let response = await query.selectWithAndOne(dbConstants.dbSchema.roads, {road_id: requestParam.road_id}, { _id: 0, road_id:1, road_status:1}, { created_at: 1 });
                if(response && response.road_status == 'started'){
                    await query.updateSingle(dbConstants.dbSchema.roads, {road_status: requestParam.type}, {road_id: requestParam.road_id});
                }
                else{
                    reject(errors(labels.LBL_CAN_NOT_COMPLETE_ROAD[config.default_language], responseCodes.ResourceNotFound));
                    return;
                }
            }
            else if(requestParam.type == 'started'){
                requestParam.road_status = requestParam.type
                await query.updateSingle(dbConstants.dbSchema.roads, requestParam, {road_id: requestParam.road_id});
            }
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

module.exports = {
    get,
    getSort,
    create,
    update,
    action,
    roadAction
};