'use strict';

const bitcoin = require('bitcoinjs-lib');
const txRefConversion = require("txref-conversion-js");


let BTCR_PREFIX = "did:btcr:";
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


const ensureTxref = function (txrefCandidate) {
    if (!txrefCandidate) {
        throw "Missing txrefCandidate";
    }

    var txref = txrefCandidate;
    if (txrefCandidate.startsWith(BTCR_PREFIX)) {
        txref = txrefCandidate.substr(BTCR_PREFIX.length);
    }

    if (!txref.startsWith("txtest") && txref.startsWith("x")) {
        txref = "txtest1-" + txref;
    } else if (!txref.startsWith("tx")) {
        txref = "tx1-" + txref;
    }
    return txref;
};

const ensureBtcrDid = function (btcrDidCandidate) {
    if (!btcrDidCandidate) {
        throw "Missing btcrDidCandidate";
    }

    var btcrDid = btcrDidCandidate;
    if (btcrDid.startsWith("txtest1-")) {
        btcrDid = btcrDid.substr("txtest1-".length);
    } else if (btcrDid.startsWith("tx1-")) {
        btcrDid = btcrDid.substr("tx1-".length);
    }

    if (!btcrDid.startsWith(BTCR_PREFIX)) {
        return btcrDid = BTCR_PREFIX + btcrDid;
    }

    return btcrDid;
};

const btcrDidify = function(txDetails) {
    let txDetailsCopy = JSON.parse(JSON.stringify(txDetails));
    txDetailsCopy.txref = ensureBtcrDid(txDetails.txref);
    return txDetailsCopy;
}


async function extractPublicKeyHexFromTxref(txref) {
    let cleanedTxref = ensureTxref(txref);
    let txDetails = await txRefConversion.txDetailsFromTxref(cleanedTxref);
    let script = txDetails.inputs[0].script;
    let pub = extractPublicKeyHexFromScript(script);
    return pub;
}


async function txDetailsFromTxref(txref) {
    let cleanedTxref = ensureTxref(txref);
    let txDetails = await txRefConversion.txDetailsFromTxref(cleanedTxref);
    return btcrDidify(txDetails);
}

async function txDetailsFromTxid(txid, chain, utxoIndex) {
    let txDetails = await txRefConversion.txDetailsFromTxid(txid, chain, utxoIndex);
    return btcrDidify(txDetails);
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
    publicKeyHexFromWif: publicKeyHexFromWif,
    txDetailsFromTxref: txDetailsFromTxref,
    txDetailsFromTxid: txDetailsFromTxid
};