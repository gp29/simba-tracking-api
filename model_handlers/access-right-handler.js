'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');

const get = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnValue = {}
            if(requestParam.role_id){
                columnValue.role_id = requestParam.role_id
            }
            let response = await query.selectWithAndOne(dbConstants.dbSchema.access_rights, columnValue, { _id: 0}, { created_at: 1 });
            resolve(response);
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const submit = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            await query.updateSingle(dbConstants.dbSchema.access_rights, {module: requestParam.access_rights}, {role_id: requestParam.role_id});
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
   submit
};