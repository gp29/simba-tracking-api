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
const moment = require('moment');
const timeZone = require('moment-timezone');
const passwordHandler = require('./../utils/password-handler');
const imgHandler = require('./../model_handlers/image-handler');
const encryptDecryptHandler = require('./../model_handlers/encrypt-decrypt-handler');
const authHandler = require('./../model_handlers/auth-handler');
const distance = require('google-distance');
distance.apiKey = config.google_key;

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
            requestParam.email = requestParam.email.toLowerCase();
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
            requestParam.email = requestParam.email.toLowerCase();
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
            requestParam.email = requestParam.email.toLowerCase();
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
            if(requestParam.device_token){
                await query.updateSingle(dbConstants.dbSchema.customers, {device_token: requestParam.device_token}, {customer_id: requestParam.customer_id});
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
            requestParam.email = requestParam.email.toLowerCase();
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
                authHandler.setupEmail({
                    to_email: [requestParam.email],
                    from_email: template.from_name + ' <' + template.from_email + '>',
                    subject: template.email_subject,
                    description: emailTemplate
                });
            }
            await query.updateSingle(dbConstants.dbSchema.customers, {reset_code:code}, {customer_id: response.customer_id});
            resolve(await encryptDecryptHandler.encrypt({link: config.backoffice_url+'/#/reset?code='+code}));
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const signup = async(requestParam, req) => {
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
            requestParam.email = requestParam.email.toLowerCase();
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
            console.log(error)
            reject(error)
            return
        }
    })
};

