'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const customer = require('./../models/customer');
const job = require('./../models/job');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const timeZone = require('moment-timezone');
const passwordHandler = require('./../utils/password-handler');
const imgHandler = require('./../model_handlers/image-handler');
const encryptDecryptHandler = require('./../model_handlers/encrypt-decrypt-handler');

const get = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnValue = {}
            if(requestParam.customer_id){
                columnValue.customer_id = requestParam.customer_id
            }
            if(requestParam.status){
                columnValue.status = requestParam.status
            }
            let response = await query.selectWithAnd(dbConstants.dbSchema.customers, columnValue, { _id: 0}, { created_at: 1 });
            if(requestParam.customer_id){
                response = response[0]
                response.profile_photo = response.profile_photo != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`simba-tracking/customers/${response.profile_photo}`}) : ''
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
                    customer_id: new RegExp(requestParam.text, 'i')
                }, {
                    first_name: new RegExp(requestParam.text, 'i')
                }, {
                    last_name: new RegExp(requestParam.text, 'i')
                }, {
                    email: new RegExp(requestParam.text, 'i')
                }, {
                    status: new RegExp(requestParam.text, 'i')
                }, {
                    mobile_country_code: new RegExp(requestParam.text, 'i')
                }, {
                    mobile: new RegExp(requestParam.text, 'i')
                }, {
                    business_name: new RegExp(requestParam.text, 'i')
                }, {
                    business_mobile_country_code: new RegExp(requestParam.text, 'i')
                }, {
                    business_mobile: new RegExp(requestParam.text, 'i')
                }, {
                    preferred_contact: new RegExp(requestParam.text, 'i')
                }];
            }
            let page = requestParam.page ? requestParam.page : 0 ;
            let sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10 ;
            let skip = page * sizePerPage;
            let obj = {};

            let count = await query.countRecord(dbConstants.dbSchema.customers, columnAndValue)
            let joinArr = [{
                $lookup: {
                    from: 'jobs',
                    localField: 'customer_id',
                    foreignField: 'customer_id',
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
                    customer_id: "$customer_id",
                    name: { $concat: [ "$first_name", " ", "$last_name" ] },
                    email: "$email",
                    mobile: { $concat: [ "$mobile_country_code", " ", "$mobile" ] },
                    business_mobile: { $concat: [ "$business_mobile_country_code", " ", "$business_mobile" ] },
                    business_name: "$business_name",
                    preferred_contact: "$preferred_contact",
                    created_at: "$created_at",
                    status: "$status",
                    total_jobs: { $size: "$jobDetails" },
                }
            }];
            let data = await query.joinWithAnd(dbConstants.dbSchema.customers, joinArr);
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
            let response = await query.selectWithAndOne(dbConstants.dbSchema.customers, compareColumnAndValues, { _id: 0, customer_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_EMAIL_OR_MOBILE_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            if(req.files && req.files.profile_photo){
                requestParam.profile_photo = await imgHandler.uploadImage(req.files.profile_photo, config.aws.s3.customerBucket)
            }
            requestParam.password = await passwordHandler.encrypt(requestParam.password.toString());
            await query.insertSingle(dbConstants.dbSchema.customers, requestParam);
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
                    customer_id: {
                        $ne: requestParam.customer_id
                    }
                }]
            };
            let response = await query.selectWithAndOne(dbConstants.dbSchema.customers, compareColumnAndValues, { _id: 0, customer_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_EMAIL_OR_MOBILE_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let res = await query.selectWithAndOne(dbConstants.dbSchema.customers, {customer_id: requestParam.customer_id}, { _id: 0}, { created_at: 1 });
            if (requestParam.change_profile_photo) {
                const objects = [{
                    Key: `simba-tracking/customers/${res.profile_photo}`
                }];
                await imgHandler.deleteImage(objects, config.aws.bucketName)
                requestParam.profile_photo = await imgHandler.uploadImage(req.files.profile_photo, config.aws.s3.customerBucket)
            }
            else{
                delete requestParam.profile_photo
            }

            await query.updateSingle(dbConstants.dbSchema.customers, requestParam, {customer_id: requestParam.customer_id});
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
                await query.removeMultiple(dbConstants.dbSchema.customers, { customer_id: { $in: requestParam['ids']}});
            }
            else{
                await query.updateMultiple(dbConstants.dbSchema.customers, {status: requestParam.type}, {customer_id: { $in: requestParam['ids']}});
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
            let response = await query.selectWithAnd(dbConstants.dbSchema.customers, {customer_id: {$in: requestParam.ids}}, { _id: 0, customer_id:1, profile_photo:1}, { created_at: 1 });
            let objects = []
            await Promise.all(response.map(async (elem) => {
                objects.push({Key: `simba-tracking/customers/${elem.profile_photo}`})
            }))
            await imgHandler.deleteImage(objects, config.aws.bucketName)
            resolve({});
            return;
        } catch (error) {
            return false;
        }
    })
};

