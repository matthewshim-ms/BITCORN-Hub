/*

*/

"use strict";

const JsonFile = require('../../utils/json-file');

module.exports = new JsonFile('./settings/rooturl.json', {
    database: 'https://database.notfound.api',
    test: 'https://test.notfound.api'
});
