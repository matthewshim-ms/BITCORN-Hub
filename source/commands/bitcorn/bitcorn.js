/*

*/

"use strict";

const tmi = require('../../config/tmi');
const mysql = require('../../config/databases/mysql');
const math = require('../../utils/math');
const wallet = require('../../config/wallet');

module.exports = Object.create({
    configs: {
        name: 'bitcorn',
        accessLevel: 'CHAT',
        cooldown: 1000 * 30,
        global_cooldown: false,
        description: 'View your BITCORN Balance',
        example: '$bitcorn',
        prefix: '$'
    },
    async execute(event) {

        const result = await mysql.query(`SELECT * FROM users WHERE twitch_username LIKE '${event.user.username}'`);
        
        const info = {
            cornaddy: result[0] ? result[0].cornaddy : '',
            balance: math.fixed8(result[0] ? result[0].balance : 0.0)
        }

        if (result.length === 0) {
            const { json } = await wallet.makeRequest('getnewaddress', [event.user.username]);
            info.cornaddy = json.result || '';
            info.balance = math.fixed8(0.0);
            await mysql.query(`INSERT INTO users (id,discordid,twitch_username,cornaddy,balance,token,level,avatar,subtier,twitchid,twitterid,instagramid) VALUES (NULL,'NA','${event.user.username}','${info.cornaddy}','${info.balance}','NA','1000','NA','','','','')`);
        }
        
        tmi.botWhisper(event.user.username, `Your BITCORN Balance is ${info.balance} CORN`);
        
        await mysql.logit('Balance Request', `Request by ${event.user.username} (${info.balance} CORN)`);

        return { success: true, event };
    }
});