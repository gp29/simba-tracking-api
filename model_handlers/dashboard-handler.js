'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const _ = require('underscore');
const timeZone = require('moment-timezone');
const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const getStatistics = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let customers = await query.countRecord(dbConstants.dbSchema.customers, {});
            let trucks = await query.countRecord(dbConstants.dbSchema.trucks, {});
            let instances = await query.countRecord(dbConstants.dbSchema.instances, {});
            let drivers = await query.countRecord(dbConstants.dbSchema.drivers, {});
            let roads = await query.countRecord(dbConstants.dbSchema.roads, {});
            let jobs = await query.countRecord(dbConstants.dbSchema.jobs, {});
            let gps_devices = await query.countRecord(dbConstants.dbSchema.gps_devices, {});
            let items = await query.countRecord(dbConstants.dbSchema.items, {});
            let delivery_categories = await query.countRecord(dbConstants.dbSchema.delivery_categories, {});
            resolve({customers, trucks, instances, drivers, roads, jobs, gps_devices, items, delivery_categories})
            return;
            resolve(response);
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const graph = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let year = new Date().getFullYear()
            let columnAndValues = {};
            let promise = [];
            for (let x in monthName) {
                promise.push(await overAllCountJobs(monthName[x], x, columnAndValues, year))
            }
            Promise.all(promise)
            .then(async result => {
                resolve(result);
                return;
            });
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const overAllCountJobs = (month, index, columnAndValues, year) => {
    return new Promise(async(resolve, reject) => {
        try {
            let date = new Date(),
            y = year,
            m = parseInt(index);
            let firstDay = new Date(y, m, 1);
            firstDay.setHours(0, 0, 0, 0);
            let lastDay = new Date(y, m + 1, 0);
            lastDay.setHours(23, 59, 59, 999);
            let compairData = {
                status: 'completed',
                created_at: {
                    $gte: firstDay,
                    $lt: lastDay
                }
            }
            let jobs = await query.countRecord(dbConstants.dbSchema.jobs, compairData);
            resolve(jobs);
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

module.exports = {
    getStatistics,
    graph
};