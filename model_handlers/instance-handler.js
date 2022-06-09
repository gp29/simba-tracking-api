'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const instance = require('./../models/instance');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const timeZone = require('moment-timezone');
const imgHandler = require('./../model_handlers/image-handler');
const passwordHandler = require('./../utils/password-handler');

const get = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnValue = {}
            if(requestParam.instance_id){
                columnValue.instance_id = requestParam.instance_id
            }
            if(requestParam.status){
                columnValue.status = requestParam.status
            }
            let response = await query.selectWithAnd(dbConstants.dbSchema.instances, columnValue, { _id: 0}, { created_at: 1 });
            if(requestParam.instance_id){
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
                    instance_id: new RegExp(requestParam.text, 'i')
                }, {
                    'entDetails.company_name': new RegExp(requestParam.text, 'i')
                }, {
                    'entDetails.email': new RegExp(requestParam.text, 'i')
                }, {
                    rented_day: new RegExp(requestParam.text, 'i')
                }, {
                    quantity: new RegExp(requestParam.text, 'i')
                }, {
                    status: new RegExp(requestParam.text, 'i')
                }];
            }
            let page = requestParam.page ? requestParam.page : 0 ;
            let sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10 ;
            let skip = page * sizePerPage;
            let obj = {};

            let count = await query.countRecord(dbConstants.dbSchema.instances, columnAndValue)
            let joinArr = [{
                $lookup: {
                    from: 'enterprises',
                    localField: 'enterprise_id',
                    foreignField: 'enterprise_id',
                    as: 'entDetails'
                }
            }, {
                $unwind: "$entDetails"
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
                    instance_id: "$instance_id",
                    enterprise_email: "$entDetails.email",
                    enterprise_name: "$entDetails.company_name",
                    rented_day: "$rented_day",
                    quantity: "$quantity",
                    start_date: "$start_date",
                    end_date: "$end_date",
                    status: "$status",
                }
            }];
            let data = await query.joinWithAnd(dbConstants.dbSchema.instances, joinArr);
            data = JSON.parse(JSON.stringify(data))
            _.each(data, (elem) => {
                elem.start_date = timeZone(new Date(elem.start_date)).tz(requestParam.time_zone).format('lll')
                elem.end_date = timeZone(new Date(elem.end_date)).tz(requestParam.time_zone).format('lll')
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
            let days = 0
            const today = new Date()
            const endDt = new Date(today)
            if(requestParam.rented_day == '1_month'){
                endDt.setDate(endDt.getDate() + 30)
            }
            if(requestParam.rented_day == '3_month'){
                endDt.setDate(endDt.getDate() + 90)
            }
            if(requestParam.rented_day == '6_month'){
                endDt.setDate(endDt.getDate() + 180)
            }
            if(requestParam.rented_day == '1_year'){
                endDt.setFullYear(endDt.getFullYear() + 1);
            }
            requestParam.start_date = today
            requestParam.end_date = endDt
            requestParam.password = await passwordHandler.encrypt(requestParam.password.toString());
            await query.insertSingle(dbConstants.dbSchema.instances, requestParam);
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
            let response = await query.selectWithAndOne(dbConstants.dbSchema.instances, {instance_id: requestParam.instance_id}, { _id: 0}, { created_at: 1 });

            let days = 0
            const today = new Date(response.start_date)
            const endDt = new Date(today)
            if(requestParam.rented_day == '1_month'){
                endDt.setDate(endDt.getDate() + 30)
            }
            if(requestParam.rented_day == '3_month'){
                endDt.setDate(endDt.getDate() + 90)
            }
            if(requestParam.rented_day == '6_month'){
                endDt.setDate(endDt.getDate() + 180)
            }
            if(requestParam.rented_day == '1_year'){
                endDt.setFullYear(endDt.getFullYear() + 1);
            }
            requestParam.start_date = today
            requestParam.end_date = endDt
            await query.updateSingle(dbConstants.dbSchema.instances, requestParam, {instance_id: requestParam.instance_id});
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
                await query.removeMultiple(dbConstants.dbSchema.instances, { instance_id: { $in: requestParam['ids']}});
            }
            else{
                await query.updateMultiple(dbConstants.dbSchema.instances, {status: requestParam.type}, {instance_id: { $in: requestParam['ids']}});
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