const updateProfile = async(requestParam, req) => {
    return new Promise(async(resolve, reject) => {
        try {
            if(requestParam.customer_id){
                requestParam.customer_id = await encryptDecryptHandler.decryptString(requestParam.customer_id)
            }
            if(requestParam.first_name){
                requestParam.first_name = await encryptDecryptHandler.decryptString(requestParam.first_name)
            }
            if(requestParam.last_name){
                requestParam.last_name = await encryptDecryptHandler.decryptString(requestParam.last_name)
            }
            if(requestParam.email){
                requestParam.email = await encryptDecryptHandler.decryptString(requestParam.email)
            }
            if(requestParam.business_name){
                requestParam.business_name = await encryptDecryptHandler.decryptString(requestParam.business_name)
            }
            if(requestParam.business_mobile_country_code){
                requestParam.business_mobile_country_code = await encryptDecryptHandler.decryptString(requestParam.business_mobile_country_code)
            }
            if(requestParam.business_mobile){
                requestParam.business_mobile = await encryptDecryptHandler.decryptString(requestParam.business_mobile)
            }
            if(requestParam.preferred_contact){
                requestParam.preferred_contact = await encryptDecryptHandler.decryptString(requestParam.preferred_contact)
            }
            if(requestParam.customer_type){
                requestParam.customer_type = await encryptDecryptHandler.decryptString(requestParam.customer_type)
            }

            let response = await query.selectWithAndOne(dbConstants.dbSchema.customers, {customer_id:requestParam.customer_id}, { _id:0, customer_id: 1, profile_photo:1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }

            if(requestParam.email){
                requestParam.email = requestParam.email.toLowerCase();
                requestParam.email = requestParam.email.trim();
                let regexEmail = new RegExp(['^', requestParam.email, '$'].join(''), 'i');
                let compareColumnAndValues = {
                    email: regexEmail,
                    customer_id: {$ne: requestParam.customer_id}
                };
                let exists = await query.selectWithAndOne(dbConstants.dbSchema.customers, compareColumnAndValues, { _id: 0, customer_id:1}, { created_at: 1 });
                if(exists){
                    reject(errors(labels.LBL_EMAIL_OR_MOBILE_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                    return;
                }
            }
            if(req.files && req.files.profile_photo){
                const objects = [{
                    Key: `simba-tracking/customers/${response.profile_photo}`
                }];
                await imgHandler.deleteImage(objects, config.aws.bucketName)
                requestParam.profile_photo = await imgHandler.uploadImage(req.files.profile_photo, config.aws.s3.customerBucket)
            }

            await query.updateSingle(dbConstants.dbSchema.customers, requestParam, {customer_id: requestParam.customer_id});
            resolve(profile({customer_id: requestParam.customer_id}));
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const profile = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.customers, {customer_id:requestParam.customer_id}, { _id:0, customer_id: 1, first_name:1, last_name:1, mobile_country_code:1, mobile:1, email:1, profile_photo:1, business_name:1, business_mobile_country_code:1, business_mobile:1, preferred_contact:1, status:1, customer_type:1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
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

const changePassword = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.customers, {customer_id:requestParam.customer_id}, { _id:0, customer_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            requestParam.password = await passwordHandler.encrypt(requestParam.password.toString());
            await query.updateSingle(dbConstants.dbSchema.customers, requestParam, {customer_id: requestParam.customer_id});
            resolve(await encryptDecryptHandler.encrypt({}));
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const logout = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.customers, {customer_id:requestParam.customer_id}, { _id:0, customer_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            await query.updateSingle(dbConstants.dbSchema.customers, {device_token:''}, {customer_id: requestParam.customer_id});
            resolve(await encryptDecryptHandler.encrypt({}));
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const createJob = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.customers, {customer_id:requestParam.customer_id}, { _id:0, customer_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            //requestParam.pickup_from = timeZone(new Date(requestParam.pickup_from)).tz('UTC')
            if(requestParam.items) {
                requestParam.items = JSON.parse(requestParam.items)
                _.each(requestParam.items, (elem) => {
                    elem.device_id = ''
                })
            }
            distance.get(
            {
                index: 1,
                origin: ''+requestParam.pickup_latitude+','+requestParam.pickup_longitude+'',
                destination: ''+requestParam.delivery_latitude+','+requestParam.delivery_longitude+''
            },
            async function(err, data) {
                if (err){
                    requestParam.total_distance = 0
                    requestParam.total_duration = 0
                    requestParam.formatted_distance = ''
                    requestParam.formatted_duration = ''
                }else{
                    requestParam.total_distance = data.distanceValue
                    requestParam.total_duration = data.durationValue
                    requestParam.formatted_distance = data.distance
                    requestParam.formatted_duration = data.duration
                }
                await query.insertSingle(dbConstants.dbSchema.jobs, requestParam);
                resolve(await encryptDecryptHandler.encrypt({}));
                return;
            });
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const updateJob = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.customers, {customer_id:requestParam.customer_id}, { _id:0, customer_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let job = await query.selectWithAndOne(dbConstants.dbSchema.jobs, {job_id:requestParam.job_id}, { _id:0, job_id: 1} );
            if(!job){
                reject(errors(labels.LBL_JOB_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            requestParam.pickup_from = timeZone(new Date(requestParam.pickup_from)).tz('UTC')
            if(requestParam.items) {
                requestParam.items = JSON.parse(requestParam.items)
                _.each(requestParam.items, (elem) => {
                    elem.device_id = ''
                })
            }
            distance.get(
            {
                index: 1,
                origin: ''+requestParam.pickup_latitude+','+requestParam.pickup_longitude+'',
                destination: ''+requestParam.delivery_latitude+','+requestParam.delivery_longitude+''
            },
            async function(err, data) {
                if (err){
                    requestParam.total_distance = 0
                    requestParam.total_duration = 0
                    requestParam.formatted_distance = ''
                    requestParam.formatted_duration = ''
                }else{
                    requestParam.total_distance = data.distanceValue
                    requestParam.total_duration = data.durationValue
                    requestParam.formatted_distance = data.distance
                    requestParam.formatted_duration = data.duration
                }
                await query.updateSingle(dbConstants.dbSchema.jobs, requestParam, {job_id: requestParam.job_id});
                resolve(await encryptDecryptHandler.encrypt({}));
                return;
            });
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const currentDelivery = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.customers, {customer_id:requestParam.customer_id}, { _id:0, customer_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let joinArr = [{
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
                    as: 'catDetails',
                },
            }, {
                $unwind: "$catDetails"
            }, { 
                $match : {customer_id: requestParam.customer_id, status:{$nin: ['cancelled', 'delivered']}}
            }, { 
                $sort : {created_at:-1}
            }, {
                $project: {
                    _id: 0,
                    customer_id: 1,
                    job_id: 1,
                    truck_id: 1,
                    delivery_category_id: 1,
                    pickup_from: 1,
                    pickup_landmark: 1,
                    pickup_address: 1,
                    pickup_latitude: 1,
                    pickup_longitude: 1,
                    delivery_landmark: 1,
                    delivery_address: 1,
                    delivery_latitude: 1,
                    delivery_longitude: 1,
                    pickup_contact_name: 1,
                    pickup_contact_number: 1,
                    pickup_instructions: 1,
                    items: 1,
                    pickedup_at: 1,
                    delivered_at: 1,
                    is_customer_rated: 1,
                    rating: 1,
                    status: 1,
                    truck_name:"$truckDetails.title",
                    delivery_category_name:"$catDetails.title",
                    delivery_category_code:"$catDetails.code",
                }
            }];
            let lists = await query.joinWithAnd(dbConstants.dbSchema.jobs, joinArr);
            lists = JSON.parse(JSON.stringify(lists))
            await Promise.all(lists.map(async (elem) => {
                elem.deliver_date = ''
                elem.deliver_time = ''
                let dt;
                if(elem.delivery_category_code == '2H'){
                    dt = moment(new Date(elem.pickup_from)).add(2, 'hours');
                }
                if(elem.delivery_category_code == '4H'){
                    dt = moment(new Date(elem.pickup_from)).add(4, 'hours');
                }
                if(elem.delivery_category_code == 'SAME_WEEK'){
                    dt = moment().endOf('week')
                }
                elem.deliver_date = timeZone(new Date(dt)).tz(requestParam.time_zone).format('YYYY-MM-DD')
                elem.deliver_time = timeZone(new Date(dt)).tz(requestParam.time_zone).format('LT')

                elem.pickup_from = timeZone(new Date(elem.pickup_from)).tz(requestParam.time_zone).format('DD MMM yyyy h:mm a')
                elem.pickedup_at = elem.pickedup_at ? timeZone(new Date(elem.pickedup_at)).tz(requestParam.time_zone).format('lll') : ''

                delete elem.delivery_category_code
            }))
            resolve(await encryptDecryptHandler.encrypt(lists));
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const deliveryHistory = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.customers, {customer_id:requestParam.customer_id}, { _id:0, customer_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let joinArr = [{
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
                    as: 'catDetails',
                },
            }, {
                $unwind: "$catDetails"
            }, { 
                $match : {customer_id: requestParam.customer_id, status:{$in: ['cancelled', 'delivered']}}
            }, { 
                $sort : {created_at:-1}
            }, {
                $project: {
                    _id: 0,
                    customer_id: 1,
                    job_id: 1,
                    truck_id: 1,
                    delivery_category_id: 1,
                    pickup_from: 1,
                    pickup_landmark: 1,
                    pickup_address: 1,
                    pickup_latitude: 1,
                    pickup_longitude: 1,
                    delivery_landmark: 1,
                    delivery_address: 1,
                    delivery_latitude: 1,
                    delivery_longitude: 1,
                    pickup_contact_name: 1,
                    pickup_contact_number: 1,
                    pickup_instructions: 1,
                    items: 1,
                    pickedup_at: 1,
                    delivered_at: 1,
                    is_customer_rated: 1,
                    rating: 1,
                    status: 1,
                    truck_name:"$truckDetails.title",
                    delivery_category_name:"$catDetails.title",
                }
            }];
            let lists = await query.joinWithAnd(dbConstants.dbSchema.jobs, joinArr);
            lists = JSON.parse(JSON.stringify(lists))
            await Promise.all(lists.map(async (elem) => {
                if(elem.status == 'cancelled'){
                    elem.delivered_at = elem.pickup_from
                }
                elem.deliver_date = timeZone(new Date(elem.delivered_at)).tz(requestParam.time_zone).format('YYYY-MM-DD')
                elem.deliver_time = timeZone(new Date(elem.delivered_at)).tz(requestParam.time_zone).format('LT')

                elem.pickedup_at = elem.pickedup_at ? timeZone(new Date(elem.pickedup_at)).tz(requestParam.time_zone).format('lll') : ''
                elem.pickup_from = timeZone(new Date(elem.pickup_from)).tz(requestParam.time_zone).format('DD MMM yyyy h:mm a')
            }))
            resolve(await encryptDecryptHandler.encrypt(lists));
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const rateJob = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.customers, {customer_id:requestParam.customer_id}, { _id:0, customer_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let job = await query.selectWithAndOne(dbConstants.dbSchema.jobs, {job_id:requestParam.job_id}, { _id:0, job_id: 1} );
            if(!job){
                reject(errors(labels.LBL_JOB_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            requestParam.rating = parseFloat(requestParam.rating).toFixed(1)
            let obj = {rating: requestParam.rating, date: new Date()}
            if(requestParam.comment){
                obj.comment = requestParam.comment
            }
            await query.updateSingle(dbConstants.dbSchema.jobs, {rating: obj, is_customer_rated:true}, {job_id: requestParam.job_id});
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
    create,
    update,
    action,
    removeImages,

    signin,
    forgot,
    signup,
    profile,
    changePassword,
    updateProfile,
    logout,
    createJob,
    updateJob,
    currentDelivery,
    deliveryHistory,
    rateJob,
};