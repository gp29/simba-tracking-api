'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const driver = require('./../models/driver');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const moment = require('moment');
const timeZone = require('moment-timezone');
const imgHandler = require('./../model_handlers/image-handler');
const passwordHandler = require('./../utils/password-handler');
const encryptDecryptHandler = require('./../model_handlers/encrypt-decrypt-handler');

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

const driverLists = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnValue = {}
            if(requestParam.instance_id){
                columnValue.instance_id = requestParam.instance_id
            }
            if(requestParam.status){
                columnValue.status = requestParam.status
            }
            let response = await query.selectWithAnd(dbConstants.dbSchema.drivers, columnValue, { _id: 0}, { created_at: 1 });
            resolve(response);
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

// APIs

const checkDriver = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let instance = await query.selectWithAndOne(dbConstants.dbSchema.instances, {instance_id:requestParam.instance_id}, { _id:0, instance_id: 1, username:1, password:1} );
            if(!instance){
                reject(errors(labels.LBL_INSTANCE_NOT_FOUND[config.default_language], responseCodes.InvalidOTP));
                return;
            }
            if(requestParam.username != instance.username){
                reject(errors(labels.LBL_USERNAME_NOT_FOUND[config.default_language], responseCodes.InvalidOTP));
                return;
            }
            let encryptPassword = await passwordHandler.encrypt(requestParam.password.toString());
            if(encryptPassword != instance.password){
                reject(errors(labels.LBL_INVALID_PWD[config.default_language], responseCodes.InvalidOTP));
                return;
            }
            let response = await query.selectWithAndOne(dbConstants.dbSchema.drivers, {instance_id:requestParam.instance_id, mobile_country_code: requestParam.mobile_country_code, mobile: requestParam.mobile}, { _id:0, driver_id: 1} );
            if(!response){
                reject(errors(labels.LBL_INSTANCE_NOT_REGISTERED[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            resolve(profile({driver_id: response.driver_id}));
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
            if(requestParam.instance_id){
                requestParam.instance_id = await encryptDecryptHandler.decryptString(requestParam.instance_id)
            }
            if(requestParam.address){
                requestParam.address = await encryptDecryptHandler.decryptString(requestParam.address)
            }
            if(requestParam.dob){
                requestParam.dob = await encryptDecryptHandler.decryptString(requestParam.dob)
            }
            if(requestParam.family_mobile_country_code){
                requestParam.family_mobile_country_code = await encryptDecryptHandler.decryptString(requestParam.family_mobile_country_code)
            }
            if(requestParam.family_mobile){
                requestParam.family_mobile = await encryptDecryptHandler.decryptString(requestParam.family_mobile)
            }
            if(requestParam.licence_number){
                requestParam.licence_number = await encryptDecryptHandler.decryptString(requestParam.licence_number)
            }
            if(requestParam.mobile_country_code){
                requestParam.mobile_country_code = await encryptDecryptHandler.decryptString(requestParam.mobile_country_code)
            }
            if(requestParam.mobile){
                requestParam.mobile = await encryptDecryptHandler.decryptString(requestParam.mobile)
            }
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
            let res = await query.insertSingle(dbConstants.dbSchema.drivers, requestParam);
            resolve(profile({driver_id: res.driver_id}));
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
            if(requestParam.driver_id){
                requestParam.driver_id = await encryptDecryptHandler.decryptString(requestParam.driver_id)
            }
            if(requestParam.first_name){
                requestParam.first_name = await encryptDecryptHandler.decryptString(requestParam.first_name)
            }
            if(requestParam.last_name){
                requestParam.last_name = await encryptDecryptHandler.decryptString(requestParam.last_name)
            }
            if(requestParam.address){
                requestParam.address = await encryptDecryptHandler.decryptString(requestParam.address)
            }
            if(requestParam.family_mobile_country_code){
                requestParam.family_mobile_country_code = await encryptDecryptHandler.decryptString(requestParam.family_mobile_country_code)
            }
            if(requestParam.family_mobile){
                requestParam.family_mobile = await encryptDecryptHandler.decryptString(requestParam.family_mobile)
            }
            let response = await query.selectWithAndOne(dbConstants.dbSchema.drivers, {driver_id: requestParam.driver_id}, { _id: 0, driver_id:1, profile_photo:1, licence_photo:1}, { created_at: 1 });
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            if(req.files){
                let objects = []
                if(req.files.profile_photo){
                    objects.push({
                        Key: `simba-tracking/drivers/${response.profile_photo}`
                    })
                    requestParam.profile_photo = await imgHandler.uploadImage(req.files.profile_photo, config.aws.s3.driverBucket)
                    await imgHandler.deleteImage(objects, config.aws.bucketName)
                }
            }
            await query.updateSingle(dbConstants.dbSchema.drivers, requestParam, {driver_id: requestParam.driver_id});
            resolve(profile({driver_id: requestParam.driver_id}));
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
            let response = await query.selectWithAndOne(dbConstants.dbSchema.drivers, {driver_id:requestParam.driver_id}, { _id:0, driver_id: 1, first_name:1, last_name:1, mobile_country_code:1, mobile:1, instance_id:1, profile_photo:1, dob:1, family_mobile_country_code:1, family_mobile:1, address:1, status:1, licence_number:1, licence_photo:1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            response = JSON.parse(JSON.stringify(response))
            if(response.status == 'inactive'){
                reject(errors(labels.LBL_ACCOUNT_INACTIVE[config.default_language], responseCodes.NotActive));
                return;
            }
            response.profile_photo = response.profile_photo != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`simba-tracking/drivers/${response.profile_photo}`}) : ''
            response.licence_photo = response.licence_photo != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`simba-tracking/drivers/${response.licence_photo}`}) : ''
            resolve(await encryptDecryptHandler.encrypt(response));
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const checkInstanceConnet = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.drivers, {driver_id:requestParam.driver_id}, { _id:0, driver_id: 1, instance_id:1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            if(response.instance_id == ''){
                reject(errors(labels.LBL_INSTANCE_NOT_REGISTERED[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let instance = await query.selectWithAndOne(dbConstants.dbSchema.instances, {instance_id:response.instance_id}, { _id:0, instance_id: 1, username:1, password:1} );
            if(!instance){
                reject(errors(labels.LBL_INSTANCE_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            if(requestParam.device_token){
                await query.updateSingle(dbConstants.dbSchema.drivers, {device_token: requestParam.device_token}, {driver_id: requestParam.driver_id});
            }
            resolve(profile({driver_id: requestParam.driver_id}));
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const signin = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.drivers, {mobile_country_code:requestParam.mobile_country_code, mobile: requestParam.mobile}, { _id:0, driver_id: 1, instance_id:1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            if(response.instance_id == ''){
                reject(errors(labels.LBL_INSTANCE_NOT_REGISTERED[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let instance = await query.selectWithAndOne(dbConstants.dbSchema.instances, {instance_id:response.instance_id}, { _id:0, instance_id: 1, username:1, password:1} );
            if(!instance){
                reject(errors(labels.LBL_INSTANCE_NOT_FOUND[config.default_language], responseCodes.InvalidOTP));
                return;
            }
            if(requestParam.username != instance.username){
                reject(errors(labels.LBL_USERNAME_NOT_FOUND[config.default_language], responseCodes.InvalidOTP));
                return;
            }
            let encryptPassword = await passwordHandler.encrypt(requestParam.password.toString());
            if(encryptPassword != instance.password){
                reject(errors(labels.LBL_INVALID_PWD[config.default_language], responseCodes.InvalidOTP));
                return;
            }
            if(requestParam.device_token){
                await query.updateSingle(dbConstants.dbSchema.drivers, {device_token: requestParam.device_token}, {driver_id: response.driver_id});
            }
            resolve(profile({driver_id: response.driver_id}));
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
            let response = await query.selectWithAndOne(dbConstants.dbSchema.drivers, {driver_id:requestParam.driver_id}, { _id:0, driver_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            await query.updateSingle(dbConstants.dbSchema.drivers, {device_token:''}, {driver_id: requestParam.driver_id});
            resolve(await encryptDecryptHandler.encrypt({}));
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const deliveriesForYou = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.drivers, {driver_id:requestParam.driver_id}, { _id:0, driver_id: 1} );
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
                $match : {driver_id: requestParam.driver_id, status: 'accepted'}
            }, { 
                $sort : {created_at:-1}
            }, {
                $project: {
                    _id: 0,
                    driver_id: 1,
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
                    status: 1,
                    formatted_distance: 1,
                    formatted_duration: 1,
                    truck_name:"$truckDetails.title",
                    delivery_category_name:"$catDetails.title",
                    delivery_category_code:"$catDetails.code",
                }
            }];
            let lists = await query.joinWithAnd(dbConstants.dbSchema.jobs, joinArr);
            lists = JSON.parse(JSON.stringify(lists))
            await Promise.all(lists.map(async (elem) => {
                elem.due_in = ''
                let dt;
                let todayDate = moment(new Date());
                if(elem.delivery_category_code == '2H'){
                    dt = moment(new Date(elem.pickup_from)).add(2, 'hours');
                }
                if(elem.delivery_category_code == '4H'){
                    dt = moment(new Date(elem.pickup_from)).add(4, 'hours');
                }
                if(elem.delivery_category_code == 'SAME_WEEK'){
                    dt = moment().endOf('week')
                }
                let duration = moment.duration(dt.diff(todayDate));
                const hours = parseInt(duration.asHours());
                const minutes = parseInt(duration.asMinutes()) - hours * 60;
                elem.due_in = hours + "h " + minutes + "m";

                elem.pickup_from = timeZone(new Date(elem.pickup_from)).tz(requestParam.time_zone).format('DD MMM yyyy h:mm a')
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

const jobList = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.drivers, {driver_id:requestParam.driver_id}, { _id:0, driver_id: 1} );
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
                $match : {driver_id: requestParam.driver_id, status: 'pickedup'}
            }, { 
                $sort : {created_at:-1}
            }, {
                $project: {
                    _id: 0,
                    driver_id: 1,
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
                    status: 1,
                    formatted_distance: 1,
                    formatted_duration: 1,
                    pickedup_at: 1,
                    truck_name:"$truckDetails.title",
                    delivery_category_name:"$catDetails.title",
                    delivery_category_code:"$catDetails.code",
                }
            }];
            let lists = await query.joinWithAnd(dbConstants.dbSchema.jobs, joinArr);
            lists = JSON.parse(JSON.stringify(lists))
            await Promise.all(lists.map(async (elem) => {
                elem.due_in = ''
                let dt;
                let todayDate = moment(new Date());
                if(elem.delivery_category_code == '2H'){
                    dt = moment(new Date(elem.pickup_from)).add(2, 'hours');
                }
                if(elem.delivery_category_code == '4H'){
                    dt = moment(new Date(elem.pickup_from)).add(4, 'hours');
                }
                if(elem.delivery_category_code == 'SAME_WEEK'){
                    dt = moment().endOf('week')
                }
                let duration = moment.duration(dt.diff(todayDate));
                const hours = parseInt(duration.asHours());
                const minutes = parseInt(duration.asMinutes()) - hours * 60;
                elem.due_in = hours + "h " + minutes + "m";

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

const historyList = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.drivers, {driver_id:requestParam.driver_id}, { _id:0, driver_id: 1} );
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
                $match : {driver_id: requestParam.driver_id, status: {$in: ["delivered", "cancelled"]}}
            }, { 
                $sort : {delivered_at:-1}
            }, {
                $project: {
                    _id: 0,
                    driver_id: 1,
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
                    status: 1,
                    formatted_distance: 1,
                    formatted_duration: 1,
                    pickedup_at: 1,
                    delivered_at: 1,
                    truck_name:"$truckDetails.title",
                    delivery_category_name:"$catDetails.title",
                }
            }];
            let lists = await query.joinWithAnd(dbConstants.dbSchema.jobs, joinArr);
            lists = JSON.parse(JSON.stringify(lists))
            await Promise.all(lists.map(async (elem) => {
                elem.pickup_from = timeZone(new Date(elem.pickup_from)).tz(requestParam.time_zone).format('DD MMM yyyy h:mm a')
                elem.pickedup_at = elem.pickedup_at ? timeZone(new Date(elem.pickedup_at)).tz(requestParam.time_zone).format('lll') : ''
                elem.delivered_at = elem.delivered_at ? timeZone(new Date(elem.delivered_at)).tz(requestParam.time_zone).format('lll') : ''
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

const routesList = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.drivers, {driver_id:requestParam.driver_id}, { _id:0, driver_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let compairData = {
                $and: [{
                    $or: [{
                        status: 'accepted'
                    }, {
                        status: 'pickedup',
                    }]
                }, {
                    driver_id: requestParam.driver_id,
                }]
            }
            let jobs = await query.selectWithAnd(dbConstants.dbSchema.jobs, compairData, {_id:0, job_id:1, pickup_address:1, pickup_latitude:1, pickup_longitude:1, delivery_address:1, delivery_latitude:1, delivery_longitude:1, status:1, pickup_landmark:1, delivery_landmark:1 }, {created_at:-1});
            resolve(await encryptDecryptHandler.encrypt(jobs));
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const getRatingsDeliveries = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.drivers, {driver_id:requestParam.driver_id}, { _id:0, driver_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let compairData = {
                driver_id: requestParam.driver_id,
                status:'delivered'
            }
            let start, end;
            if(requestParam.type == 'TM'){
                start = moment().startOf('month').toDate();
                start = moment(start).format('YYYY-MM-DD')
                end = moment().endOf('month').toDate();
                end = moment(end).format('YYYY-MM-DD')
            }
            if(requestParam.type == 'LM'){
                start = moment().subtract(1, 'months').startOf('month');
                start = moment(start).format('YYYY-MM-DD')
                end = moment().subtract(1, 'months').endOf('month');
                end = moment(end).format('YYYY-MM-DD')
            }
            if(requestParam.type == 'TW'){
                start = moment().startOf('week').toDate();
                start = moment(start).format('YYYY-MM-DD')
                end = moment().endOf('week').toDate();
                end = moment(end).format('YYYY-MM-DD')
            }
            if(requestParam.type == 'LW'){
                start = moment().subtract(1, 'weeks').startOf('week');
                start = moment(start).format('YYYY-MM-DD')
                end = moment().subtract(1, 'weeks').endOf('week');
                end = moment(end).format('YYYY-MM-DD')
            }
            compairData.delivered_at = {
                $lte: new Date(end + 'T23:59:59.000Z'),
                $gte: new Date(start + 'T00:00:00.000Z')
            }
            let jobs = await query.selectWithAnd(dbConstants.dbSchema.jobs, compairData, {_id:0, job_id:1, is_customer_rated: 1, rating: 1}, {created_at:-1});
            let rating = 0;
            let ratingJob = 0;
            _.each(jobs, (elem) => {
                if(elem.is_customer_rated == true){
                    ratingJob += 1
                    rating += parseFloat(elem.rating.rating)
                }
            })
            let avg_rating = 0
            if(rating > 0 && ratingJob > 0){
                avg_rating = parseFloat(rating/ratingJob).toFixed(1)
            }
            let obj = {deliveries: jobs.length, rating: avg_rating}
            resolve(await encryptDecryptHandler.encrypt(obj));
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
    driverLists,

    // APIs
    checkDriver,
    signup,
    updateProfile,
    profile,
    checkInstanceConnet,
    signin,
    logout,
    deliveriesForYou,
    jobList,
    routesList,
    getRatingsDeliveries,
    historyList,
};