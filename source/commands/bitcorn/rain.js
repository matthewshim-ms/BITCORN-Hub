/*

*/

'use strict';

const tmi = require('../../config/tmi');
const mysql = require('../../config/databases/mysql');
const txMonitor = require('../../tx-monitor');
const math = require('../../utils/math');
const wallet = require('../../config/wallet');

const max_rain_users_amount = 3;
const activitytracking_query_limit = 1000;
const wallet_max_transaction_amount = 1000.00;

const Pending = require('../../utils/pending');

const pending = new Pending('rain');

module.exports = Object.create({
    configs: {
        name: 'rain',
        accessLevel: 'OWNER',
        cooldown: 1000 * 30,
        global_cooldown: true,
        description: 'Rain a certain Amount to the last 1-3 of People who were active',
        example: '$rain <amount> <1-3>',
        prefix: '$'
    },
    async execute(event) {

        if(pending.started(event, tmi)) return pending.reply(event, tmi);

        const fromusername = event.user.username;
        const rain_amount = +(event.args[0] ? event.args[0].replace('<', '').replace('>', '') : 0);
        const rain_user_count = +(event.args[1] ? event.args[1] : 0);

        if (rain_amount < 0) {
            const reply = `@${event.user.username}, Cannot Rain Negative Amount`;
            tmi.botSay(event.target, reply);
            return pending.complete(event, reply);
        }

        if (rain_user_count <= 0 || rain_user_count > max_rain_users_amount) {
            const reply = `@${event.user.username}, Number of people you can rain to is 1 to ${max_rain_users_amount}`;
            tmi.botSay(event.target, reply);
            return pending.complete(event, reply);
        }

        const from_result = await mysql.query(`SELECT * FROM users WHERE twitch_username LIKE '${fromusername}'`);
        if (from_result.length === 0) {
            const reply = `@${event.user.username}, you need to register and deposit / earn BITCORN in order to make it rain!`;
            tmi.botSay(event.target, reply);

            await mysql.logit('Rain.Execute', `${event.user.username} is not Registered, No Bal, Cannot Rain`);

            return pending.complete(event, reply);
        }

        const getbalance = await wallet.makeRequest('getbalance', [event.user.username]);
        
        const from_record = from_result[0];
        const from_info = {
            cornaddy: from_record.cornaddy,
            balance: math.fixed8(getbalance.json.result)
        }

        if (from_info.balance < rain_amount) {
            const reply = `@${event.user.username}, You do not have enough in your balance! (${from_info.balance} CORN)`;
            tmi.botWhisper(event.user.username, reply);

            await mysql.logit('Rain.Execute', `${event.user.username} Tried Raining but does not have enough funds! (${from_info.balance} CORN)`);

            return pending.complete(event, reply);
        }

        const per_user = rain_amount / rain_user_count;


        const rain_amount_per_user = per_user % 1 > 0 ? math.fixed(per_user, 8) : per_user;

        if(rain_amount_per_user > wallet_max_transaction_amount) {
            const reply = `@${event.user.username}, rain is limited to a maximum ${wallet_max_transaction_amount} CORN per user!`;
            tmi.botSay(event.target, reply);

            return pending.complete(event, reply);
        }

        const ommit_usernames = [
            "nightbot",
            "cttvbotcorn",
            "bitcornhub",
            "stay_hydrated_bot",
            "bitcornhub"
        ];

        const channel = event.target.replace('#', '');
        const activitytracking_result = await mysql.query(`SELECT * FROM activitytracking WHERE channel LIKE '${channel}' ORDER BY id DESC LIMIT ${activitytracking_query_limit}`);
        const active_user_promises = [];
        const active_user_names = [];

        const walletSend = {
            batch: {},
            count: 0,
            total: 0
        };

        for (let i = 0; i < activitytracking_result.length && active_user_promises.length < rain_user_count; i++) {
            const tousername = activitytracking_result[i].twitch_username.toLowerCase();
            if (ommit_usernames.indexOf(tousername) !== -1) continue;
            if (active_user_names.indexOf(tousername) !== -1) continue;
            if (tousername === fromusername) continue;
            active_user_names.push(tousername);
            active_user_promises.push(new Promise(async resolve => {

                const to_result = await mysql.query(`SELECT * FROM users WHERE twitch_username LIKE '${tousername}'`);
                if (to_result.length === 0) {
                    resolve({ success: false, message: `@${fromusername}, the user ${tousername} is not registered (Register with: $reg)` });
                    return;
                }

                const to_record = to_result[0];

                walletSend.batch[to_record.cornaddy] = {
                    amount: math.fixed8(rain_amount_per_user),
                    username: tousername
                };
                walletSend.total += math.fixed8(rain_amount_per_user);
                walletSend.count++;

                resolve({ success: true, username: tousername });
            }));
        }

        const results = await Promise.all(active_user_promises);

        const sent_to = [];
        const sent_error = [];
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.success === true) {
                sent_to.push(result.username);

                await mysql.logit('Rain.Execute', `Raining by ${fromusername} to ${result.username} ${rain_amount_per_user} CORN`);
            } else {
                sent_error.push(result.message);

                await mysql.logit('Rain.Execute', `ERROR: ${result.message}`);
            }
        }

        if (sent_to.length > 0) {

            for (const cornaddy in walletSend.batch) {
                const item = walletSend.batch[cornaddy];
                
                const promise = new Promise(async (resolve) => {

                    const { json } = await wallet.makeRequest('sendfrom', [
                        fromusername,
                        cornaddy,
                        math.fixed8(item.amount),
                        0,
                        `${fromusername} Rained ${item.username}`,
                        `${fromusername} rained on ${item.username}`
                    ]);

                    if (json.error) {
                        await mysql.logit('Rain.Execute', `${fromusername} Tried Raining but does not have enough funds! (${from_info.balance} CORN)`);
        
                        console.log(`Transaction from ${fromusername} to ${item.username} canceled msg=${event.msg}, can not send wallet error message: ${json.error.message}`);
                    
                        resolve({success: false, json: json});
                    } else {                   
                        txMonitor.monitorInsert({
                            account: item.username,
                            amount: math.fixed8(item.amount),
                            txid: json.result,
                            cornaddy: cornaddy,
                            confirmations: '0',
                            category: 'receive',
                            timereceived: mysql.timestamp(),
                            comment: `${fromusername} rained on ${item.username}`
                        });

                        resolve({success: true, json: json});
                    }
                });
                wallet.enqueueItem(promise);
            }

            tmi.botSay(event.target, `@${fromusername} is raining ${rain_amount_per_user} $BITCORN to the last ${walletSend.count} of ${rain_user_count} active chatters!`);

            tmi.botWhisper(fromusername, `Rained on: ${sent_to.join(', ')}`);
            for (let i = 0; i < sent_to.length; i++) {
                const item_name = sent_to[i];
                tmi.botWhisper(item_name, `You received a gift from a CryptoTradersTV's community member ${fromusername}!  Your BITCORN balance has been credited ${rain_amount_per_user} $BITCORN - ENJOY!`);
            }
        } else if (sent_error.length > 0) {
            tmi.botWhisper(fromusername, `Rained failed reason(s): ${sent_error.join(', ')}`);
        } else {
            tmi.botWhisper(fromusername, `Something went wrong with the rain command`);
        }

        return pending.complete(event);
    }
});