'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const enterprise = require('./../models/enterprise');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const timeZone = require('moment-timezone');
const passwordHandler = require('./../utils/password-handler');
const imgHandler = require('./../model_handlers/image-handler');

const get = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnValue = {}
            if(requestParam.enterprise_id){
                columnValue.enterprise_id = requestParam.enterprise_id
            }
            if(requestParam.status){
                columnValue.status = requestParam.status
            }
            let response = await query.selectWithAnd(dbConstants.dbSchema.enterprises, columnValue, { _id: 0}, { created_at: 1 });
            if(requestParam.enterprise_id){
                response = response[0]
                response.registration_doc = response.registration_doc != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`simba-tracking/enterprises/${response.registration_doc}`}) : ''
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
                    enterprise_id: new RegExp(requestParam.text, 'i')
                }, {
                    company_name: new RegExp(requestParam.text, 'i')
                }, {
                    company_details: new RegExp(requestParam.text, 'i')
                }, {
                    email: new RegExp(requestParam.text, 'i')
                }, {
                    status: new RegExp(requestParam.text, 'i')
                }, {
                    mobile_country_code: new RegExp(requestParam.text, 'i')
                }, {
                    mobile: new RegExp(requestParam.text, 'i')
                }, {
                    key_person_name: new RegExp(requestParam.text, 'i')
                }, {
                    city: new RegExp(requestParam.text, 'i')
                }, {
                    country: new RegExp(requestParam.text, 'i')
                }];
            }
            let page = requestParam.page ? requestParam.page : 0 ;
            let sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10 ;
            let skip = page * sizePerPage;
            let obj = {};

            let count = await query.countRecord(dbConstants.dbSchema.enterprises, columnAndValue)
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
                    enterprise_id: "$enterprise_id",
                    company_name: "$company_name",
                    company_details: "$company_details",
                    mobile: { $concat: [ "$mobile_country_code", " ", "$mobile" ] },
                    email: "$email",
                    key_person_name: "$key_person_name",
                    city: "$city",
                    country: "$country",
                    created_at: "$created_at",
                    status: "$status",
                }
            }];
            let data = await query.joinWithAnd(dbConstants.dbSchema.enterprises, joinArr);
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
            requestParam.email = requestParam.email.trim();
            let regexEmail = new RegExp(['^', requestParam.email, '$'].join(''), 'i');
            let compareColumnAndValues = {
                $or: [{
                    email: regexEmail
                }, {
                    mobile: requestParam.mobile,
                    mobile_country_code: requestParam.mobile_country_code,
                }]
            };
            let response = await query.selectWithAndOne(dbConstants.dbSchema.enterprises, compareColumnAndValues, { _id: 0, enterprise_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_EMAIL_OR_MOBILE_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            if(req.files && req.files.registration_doc){
                requestParam.registration_doc = await imgHandler.uploadImage(req.files.registration_doc, config.aws.s3.enterpriseBucket)
            }
            requestParam.password = await passwordHandler.encrypt(requestParam.password.toString());

            let res = await query.insertSingle(dbConstants.dbSchema.enterprises, requestParam);

            // for instance create
            const today = new Date()
            const monthDt = new Date(today)
            monthDt.setDate(monthDt.getDate() + 30)
            let obj = {
                enterprise_id: res.enterprise_id,
                quantity: '1',
                rented_day: '1_month',
                start_date: today,
                end_date: monthDt,
                status:'active'
            }
            await query.insertSingle(dbConstants.dbSchema.instances, obj);
            // for instance create

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
            requestParam.email = requestParam.email.trim();
            let regexEmail = new RegExp(['^', requestParam.email, '$'].join(''), 'i');
            let compareColumnAndValues = {
                $and: [{
                    $or: [{
                        email: regexEmail
                    }, {
                        mobile: requestParam.mobile,
                        mobile_country_code: requestParam.mobile_country_code,
                    }]
                }, {
                    enterprise_id: {
                        $ne: requestParam.enterprise_id
                    }
                }]
            };
            let response = await query.selectWithAndOne(dbConstants.dbSchema.enterprises, compareColumnAndValues, { _id: 0, enterprise_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_EMAIL_OR_MOBILE_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let res = await query.selectWithAndOne(dbConstants.dbSchema.enterprises, {enterprise_id: requestParam.enterprise_id}, { _id: 0}, { created_at: 1 });
            if (requestParam.change_registration_doc) {
                const objects = [{
                    Key: `simba-tracking/enterprises/${res.registration_doc}`
                }];
                await imgHandler.deleteImage(objects, config.aws.bucketName)
                requestParam.registration_doc = await imgHandler.uploadImage(req.files.registration_doc, config.aws.s3.enterpriseBucket)
            }
            else{
                delete requestParam.registration_doc
            }

            await query.updateSingle(dbConstants.dbSchema.enterprises, requestParam, {enterprise_id: requestParam.enterprise_id});
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
                await removeImages(requestParam)
                await query.removeMultiple(dbConstants.dbSchema.enterprises, { enterprise_id: { $in: requestParam['ids']}});
                await query.removeMultiple(dbConstants.dbSchema.instances, { enterprise_id: { $in: requestParam['ids']}});
            }
            else{
                await query.updateMultiple(dbConstants.dbSchema.enterprises, {status: requestParam.type}, {enterprise_id: { $in: requestParam['ids']}});
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
            let response = await query.selectWithAnd(dbConstants.dbSchema.enterprises, {enterprise_id: {$in: requestParam.ids}}, { _id: 0, enterprise_id:1, registration_doc:1}, { created_at: 1 });
            let objects = []
            await Promise.all(response.map(async (elem) => {
                objects.push({Key: `simba-tracking/enterprises/${elem.registration_doc}`})
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