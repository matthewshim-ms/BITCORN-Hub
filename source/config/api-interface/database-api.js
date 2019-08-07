
/*
request_result1.refused
*/

"use strict";

const rooturl = require('./rooturl');
const apiRequest = require('./api-request');
const JsonFile = require('../../utils/json-file');

function DatabaseEndpoint() {

    this.MAX_AMOUNT = 100000000000;
    this.MAX_RAIN_USERS = 10;

    this.sql_db_auth = new JsonFile(`./settings/sql_db_auth.json`, {
        url: '',
        client_id: '',
        client_secret: '',
        audience: ''
    });

    this.db_endpoints = new JsonFile('./settings/db_endpoints.json', {
        bitcorn: '/insertuser',
        getuser: '/getuser',
        rain: '/rain',
        subticker: '/payout',
        tipcorn: '/tipcorn',
        withdraw: '/withdraw',
        token: '/token'
    });

    this.paymentCode = {
        InternalServerError: -6,
        InvalidPaymentAmount: -5,
        DatabaseSaveFailure: -4,
        NoRecipients: -3,
        InsufficientFunds: -2,
        QueryFailure: -1,
        Success: 1
    }

    this.walletCode = {
        InsufficientFunds: -4,
        QueryFailure: -3,
        InternalServerError: -2,
        WalletError: -1,
        Success: 1
    }
}

DatabaseEndpoint.prototype.makeRequest = async function (endpoint, data) {
    const { access_token } = await apiRequest.fetchToken(this.sql_db_auth.getValues());
    const baseUrl = rooturl.getValues().database;
    return apiRequest.makeRequest(`${baseUrl}${endpoint}`, access_token, data);
}

DatabaseEndpoint.prototype.criticalRequest = async function (endpoint, twitchId, data) {
    const { access_token } = await apiRequest.fetchToken(this.sql_db_auth.getValues());
    const baseUrl = rooturl.getValues().database;
    return apiRequest.criticalRequest(`${baseUrl}${endpoint}`, twitchId, access_token, data);
}

DatabaseEndpoint.prototype.getuserRequest = async function (twitchId, twitchUsername) {
    return this.makeRequest(`${this.db_endpoints.getValues().getuser}`, {
        twitchId,
        twitchUsername
    });
}

DatabaseEndpoint.prototype.tokenRequest = async function (token, twitchId, twitchUsername) {
    return this.makeRequest(`${this.db_endpoints.getValues().token}`, {
        twitchId,
        twitchUsername,
        token
    });
}

/*
    Critical with arbitrary body data
*/
DatabaseEndpoint.prototype._criticalArbitraryRequest = async function (path, twitchId, data) {
    return this.criticalRequest(`${path}`, twitchId, data);
}

/*
    Critical with recipients
*/
DatabaseEndpoint.prototype._criticalRecipientsRequest = async function (path, recipients, twitchId, twitchUsername) {
    //recipients = [recipient = { twitchId: '', twitchUsername: '', amount: 0 }]
    return this._criticalArbitraryRequest(`${path}`, twitchId, {
        recipients,
        twitchId,
        twitchUsername
    });
}

// With arbitrary body data
DatabaseEndpoint.prototype.bitcornRequest = async function (twitchId, twitchUsername) {
    return this._criticalArbitraryRequest(`${this.db_endpoints.getValues().bitcorn}`, twitchId, {
        twitchId,
        twitchUsername
    });
}

/*
Expect code: this.walletCode
*/
DatabaseEndpoint.prototype.withdrawRequest = async function (twitchId, twitchUsername, amount, cornaddy) {
    return this._criticalArbitraryRequest(`${this.db_endpoints.getValues().withdraw}`, twitchId, {
        twitchId,
        twitchUsername,
        amount,
        cornaddy
    });
}

// With recipients
/*
Expect code: this.paymentCode
*/
DatabaseEndpoint.prototype.rainRequest = async function (recipients, twitchId, twitchUsername) {
    return this._criticalRecipientsRequest(`${this.db_endpoints.getValues().rain}`, recipients, twitchId, twitchUsername);
}

/*
Expect code: this.paymentCode
*/
DatabaseEndpoint.prototype.tipcornRequest = async function (senderId, senderName, receiverId, receiverName, amount) {
    return this._criticalArbitraryRequest(`${this.db_endpoints.getValues().tipcorn}`, senderId, {
        senderId,
        senderName,
        receiverId,
        receiverName,
        amount
    });
}

/*
Expect code: this.paymentCode
*/
DatabaseEndpoint.prototype.subtickerRequest = async function (recipients, twitchId, twitchUsername) {
    return this._criticalRecipientsRequest(`${this.db_endpoints.getValues().subticker}`, recipients, twitchId, twitchUsername);
}

module.exports = new DatabaseEndpoint();