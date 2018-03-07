'use strict';

const txRefConversion = require("txref-conversion-js");
const util = require("./util");


var keyCounter = 1;

/**
 * For each authentication credential
 *   - if missing an owner then add it
 *   - if missing id (special case if hex matches or not)
 *
 * @param authenticationCredential
 * @param btcrDid
 * @param publicKeyHex
 * @returns fixed auth credential
 */
let fixPublicKeys = function (publicKeys, btcrDid, publicKeyHex) {
    if (!publicKeys) {
        return [];
    }

    let fixed = publicKeys.reduce(
        (r, e, i, a) => {
            if (!e.id) {
                throw "Error parsing supplemental DID; public key didn't contain an id"
            }
            if (!e.owner) {
                e.owner = btcrDid;
            }
            if (e.id.endsWith("#keys-1")) {
                throw "Error parsing supplemental DID; this tries to override key-1"
            } else if (e.publicKeyHex == publicKeyHex) {
                // do nothing; we've already added it
            } else if (e.id.startsWith("did:")) {
                // add it as is
                r.push(e);
            } else if (!e.id.startsWith("#")) {
                // this is defined by the transaction; add the DID id
                throw "Error parsing supplemental DID; doesn't correspond to an expected format";
            } else {
                e.id = btcrDid + e.id;
                r.push(e);
            }
            return r;
        }, []);
    return fixed;
};

let fixPermittedProofTypes = function (permittedProofTypes, btcrDid, publicKeyHex) {
    let fixed = permittedProofTypes.reduce(
        (r1, e1) => {
            var fixed = fixAuthenticationCredentials(e1.authenticationCredential, btcrDid, publicKeyHex);
            r1.push(fixed);
            return r1;
        }, []);
    return fixed;
};

/**
 * TODO:
 * - if mutable store, check for signature
 * - determine how to find "did document" section from link. I.e. which type?
 * @param implicitDdo
 * @param txDetails
 * @param txref
 * @returns {Promise.<*>}
 */
async function addSupplementalDidDocuments(implicitDdo, txDetails, txref) {

    let ddo = implicitDdo;

    if (implicitDdo.service && implicitDdo.service.length == 1 && implicitDdo.service[0].serviceEndpoint) {
        let ddoUrl = implicitDdo.service[0].serviceEndpoint;
        let ddo1 = await txRefConversion.promisifiedRequest({"url": ddoUrl});
        let ddoJson = JSON.parse(ddo1).didDocument;

        // append public keys
        let fixedPublicKeys = fixPublicKeys(ddoJson.publicKey,
            implicitDdo.id,
            implicitDdo.publicKey[0].publicKeyHex);
        fixedPublicKeys.forEach(e => ddo.publicKey.push(e));

        // append all authentications
        if (ddoJson && ddoJson.authentication) {
            ddoJson.authentication.forEach(e => ddo.authentication.push(e));
        }

        // append all services
        if (ddoJson && ddoJson.service) {
            ddoJson.service.forEach(e => ddo.service.push(e));
        }

        return ddo;
    }

}

async function retrieveDdoFragment(ddoUrl) {
    let ddo1 = await txRefConversion.promisifiedRequest({"url": ddoUrl});
    let ddoJson = JSON.parse(ddo1).didDocument;
    return ddoJson;
}


/**r
 * TODO
 * - Update remaining satoshi proof elements
 * @param txDetails
 * @param txref
 * @returns {{@context: string, id: string, publicKey: [null], authentication: [null], SatoshiAuditTrail: [null]}}
 */
function toImplicitDidDocument(txDetails, txref) {
    if (!txDetails) {
        throw "Missing txDetails argument";
    }
    if (!txref) {
        throw "Missing txref argument";
    }

    const result = {
        "@context": ["https://schema.org/", "https://w3id.org/security/v1"]
    };

    let btcrDidComponent = txref; // txref.substring(txref.indexOf('-') + 1); // ?
    let btcrDid = "did:btcr:" + btcrDidComponent;
    let fundingScript = txDetails.inputs[0].script;
    let publicKeyHex = util.extractPublicKeyHexFromScript(fundingScript).toString();
    let ddoUrl = txDetails.outputs.filter((o) => o.dataString).map(e => e.dataString).find(f => f);

    let ddoJson = {
        "@context": "https://w3id.org/btcr/v1",
        "id": btcrDid,
        "publicKey": [{
            "id": btcrDid + "#keys-1",
            "owner": btcrDid,
            "type": "EdDsaSAPublicKeySecp256k1",
            "publicKeyHex": publicKeyHex.toString()
        }],
        "authentication": [{
            "type": "EdDsaSAPublicKeySecp256k1Authentication",
            "publicKey": "#keys-1"
        }],
        "SatoshiAuditTrail": [{
            "chain": txDetails.chain,
            "blockhash": txDetails.blockHash,
            "blockindex": txDetails.blockIndex,
            "outputindex": 1,
            "blocktime": txDetails.txReceived,
            "time": 1499501000,
            "timereceived": txDetails.txReceived,
            "burn-fee": -0.05
        }]
    };

    if (ddoUrl) {
        ddoJson.service = [{
            "type": "BTCREndpoint",
            "serviceEndpoint": ddoUrl,
            "timestamp": txDetails.timereceived // TODO
        }];
    }

    return ddoJson;
}

async function toDidDocument(txDetails, txref) {
    let implicitDdo = toImplicitDidDocument(txDetails, txref);
    let implicitDdoCopy = JSON.parse(JSON.stringify(implicitDdo));

    let result = {
        "txDetails": txDetails,
        "ddophase1": implicitDdo
    };

    if (implicitDdo.service && implicitDdo.service.length == 1 && implicitDdo.service[0].serviceEndpoint) {
        let ddoJson = await retrieveDdoFragment(implicitDdo.service[0].serviceEndpoint);
        result.ddophase2 = ddoJson;
        let ddo = await addSupplementalDidDocuments(implicitDdoCopy, txDetails, txref);
        result.ddo = ddo;
        result.ddophase3 = ddo;

    } else {
        result.ddo = implicitDdoCopy;
        result.ddophase3 = implicitDdoCopy;
    }

    return result;
}

async function resolveFromTxref(txref) {
    if (!txref) {
        throw "Missing txref argument";
    }
    let cleanedTxref = util.ensureTxref(txref);
    let txDetails = await txRefConversion.txDetailsFromTxref(cleanedTxref);
    let deterministicDid = await toDidDocument(txDetails, cleanedTxref);
    return deterministicDid;
}

async function resolveFromTxid(txid, chain) {
    if (!txid) {
        throw "Missing txid argument";
    }
    if (!chain) {
        throw "Missing chain argument";
    }
    let txDetails = await txRefConversion.txDetailsFromTxid(txid, chain);
    let deterministicDid = await toDidDocument(txDetails, util.ensureTxref(txDetails.txref));
    return deterministicDid;
}



resolveFromTxref("xkyt-fzgq-qq87-xnhn").then(dddo => {
  console.log(JSON.stringify(dddo, null, 4));
}, error => {
  console.error(error)
});

/*
resolveFromTxid("f8cdaff3ebd9e862ed5885f8975489090595abe1470397f79780ead1c7528107", "testnet").then(dddo => {
  console.log(JSON.stringify(dddo, null, 4));
}, error => {
  console.error(error)
});*/

module.exports = {
    resolveFromTxref: resolveFromTxref,
    resolveFromTxid: resolveFromTxid
};
