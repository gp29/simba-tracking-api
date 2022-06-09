'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const settings = require('./../models/settings');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const timeZone = require('moment-timezone');
const encryptDecryptHandler = require('./../model_handlers/encrypt-decrypt-handler');

const get = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.settings, {}, { _id: 0}, { created_at: 1 });
            if(!response){
                resolve({});
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

const update = async(requestParam, req) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.settings, {}, { _id: 0}, { created_at: 1 });
            if(response){
                await query.updateSingle(dbConstants.dbSchema.settings, requestParam, {settings_id: response.settings_id});
            }
            else{
                await query.insertSingle(dbConstants.dbSchema.settings, requestParam);
            }
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const getCms = async(requestParam, req) => {
    return new Promise(async(resolve, reject) => {
        try {
            let fullUrl = req.protocol + '://' + req.get('host');
            let obj = {
                privacy_policy: fullUrl + '/cms/privacy-policy.html',
                term_condition: fullUrl + '/cms/term-condition.html',
                help: fullUrl + '/cms/help.html',
            }
            resolve(await encryptDecryptHandler.encrypt(obj));
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const getSettings = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.settings, {}, { _id: 0, fb_url:1, twitter_url:1, instagram_url:1, linkedin_url:1, youtube_url:1, call_us:1, sos_number:1, support_email:1, company_address:1}, { created_at: 1 });
            resolve(await encryptDecryptHandler.encrypt(response ? response : {}));
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
    update,
    getCms,
    getSettings
};