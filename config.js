'use strict';

const dotenv = require('dotenv')
dotenv.config()

const _ = require('underscore');
const requiredParams = [
    'APP_NAME',
    'PORT',
    'AWS_ACCESS_KEY_ID',
    'AWS_ACCESS_SECRET_KEY',
    'AWS_REGION',
    'AWS_S3_BUCKET_NAME',
    'AWS_S3_URL_PRIFIX',
    'AWS_S3_CUSTOMER_BUCKET',
    'AWS_S3_DRIVER_BUCKET',
    'AWS_S3_ENTERPRISE_BUCKET',
    'AWS_S3_SIGNATURE_BUCKET',
    'DATABASE_URL',
    'TIME_ZONE',
    'BACKOFFICE_URL',
    'AES_256_KEY',
    'AES_256_IV',
    'GOOGLE_KEY',
    'PUSH_KEY'
];

for (let i = 0; i < requiredParams.length; i++) {
    if (!_.has(process.env, requiredParams[i])) {
        console.log(
            'Error: environment variables have not been properly setup for the Simba Tracking Platform. The variable:',
            requiredParams[i],
            'was not found.'
        );

        throw new Error('Simba Tracking Platform Environment Variables Not Properly Set');
    }
}

module.exports = {
	default_language:'EN',
    time_zone:process.env.TIME_ZONE,
	appName: process.env.APP_NAME,
	port: process.env.PORT,
    database_url: process.env.DATABASE_URL,
    backoffice_url: process.env.BACKOFFICE_URL,
	aws:{
		keyId: process.env.AWS_ACCESS_KEY_ID,
        key: process.env.AWS_ACCESS_SECRET_KEY,
        region: process.env.AWS_REGION,
        bucketName: process.env.AWS_S3_BUCKET_NAME,
        prefix: process.env.AWS_S3_URL_PRIFIX,
        s3: {
            customerBucket: process.env.AWS_S3_CUSTOMER_BUCKET,
            driverBucket: process.env.AWS_S3_DRIVER_BUCKET,
            enterpriseBucket: process.env.AWS_S3_ENTERPRISE_BUCKET,
            signatureBucket: process.env.AWS_S3_SIGNATURE_BUCKET,
	    },
	},
    aes256:{
        key:process.env.AES_256_KEY,
        iv:process.env.AES_256_IV
    },
    push_key: process.env.PUSH_KEY,
    google_key: process.env.GOOGLE_KEY
};
