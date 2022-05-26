'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const truck = require('./../models/truck');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const timeZone = require('moment-timezone');

const get = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnValue = {}
            if(requestParam.truck_id){
                columnValue.truck_id = requestParam.truck_id
            }
            if(requestParam.status){
                columnValue.status = requestParam.status
            }
            let response = await query.selectWithAnd(dbConstants.dbSchema.trucks, columnValue, { _id: 0}, { created_at: 1 });
            if(requestParam.truck_id){
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
                    truck_id: new RegExp(requestParam.text, 'i')
                }, {
                    title: new RegExp(requestParam.text, 'i')
                }, {
                    volume: new RegExp(requestParam.text, 'i')
                }, {
                    description: new RegExp(requestParam.text, 'i')
                }, {
                    registration_no: new RegExp(requestParam.text, 'i')
                }, {
                    weight: new RegExp(requestParam.text, 'i')
                }, {
                    assurance: new RegExp(requestParam.text, 'i')
                }, {
                    next_maintenance_date: new RegExp(requestParam.text, 'i')
                }, {
                    status: new RegExp(requestParam.text, 'i')
                }];
            }
            let page = requestParam.page ? requestParam.page : 0 ;
            let sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10 ;
            let skip = page * sizePerPage;
            let obj = {};

            let count = await query.countRecord(dbConstants.dbSchema.trucks, columnAndValue)
            let joinArr = [{ 
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
                }
            }];
            let data = await query.joinWithAnd(dbConstants.dbSchema.trucks, joinArr);
            data = JSON.parse(JSON.stringify(data))
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
            let response = await query.selectWithAndOne(dbConstants.dbSchema.trucks, {title: requestParam.title}, { _id: 0, truck_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_RECORD_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            requestParam.registration_date = timeZone(new Date(requestParam.registration_date)).tz(requestParam.time_zone).format('YYYY-MM-DD')
            requestParam.insurance_date = timeZone(new Date(requestParam.insurance_date)).tz(requestParam.time_zone).format('YYYY-MM-DD')
            requestParam.maintenance_date = timeZone(new Date(requestParam.maintenance_date)).tz(requestParam.time_zone).format('YYYY-MM-DD')
            requestParam.next_maintenance_date = timeZone(new Date(requestParam.next_maintenance_date)).tz(requestParam.time_zone).format('YYYY-MM-DD')
            await query.insertSingle(dbConstants.dbSchema.trucks, requestParam);
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
                truck_id: { $ne: requestParam.truck_id },
                title: requestParam.title
            };
            let response = await query.selectWithAndOne(dbConstants.dbSchema.trucks, compareColumnAndValues, { _id: 0, truck_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_RECORD_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            requestParam.registration_date = timeZone(new Date(requestParam.registration_date)).tz(requestParam.time_zone).format('YYYY-MM-DD')
            requestParam.insurance_date = timeZone(new Date(requestParam.insurance_date)).tz(requestParam.time_zone).format('YYYY-MM-DD')
            requestParam.maintenance_date = timeZone(new Date(requestParam.maintenance_date)).tz(requestParam.time_zone).format('YYYY-MM-DD')
            requestParam.next_maintenance_date = timeZone(new Date(requestParam.next_maintenance_date)).tz(requestParam.time_zone).format('YYYY-MM-DD')
            await query.updateSingle(dbConstants.dbSchema.trucks, requestParam, {truck_id: requestParam.truck_id});
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
            if (requestParam['type']== "delete") {
                await query.removeMultiple(dbConstants.dbSchema.trucks, { truck_id: { $in: requestParam['ids']}});
            }
            else{
                await query.updateMultiple(dbConstants.dbSchema.trucks, {status: requestParam.type}, {truck_id: { $in: requestParam['ids']}});
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
};