// FOR MOBILE APIs

const signin = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            requestParam.email = requestParam.email.trim();
            let response = await query.selectWithAndOne(dbConstants.dbSchema.customers, {email:requestParam.email}, { _id:0, customer_id: 1, password:1, name:1, email:1, status:1} );
            if(!response){
                reject(errors(labels.LBL_EMAIL_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            response = JSON.parse(JSON.stringify(response))
            if(response.status == 'inactive'){
                reject(errors(labels.LBL_ACCOUNT_INACTIVE[config.default_language], responseCodes.NotActive));
                return;
            }
            let encryptPassword = await passwordHandler.encrypt(requestParam.password.toString());
            if(encryptPassword != response.password){
                reject(errors(labels.LBL_INVALID_PWD[config.default_language], responseCodes.InvalidOTP));
                return;
            }
            resolve(profile({customer_id: response.customer_id}));
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const forgot = async(requestParam, req) => {
    return new Promise(async(resolve, reject) => {
        try {
            let fullUrl = req.protocol + '://' + req.get('host');
            requestParam.email = requestParam.email.trim();
            let response = await query.selectWithAndOne(dbConstants.dbSchema.customers, {email:requestParam.email}, { _id:0, customer_id: 1, last_name:1, first_name:1, email:1, status:1} );
            if(!response){
                reject(errors(labels.LBL_EMAIL_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            const code = 'CUS'+Math.round((Math.pow(36, 6 + 1) - Math.random() * Math.pow(36, 6))).toString(36).slice(1);
            let template = await query.selectWithAndOne(dbConstants.dbSchema.email_templates, {code: 'CUS_DRI_FPWD'}, { _id: 0}, { created_at: 1 });
            if(template){
                let emailTemplate = template.description;
                emailTemplate = emailTemplate.replace("#NAME#", response.first_name+' '+response.last_name);
                emailTemplate = emailTemplate.replace("#LINK#", config.backoffice_url+'/#/reset?code='+code);
                emailTemplate = emailTemplate.replace("#LOGO#", fullUrl + '/img/logo.png');
                setupEmail({
                    to_email: [requestParam.email],
                    from_email: template.from_name + ' <' + template.from_email + '>',
                    subject: template.email_subject,
                    description: emailTemplate
                });
            }
            await query.updateSingle(dbConstants.dbSchema.customers, {reset_code:code}, {customer_id: response.customer_id});
            resolve(await encryptDecryptHandler.encrypt({}));
            return;
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const signup = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            if(requestParam.first_name){
                requestParam.first_name = await encryptDecryptHandler.decryptString(requestParam.first_name)
            }
            if(requestParam.last_name){
                requestParam.last_name = await encryptDecryptHandler.decryptString(requestParam.last_name)
            }
            if(requestParam.email){
                requestParam.email = await encryptDecryptHandler.decryptString(requestParam.email)
            }
            if(requestParam.password){
                requestParam.password = await encryptDecryptHandler.decryptString(requestParam.password)
            }
            if(requestParam.mobile_country_code){
                requestParam.mobile_country_code = await encryptDecryptHandler.decryptString(requestParam.mobile_country_code)
            }
            if(requestParam.mobile){
                requestParam.mobile = await encryptDecryptHandler.decryptString(requestParam.mobile)
            }

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
            let response = await query.selectWithAndOne(dbConstants.dbSchema.customers, compareColumnAndValues, { _id: 0, customer_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_EMAIL_OR_MOBILE_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            if(req.files && req.files.profile_photo){
                requestParam.profile_photo = await imgHandler.uploadImage(req.files.profile_photo, config.aws.s3.customerBucket)
            }
            requestParam.password = await passwordHandler.encrypt(requestParam.password.toString());
            let res = await query.insertSingle(dbConstants.dbSchema.customers, requestParam);
            resolve(profile({customer_id: res.customer_id}));
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const profile = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.customers, {customer_id:requestParam.customer_id}, { _id:0, customer_id: 1, first_name:1, last_name:1, mobile_country_code:1, mobile:1, email:1, profile_photo:1, business_name:1, business_mobile_country_code:1, business_mobile:1, preferred_contact:1, status:1} );
            if(!response){
                reject(errors(labels.LBL_EMAIL_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            response = JSON.parse(JSON.stringify(response))
            if(response.status == 'inactive'){
                reject(errors(labels.LBL_ACCOUNT_INACTIVE[config.default_language], responseCodes.NotActive));
                return;
            }
            response.profile_photo = response.profile_photo != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`simba-tracking/customers/${response.profile_photo}`}) : ''
            resolve(await encryptDecryptHandler.encrypt(response));
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
    removeImages,

    signin,
    forgot,
    signup,
    profile,
};