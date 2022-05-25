'use strict';

const responseCodes = require('./../utils/response-codes');
const jsonResponse = require('./../utils/json-response');
const config = require('./../config');
const errors = require('./../utils/dz-errors');
const express = require('express');
const router = express.Router();
const accessHandler = require('./../model_handlers/access-right-handler');
const labels = require('./../utils/labels.json')

router.get('/get', async(req, res) => {
    try {
        let response = await accessHandler.get(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/submit', async(req, res) => {
    try {
        let response = await accessHandler.submit(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

module.exports = router;