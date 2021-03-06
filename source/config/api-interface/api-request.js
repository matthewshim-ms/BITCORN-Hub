
/*

*/

"use strict";

const fetch = require('node-fetch');

const cached = {
    access_token: null,
    expires_in: 0,
    expires_time: 0
};

async function getCachedToken(client_credentials) {
    const d = new Date();
    const seconds = Math.round(d.getTime() / 1000);
    const secondsOff = 60;

    if (seconds > cached.expires_time) {
        const result = await fetchToken(client_credentials);
        cached.access_token = result.access_token;
        cached.expires_in = result.expires_in;
        cached.expires_time = (seconds + cached.expires_in) - secondsOff;
    }
    return { access_token: cached.access_token };
}

async function fetchToken(client_credentials) {

    const options = {
        method: 'POST',
        header: {
            'Content-Type': 'application/json'
        },
        body: new URLSearchParams({
            client_id: client_credentials.client_id,
            client_secret: client_credentials.client_secret,
            audience: client_credentials.audience,
            grant_type: 'client_credentials'
        })
    };

    return fetch(client_credentials.url, options)
        .then(res => res.json())
        .catch(e => e);
}

async function _request(url, twitchId, access_token, data) {
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(data)
    };

    if (twitchId) options.headers.twitchId = twitchId;

    return fetch(url, options)
        .then(res => {
            if (res.status !== 200) return res;
            return res.json();
        })
        .catch(e => e);
}

async function makeRequest(url, access_token, data) {
    return _request(url, null, access_token, data);
}

async function criticalRequest(url, twitchId, access_token, data) {
    return _request(url, twitchId, access_token, data);
}

module.exports = {
    getCachedToken,
    makeRequest,
    criticalRequest
};