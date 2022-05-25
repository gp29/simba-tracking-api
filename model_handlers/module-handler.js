'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const modules = require('./../models/module');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const timeZone = require('moment-timezone');

const get = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnValue = {}
            if(requestParam.module_id){
                columnValue.module_id = requestParam.module_id
            }
            let response = await query.selectWithAnd(dbConstants.dbSchema.modules, columnValue, { _id: 0}, { created_at: 1 });
            if(requestParam.module_id){
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
                    module_id: new RegExp(requestParam.text, 'i')
                }, {
                    title: new RegExp(requestParam.text, 'i')
                }, {
                    path: new RegExp(requestParam.text, 'i')
                }, {
                    order_no: new RegExp(requestParam.text, 'i')
                }];
            }
            let page = requestParam.page ? requestParam.page : 0 ;
            let sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10 ;
            let skip = page * sizePerPage;
            let obj = {};

            let count = await query.countRecord(dbConstants.dbSchema.modules, columnAndValue)
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
            let data = await query.joinWithAnd(dbConstants.dbSchema.modules, joinArr);
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
            let response = await query.selectWithAndOne(dbConstants.dbSchema.modules, {title: requestParam.title}, { _id: 0, module_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_RECORD_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            await query.insertSingle(dbConstants.dbSchema.modules, requestParam);
            accessRightInsert(requestParam);
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
                module_id: { $ne: requestParam.module_id },
                title: requestParam.title
            };
            let response = await query.selectWithAndOne(dbConstants.dbSchema.modules, compareColumnAndValues, { _id: 0, module_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_RECORD_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            await query.updateSingle(dbConstants.dbSchema.modules, requestParam, {module_id: requestParam.module_id});
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
                await query.removeMultiple(dbConstants.dbSchema.modules, { module_id: { $in: requestParam['ids']}});
            }
            else{
                await query.updateMultiple(dbConstants.dbSchema.modules, {status: requestParam.type}, {module_id: { $in: requestParam['ids']}});
            }
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const accessRightInsert = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAnd(dbConstants.dbSchema.access_rights, {}, { _id: 0}, {});
            response = JSON.parse(JSON.stringify(response))
            let obj = {
                is_view: true,
                is_add: true,
                is_edit: true,
                is_delete: true,
            };
            await Promise.all(response.map(async (elem) => {
                elem.module[requestParam.title] = obj;
                await query.updateSingle(dbConstants.dbSchema.access_rights, elem, {access_right_id: elem.access_right_id});
            }))
            return false;
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