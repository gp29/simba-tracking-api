'use strict';

const responseCodes = require('./../utils/response-codes');
const jsonResponse = require('./../utils/json-response');
const errors = require('./../utils/dz-errors');
const express = require('express');
const router = express.Router();
const config = require('./../config');
const encryptDecryptHandler = require('./../model_handlers/encrypt-decrypt-handler');
const labels = require('./../utils/labels.json')
const customerHandler = require('./../model_handlers/customer-handler');

router.post('/create', async(req, res) => {
    try {
        let requestParam = JSON.parse(req.body.fields);
        let response = await customerHandler.create(requestParam, req);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/get-sort', async(req, res) => {
    try {
        let response = await customerHandler.getSort(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.get('/get', async(req, res) => {
    try {
        let response = await customerHandler.get(req.query);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/action', async(req, res) => {
    try {
        let response = await customerHandler.action(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/update', async(req, res) => {
    try {
        let requestParam = JSON.parse(req.body.fields);
        let response = await customerHandler.update(requestParam, req);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

// FOR APIS

router.post('/signin', async(req, res) => {
    try {
        req.body = await encryptDecryptHandler.decryptJson(req.body.encrypt_data)
        if (!req.body.email || !req.body.password) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await customerHandler.signin(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/forgot', async(req, res) => {
    try {
        req.body = await encryptDecryptHandler.decryptJson(req.body.encrypt_data)
        if (!req.body.email) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await customerHandler.forgot(req.body, req);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/signup', async(req, res) => {
    try {
        if (!req.body.first_name || !req.body.last_name || !req.body.email || !req.body.password || !req.body.mobile_country_code || !req.body.mobile || !req.files.profile_photo) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await customerHandler.signup(req.body, req);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/update-profile', async(req, res) => {
    try {
        if (!req.body.customer_id) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await customerHandler.updateProfile(req.body, req);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.get('/get-profile', async(req, res) => {
    try {
        req.query = await encryptDecryptHandler.decryptJson(req.query.encrypt_data)
        if (!req.query.customer_id) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await customerHandler.profile(req.query);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/change-password', async(req, res) => {
    try {
        req.body = await encryptDecryptHandler.decryptJson(req.body.encrypt_data)
        if (!req.body.customer_id || !req.body.password) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await customerHandler.changePassword(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/logout', async(req, res) => {
    try {
        req.body = await encryptDecryptHandler.decryptJson(req.body.encrypt_data)
        if (!req.body.customer_id) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await customerHandler.logout(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/create-job', async(req, res) => {
    try {
        if(!req.body.is_from){
            req.body = await encryptDecryptHandler.decryptJson(req.body.encrypt_data)
        }
        if (!req.body.customer_id || !req.body.truck_id || !req.body.delivery_category_id || !req.body.pickup_from || !req.body.items) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        if (!req.body.pickup_address || !req.body.pickup_latitude || !req.body.pickup_longitude || !req.body.delivery_address || !req.body.delivery_latitude || !req.body.delivery_longitude) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await customerHandler.createJob(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/update-job', async(req, res) => {
    try {
        if(!req.body.is_from){
            req.body = await encryptDecryptHandler.decryptJson(req.body.encrypt_data)
        }
        if (!req.body.job_id || !req.body.customer_id || !req.body.truck_id || !req.body.delivery_category_id || !req.body.pickup_from || !req.body.items) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        if (!req.body.pickup_address || !req.body.pickup_latitude || !req.body.pickup_longitude || !req.body.delivery_address || !req.body.delivery_latitude || !req.body.delivery_longitude) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await customerHandler.updateJob(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.get('/current-delivery', async(req, res) => {
    try {
        req.query = await encryptDecryptHandler.decryptJson(req.query.encrypt_data)
        req.query.time_zone = config.time_zone
        if(req.headers.time_zone){
            req.query.time_zone = req.headers.time_zone
        }
        if (!req.query.customer_id) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await customerHandler.currentDelivery(req.query);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        console.log(error)
        jsonResponse(res, error.code, error, null);
    }
});

router.get('/delivery-history', async(req, res) => {
    try {
        req.query = await encryptDecryptHandler.decryptJson(req.query.encrypt_data)
        req.query.time_zone = config.time_zone
        if(req.headers.time_zone){
            req.query.time_zone = req.headers.time_zone
        }
        if (!req.query.customer_id) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await customerHandler.deliveryHistory(req.query);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        console.log(error)
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/rate-job', async(req, res) => {
    try {
        req.body = await encryptDecryptHandler.decryptJson(req.body.encrypt_data)
        if (!req.body.job_id || !req.body.customer_id || !req.body.rating) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await customerHandler.rateJob(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

module.exports = router;