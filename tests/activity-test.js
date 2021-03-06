
/*

*/

"use strict";
const fs = require('fs');
const assert = require('assert');
const fetch = require('node-fetch');

const math = require('../source/utils/math');
const kraken = require('../source/config/authorize/kraken');
const helix = require('../source/config/authorize/helix');
const tmi = require('../source/config/tmi');
const activityTracker = require('../source/activity-tracker');

const databaseAPI = require('../source/config/api-interface/database-api');

const { Ticker } = require('../public/js/server/ticker');


(async () => {
    try {
        const timer = new _.Timer();
        timer.start();
        
        const chatternamesArr = activityTracker.getChatterActivity('callowcreation');
        console.log(chatternamesArr);

        const rain_user_count = 10;
        const rain_amount = 100;

        const items = chatternamesArr.slice(0, rain_user_count);
        const amount = math.fixed8(rain_amount / items.length);
        const recipients = items.map(x => ({ twitchId: x.id, twitchUsername: x.username, amount: amount }));
        
        console.log(recipients);

        const { id: twitchId, login: twitchUsername } = await helix.getUserLogin('callowcreation');
        const rain_result = await databaseAPI.rainRequest(recipients, twitchId, twitchUsername);
        
        console.log(rain_result);

        const time = timer.stop();
        console.log('Execution time: ' + time);

        assert(time0);
    } catch (error) {
        console.error(error);
    }
})();

