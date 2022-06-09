'use strict';

const responseCodes = require('./../utils/response-codes');
const jsonResponse = require('./../utils/json-response');
const errors = require('./../utils/dz-errors');
const express = require('express');
const router = express.Router();
const config = require('./../config');
const ratingHandler = require('./../model_handlers/rating-handler');

router.post('/get-sort', async(req, res) => {
    try {
        let response = await ratingHandler.getSort(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

module.exports = router;