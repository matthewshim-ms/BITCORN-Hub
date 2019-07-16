
/*

*/

"use strict";
const assert = require('assert');
const fetch = require('node-fetch');

const mysql = require('../source/config/databases/mysql');
const math = require('../source/utils/math');
const wallet = require('../source/config/wallet');

const { Timer } = require('../public/js/server/timer');
const { Ticker } = require('../public/js/server/ticker');

(async () => {
    try {
        const timer = new Timer();
        timer.start();

        const getbalance = await wallet.makeRequest('getbalance', ['bitcornhub']);

        console.log(getbalance.json.result);
        if (getbalance.json.result) {
        }

        timer.stop('Action Complete: ');

        assert(Ticker);
    } catch (error) {
        console.error(error);
    }
})();
