const moment = require('moment');
const randomString = require('random-string');

const generateId = (label = '')=> {
    return new Promise((resolve) => {
        resolve(`${label}${moment().unix()}${Math.floor((Math.random() * 99) + 11)}`);
        return;
    })
};

const generateString = (length, numeric, letters, special)=> {
    return new Promise((resolve) => {
    	let generatedString = randomString({
	        length: length,
	        numeric: numeric,
	        letters: letters,
	        special: special,
	    });

        resolve(generatedString);
        return;
    })
};

module.exports = {
    generateId,
    generateString
};