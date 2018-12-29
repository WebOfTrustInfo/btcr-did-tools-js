'use strict';

const bitcoin = require('bitcoinjs-lib');
const txRefConversion = require("txref-conversion-js");


let BTCR_PREFIX = "did:btcr:";
let TXREF_MAIN_PREFIX = "tx1:";
let TXREF_TEST_PREFIX = "txtest1:";

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

    if (txref.startsWith(TXREF_TEST_PREFIX) || txref.startsWith(TXREF_MAIN_PREFIX)) {
        return txref;
    }

    if (txref.startsWith("x") || txref.startsWith("8")) {
        txref = TXREF_TEST_PREFIX + txref;
    } else if (txref.startsWith("r") || txref.startsWith("y")) {
        txref = TXREF_MAIN_PREFIX + txref;
    } else {
        throw "this isn't a txref candidate: " + txref;
    }
    return txref;
};

const ensureBtcrDid = function (btcrDidCandidate) {
    if (!btcrDidCandidate) {
        throw "Missing btcrDidCandidate";
    }

    var btcrDid = btcrDidCandidate;
    if (btcrDid.startsWith(TXREF_TEST_PREFIX)) {
        btcrDid = btcrDid.substr(TXREF_TEST_PREFIX.length);
    } else if (btcrDid.startsWith(TXREF_MAIN_PREFIX)) {
        btcrDid = btcrDid.substr(TXREF_MAIN_PREFIX.length);
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