'use strict';

const bitcoin = require('bitcoinjs-lib');
const txRefConversion = require("txref-conversion-js");


let BTCR_PREFIX = "did:btcr";
let COMPRESSED_PUBLIC_KEY_BYTE_LEN = 33;
let COMPRESSED_PUBLIC_KEY_HEX_LEN = COMPRESSED_PUBLIC_KEY_BYTE_LEN * 2;

const extractPublicKeyHexFromScript = function (script) {
    if (!script) {
        throw "Missing script argument";
    }
    const b = new Buffer(script);
    const startIndex = b.length - COMPRESSED_PUBLIC_KEY_HEX_LEN;
    const pub = b.slice(startIndex);
    return pub;
};


const ensureTxref = function (txref) {
    if (!txref) {
        throw "Missing txRef";
    }

    if (txref.startsWith(BTCR_PREFIX)) {
        return txref.substr(BTCR_PREFIX.length + 1);
    }
};

async function extractPublicKeyHexFromTxref(txref) {
    let cleanedTxref = ensureTxref(txref);
    let txDetails = await txRefConversion.txDetailsFromTxref(cleanedTxref);
    let script = txDetails.inputs[0].script;
    let pub = extractPublicKeyHexFromScript(script);
    return pub;
}


const publicKeyHexFromWif = function (wif, network) {
    if (!wif) {
        throw "Missing wif argument";
    }
    if (!network) {
        throw "Missing network argument";
    }

    let keyPair = bitcoin.ECPair.fromWIF(wif, network);
    keyPair.compressed = true;
    let publicKeyBuffer = keyPair.getPublicKeyBuffer();
    let publicKeyHex = publicKeyBuffer.toString('hex');
    return publicKeyHex;
};

module.exports = {
    ensureTxref: ensureTxref,
    extractPublicKeyHexFromScript: extractPublicKeyHexFromScript,
    extractPublicKeyHexFromTxref: extractPublicKeyHexFromTxref,
    publicKeyHexFromWif: publicKeyHexFromWif
};