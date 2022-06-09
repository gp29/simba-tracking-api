'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const moment = require('moment');
const timeZone = require('moment-timezone');

const getSort = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnAndValue = {is_customer_rated: true}
            if(requestParam.text && requestParam.text !=''){
                columnAndValue['$or'] = [{
                    job_id: new RegExp(requestParam.text, 'i')
                }, {
                    'cusDetails.first_name': new RegExp(requestParam.text, 'i')
                }, {
                    'cusDetails.last_name': new RegExp(requestParam.text, 'i')
                }, {
                    'rating.comment': new RegExp(requestParam.text, 'i')
                }];
            }
            let page = requestParam.page ? requestParam.page : 0 ;
            let sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10 ;
            let skip = page * sizePerPage;
            let obj = {};

            let joinArr = [{
                $lookup: {
                    from: 'customers',
                    localField: 'customer_id',
                    foreignField: 'customer_id',
                    as: 'cusDetails'
                }
            }, {
                $unwind: "$cusDetails"
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
                    job_id: 1
                }
            }];
            let count = await query.joinWithAnd(dbConstants.dbSchema.jobs, joinArr);

            joinArr = [{
                $lookup: {
                    from: 'customers',
                    localField: 'customer_id',
                    foreignField: 'customer_id',
                    as: 'cusDetails'
                }
            }, {
                $unwind: "$cusDetails"
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
                    job_id: "$job_id",
                    customer: { $concat: [ "$cusDetails.first_name", " ", "$cusDetails.last_name" ] },
                    rating: "$rating",
                }
            }];
            let data = await query.joinWithAnd(dbConstants.dbSchema.jobs, joinArr);
            data = JSON.parse(JSON.stringify(data))
            _.each(data, (elem) => {
                elem.rating.date = elem.rating.date && elem.rating.date !='' ? timeZone(new Date(elem.rating.date)).tz(requestParam.time_zone).format('lll') : ''
            })
            obj.data = data;
            obj.count = count.length;
            resolve(obj);
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

module.exports = {
    getSort,
};