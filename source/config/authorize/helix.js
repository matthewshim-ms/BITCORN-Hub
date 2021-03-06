/*

*/

"use strict";

const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
const auth = require('../../../settings/auth');

function Authenticated() {
    this.access_token = '';
    this.token_type = '';
    this.scope = '';
    this.expires_in = 0;
    this.refresh_token = '';
    this.id_token = '';
}

const authenticated = new Authenticated();

const channel = {
    user_id: 0,
    status: ''
};
const appOptions = {
    scope: [
        'user:edit:broadcast',
        'user:edit',
        'user:read:email',
        'analytics:read:games',
        'bits:read'
    ].join(' ')
};

function authUrl() {
    
    appOptions.client_id = auth.data.HELIX_CLIENT_ID;
    appOptions.client_secret = auth.data.HELIX_SECRET;
    appOptions.redirect_uri = auth.data.HELIX_CALLBACK_URL;

    const urlParams = [
        `client_id=${appOptions.client_id}`,
        `redirect_uri=${encodeURIComponent(appOptions.redirect_uri)}`,
        `response_type=code`,
        `scope=${encodeURIComponent(appOptions.scope)}`,
        `state=bot-twitch-api-app`
    ];
    const urlQuery = urlParams.join('&');

    return `https://id.twitch.tv/oauth2/authorize?${urlQuery}`;
}

async function authenticateCode(code) {

    const url = `https://id.twitch.tv/oauth2/token`;

    const form = {
        client_id: appOptions.client_id,
        client_secret: appOptions.client_secret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: appOptions.redirect_uri
    };

    const headers = {
        'Authorization': 'Basic ' + (Buffer.from(appOptions.client_id + ':' + appOptions.client_secret).toString('base64'))
    };

    const options = { headers: headers, method: 'POST', body: new URLSearchParams(form) };

    const json = await fetch(url, options)
        .then(res => res.json())
        .catch(error => { error });

    if (json.error) {
        return { success: false, error: json.error };
    }

    authenticated.access_token = json.access_token;
    authenticated.refresh_token = json.refresh_token;
    authenticated.scope = json.scope;
    authenticated.expires_in = json.expires_in;

    await keepAlive();
};

async function keepAlive() {

    const url = 'https://id.twitch.tv/oauth2/token';

    const form = {
        grant_type: 'refresh_token',
        refresh_token: authenticated.refresh_token,
        client_id: appOptions.client_id,
        client_secret: appOptions.client_secret,
    };

    const headers = {
        'Authorization': 'Basic ' + (Buffer.from(appOptions.client_id + ':' + appOptions.client_secret).toString('base64'))
    };

    const options = { headers: headers, method: 'POST', body: new URLSearchParams(form) };

    const json = await fetch(url, options)
        .then(res => res.json())
        .catch(error => { error });

    if (json.error) {
        return { success: false, error: json.error };
    }

    authenticated.access_token = json.access_token;
    authenticated.token_type = json.token_type;
    authenticated.expires_in = json.expires_in;

    setTimeout(keepAlive, (authenticated.expires_in - 1000) * 1000);

    const result = await getUser();
    channel.user_id = result.id;
}

function getAuthorizedOptions(access_token) {
    return {
        headers: {
            'Authorization': 'Bearer ' + access_token,
            'Content-Type': 'application/json'
        }
    };
}

async function getEndpoint(url) {
    const result = await fetch(url, getAuthorizedOptions(authenticated.access_token))
        .then(res => res.json())
        .catch(error => { error });

    if (result.error) {
        return { success: false, message: result.error.message, error: result.error };
    }

    if (result.data) {
        if (result.data.length > 0) {
            result.data[0].success = true;
            return result.data[0];
        } else {
            return { success: false, message: `The stream seems to be offline.` };
        }
    }

    return { success: false, message: `Fetch endpoint ${url} failed.` };
}

async function getUserLogin(user_name) {
    return getEndpoint(`https://api.twitch.tv/helix/users?login=${user_name}`);
}

async function getUser() {
    return getEndpoint(`https://api.twitch.tv/helix/users`);
}

async function getStream() {
    return getStreamById(channel.user_id);
}

async function getStreamById(user_id) {
    return getEndpoint(`https://api.twitch.tv/helix/streams?user_id=${user_id}`);
}

async function getUserFollows(to_user_id, from_user_id) {
    return getEndpoint(`https://api.twitch.tv/helix/users/follows?to_id=${to_user_id}&from_id=${from_user_id}`);
}

async function getGame(game_id) {
    return getEndpoint(`https://api.twitch.tv/helix/games?id=${game_id}`);
}

async function init(app) {
    app.on('connection', (socket) => {
        const lastIndex = socket.handshake.headers.referer.lastIndexOf('/');
        const clientName = socket.handshake.headers.referer.substring(lastIndex + 1, socket.handshake.headers.referer.length);

        if (clientName === 'control-panel') {
            socket.emit('login-helix', { name: 'helix', authenticated: channel.user_id });
        }
    });

    return { success: true, message: `${require('path').basename(__filename).replace('.js', '.')}init()` };
}

exports.init = init;
exports.authUrl = authUrl;
exports.authenticateCode = authenticateCode;
exports.getUser = getUser;
exports.getUserLogin = getUserLogin;
exports.getStream = getStream;
exports.getStreamById = getStreamById;
exports.getUserFollows = getUserFollows;
exports.getGame = getGame;