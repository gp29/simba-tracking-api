'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const passwordHandler = require('./../utils/password-handler');
const AWS = require('aws-sdk');
AWS.config.update({
    accessKeyId: config.aws.keyId,
    secretAccessKey: config.aws.key,
    region: config.aws.region
});
const ses = new AWS.SES({apiVersion: '2010-12-01'});

const setupEmail = async(requestParam) => {
    const params = {
        Destination: {
            ToAddresses: requestParam.to_email
        },
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: requestParam.description
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: requestParam.subject
            }
        },
        ReturnPath: requestParam.from_email,
        Source: requestParam.from_email,
    };

    ses.sendEmail(params, (err, data) => {
        if (err) {
            return console.log(err, err.stack);
        } else {
            console.log("Email sent.", data);
        }
    });
};

const login = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {email: requestParam.email}, { _id: 0}, { created_at: 1 });
            if (!response) {
                reject(errors(labels.LBL_EMAIL_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            if(response.status == 'inactive'){
                reject(errors(labels.LBL_ACCOUNT_INACTIVE[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let encryptPassword = await passwordHandler.encrypt(requestParam.password.toString());
            if(encryptPassword != response.password){
                reject(errors(labels.LBL_INVALID_PWD[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            const inserRecord = {
                email: response.email,
                name: response.name,
                type: 'Admin',
                login_id: response.user_id,
                ip: requestParam.ip_address,
            };
            let res = await query.insertSingle(dbConstants.dbSchema.login_logs, inserRecord)
            response = JSON.parse(JSON.stringify(response));
            response.loginlog_id = res.loginlog_id
            resolve(response);
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
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {email: requestParam.email}, { _id: 0}, { created_at: 1 });
            if (!response) {
                reject(errors(labels.LBL_EMAIL_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            const code = 'USE'+Math.round((Math.pow(36, 6 + 1) - Math.random() * Math.pow(36, 6))).toString(36).slice(1);
            let settings = await query.selectWithAndOne(dbConstants.dbSchema.settings, {}, { _id: 0}, { created_at: 1 });
            let template = await query.selectWithAndOne(dbConstants.dbSchema.email_templates, {code: 'ADMIN_FPWD'}, { _id: 0}, { created_at: 1 });
            if(template){
                let emailTemplate = template.description;
                emailTemplate = emailTemplate.replace("#NAME#", response.name);
                emailTemplate = emailTemplate.replace("#LINK#", requestParam.link+'/#/reset?code='+code);
                emailTemplate = emailTemplate.replace("#LOGO#", fullUrl + '/img/logo.png');
                setupEmail({
                    to_email: [requestParam.email],
                    from_email: template.from_name + ' <' + template.from_email + '>',
                    subject: template.email_subject,
                    description: emailTemplate
                });
            }
            await query.updateSingle(dbConstants.dbSchema.users, {reset_code:code}, {user_id: response.user_id});
            resolve(response);
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const reset = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {reset_code: requestParam.code}, { _id: 0}, { created_at: 1 });
            if (!response) {
                reject(errors(labels.LBL_EMAIL_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let encryptPassword = await passwordHandler.encrypt(requestParam.password.toString());
            await query.updateSingle(dbConstants.dbSchema.users, {reset_code:'', password: encryptPassword}, {user_id: response.user_id});
            resolve(response);
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
            requestParam['logout_date'] = new Date();
            await query.updateSingle(dbConstants.dbSchema.login_logs, requestParam, {loginlog_id: requestParam.loginlog_id});
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

module.exports = {
    login,
    forgot,
    reset,
    logout
};