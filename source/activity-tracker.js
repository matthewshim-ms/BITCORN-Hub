/*

*/

"use strict";

const tmi = require('./config/tmi');


const MAX_RAIN_USER_CACHE = 100 * 1.4;
const activeChatters = {};
const cursorIndex = {};

async function onChatMessage(target, user, msg, self) {
    const event = Object.create({ target, user, msg, self });
    if (event.self) { return { success: false, message: `self`, event }; }
    addToActiveChatters(target, event.user['user-id'], event.user.username);
}

const ommit_usernames = [
    "nightbot",
    "cttvbotcorn",
    "bitcornhub",
    "stay_hydrated_bot"
];

function addToActiveChatters(target, id, username) {
    if (ommit_usernames.indexOf(username) !== -1) return;

    if(activeChatters[target] === undefined) {
        activeChatters[target] = [];
    }
    if(cursorIndex[target] === undefined) {
        cursorIndex[target] = -1;
    }

    cursorIndex[target] = (cursorIndex[target] + 1) % MAX_RAIN_USER_CACHE;
    activeChatters[target][cursorIndex[target]] = { id, username };
}

function getChatterActivity(target) {

    if(activeChatters[target] === undefined) return [];
    
    const chatternames = {};
    for (let index = 0; index < activeChatters[target].length; index++) {
        const username = activeChatters[target][index].username;
        const id = activeChatters[target][index].id;
        if (!chatternames[username]) chatternames[username] = { id, username, count: 0 };
        chatternames[username].count++;
    }

    const chatternamesArr = [];
    for (const key in chatternames) {
        chatternamesArr.push(chatternames[key]);
    }

    chatternamesArr.sort((a, b) => b.count - a.count);

    return chatternamesArr;
}

async function init() {

    tmi.addMessageCallback(onChatMessage);

    return { success: true, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
}

exports.init = init;
exports.getChatterActivity = getChatterActivity;
