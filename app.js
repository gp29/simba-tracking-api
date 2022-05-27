'use strict';

//configurations
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const jsonResponse = require('./utils/json-response');
const errors = require('./utils/dz-errors');
const cors = require('cors');
const config = require('./config');

const mongoose = require('mongoose');
mongoose.connect(config.database_url, {useNewUrlParser: true, useUnifiedTopology:true, useCreateIndex:true}).then((result) => {
    console.log("Database connected successfully")
}).catch((error) => {
    console.log(error)
});

//routes
const routes = require('./routes/index');
const auth = require('./routes/auth');
const role = require('./routes/role');
const user = require('./routes/user');
const loginLog = require('./routes/login-log');
const moduleApi = require('./routes/module');
const settings = require('./routes/settings');
const email = require('./routes/email');
const sms = require('./routes/sms');
const push = require('./routes/push');
const accessRight = require('./routes/access-right');
const deliveryCategory = require('./routes/delivery-category');
const item = require('./routes/item');
const device = require('./routes/device');
const truck = require('./routes/truck');
const customer = require('./routes/customer');
const driver = require('./routes/driver');
const enterprise = require('./routes/enterprise');
const instance = require('./routes/instance');
const road = require('./routes/road');

//other configurations
const passport = require('passport');
const favicon = require('serve-favicon');
const multiparty = require('connect-multiparty');
const upload = require('express-fileupload');
const multipartyMiddleWare = multiparty();

//express configurations
const app = express();
app.use(favicon(path.join(__dirname, './public/img', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({extended: true, limit: '50mb'}));
app.use(cookieParser());
app.use(require('express-session')({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(cors());
app.use(passport.initialize());
app.use(passport.session());
app.use(multipartyMiddleWare);
const responseCodes = require('./utils/response-codes');

// import routes
app.use('/',routes);
app.use('/api/auth', auth);
app.use('/api/role', role);
app.use('/api/user', user);
app.use('/api/login-log', loginLog);
app.use('/api/module', moduleApi);
app.use('/api/settings', settings);
app.use('/api/email', email);
app.use('/api/sms', sms);
app.use('/api/push', push);
app.use('/api/access-right', accessRight);
app.use('/api/delivery-category', deliveryCategory);
app.use('/api/item', item);
app.use('/api/device', device);
app.use('/api/truck', truck);
app.use('/api/customer', customer);
app.use('/api/driver', driver);
app.use('/api/enterprise', enterprise);
app.use('/api/instance', instance);
app.use('/api/road', road);

app.use(upload());

var swaggerUi = require("swagger-ui-express"),
swaggerDocument = require("./swagger.json");

app.use("/api-swagger", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((req, res) => {
	console.log('\nError: No route found or Wrong method name');
	jsonResponse(res, errors("No route found or Wrong method name", responseCodes.Forbidden), null);
});

app.use((err, req, res) => {
	res.status(err.status || 500);
	res.render('error', {
	message: err.message,
		error: {}
	});
});

module.exports = app;