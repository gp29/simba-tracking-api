'use strict';

const responseCodes = require('./../utils/response-codes');
const jsonResponse = require('./../utils/json-response');
const errors = require('./../utils/dz-errors');
const express = require('express');
const router = express.Router();
const jobHandler = require('./../model_handlers/job-handler');
const config = require('./../config');
const encryptDecryptHandler = require('./../model_handlers/encrypt-decrypt-handler');
const labels = require('./../utils/labels.json')

router.get('/get', async(req, res) => {
    try {
        let response = await jobHandler.get(req.query);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/get-sort', async(req, res) => {
    try {
        let response = await jobHandler.getSort(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/action', async(req, res) => {
    try {
        let response = await jobHandler.action(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/assign-road', async(req, res) => {
    try {
        let response = await jobHandler.assignRoad(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/cancel-job', async(req, res) => {
    try {
        req.body = await encryptDecryptHandler.decryptJson(req.body.encrypt_data)
        if (!req.body.customer_id || !req.body.job_id) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await jobHandler.cancelJob(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        console.log(error)
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/pickedup-job', async(req, res) => {
    try {
        req.body = await encryptDecryptHandler.decryptJson(req.body.encrypt_data)
        if (!req.body.driver_id || !req.body.job_id) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await jobHandler.pickedupJob(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        console.log(error)
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/delivered-job', async(req, res) => {
    try {
        if (!req.body.driver_id || !req.body.job_id || !req.files.signature_proof_image) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await jobHandler.deliveredJob(req.body, req);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        console.log(error)
        jsonResponse(res, error.code, error, null);
    }
});

module.exports = router;