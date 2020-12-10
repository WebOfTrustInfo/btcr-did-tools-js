'use strict';

const txRefConversion = require("txref-conversion-js");
const util = require("./util");
const forge = require('node-forge');
const {util: {binary: {base58}}} = forge;


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

async function retrieveEndpointFragments(ddoUrl) {
    let ddo1 = await txRefConversion.promisifiedRequest({"url": ddoUrl});
    return [ddo1];
}


/**r
 * TODO
 * - Update remaining satoshi proof elements
 * @param txDetails
 * @param txref
 * @returns {{@context: string, id: string, publicKey: [null], authentication: [null], SatoshiAuditTrail: [null]}}
 */
async function toImplicitDidDocument(txDetails, txref) {
    if (!txDetails) {
        throw "Missing txDetails argument";
    }
    if (!txref) {
        throw "Missing txref argument";
    }

    /*const ddoResult = {
        "@context": ["https://schema.org/", "https://w3id.org/security/v1"]
    };*/

    let ddoResult = {};

    let btcrDid = txref;
    let fundingScript = txDetails.inputs[0].script;
    let publicKeyHex = util.extractPublicKeyHexFromScript(fundingScript).toString();
    let publicKeyBase58 = base58.encode(new Buffer(publicKeyHex, "hex"));
    let ddoUrl = txDetails.outputs.filter((o) => o.dataString).map(e => e.dataString).find(f => f);

    if (ddoUrl) {
        let explicitDdoRaw = await retrieveEndpointFragments(ddoUrl);
        try {
            let explicitDdo = JSON.parse(explicitDdoRaw);
            ddoResult['explicitDdo'] = explicitDdo;
        } catch (e) {
            ddoResult['raw'] = explicitDdoRaw;
            ddoResult['error'] = e.toString();
        }
    } else {
        ddoResult['implicitDdo']  = {
            "@context": "https://w3id.org/btcr/v1",
            "id": btcrDid,
            "publicKey": [{
                "id": btcrDid + "#satoshi",
                "controller": btcrDid,
                "type": "EcdsaSecp256k1VerificationKey2019",
                "publicKeyBase58": publicKeyBase58
            }, {
                "id": btcrDid + "#vckey-0",
                "controller": btcrDid,
                "type": "EcdsaSecp256k1VerificationKey2019",
                "publicKeyBase58": publicKeyBase58
            }],
            "authentication": ['#satoshi'],
            "assertionMethod": ["#vckey-0"],
            "SatoshiAuditTrail": [{
                "chain": txDetails.chain,
                "blockhash": txDetails.blockHash,
                "blockindex": txDetails.blockIndex,
                "outputindex": txDetails.utxoIndex,
                "blocktime": txDetails.txReceived,
                "time": 1499501000,
                "timereceived": txDetails.txReceived,
                "burn-fee": -0.05
            }]
        };
    }

    return ddoResult;
}

async function toDidDocument(txDetails, txref) {
    let ddoResult = await toImplicitDidDocument(txDetails, txref);

    let result = {
        "txDetails": txDetails,
        "ddoResult": ddoResult
    };

    return result;
}

async function resolveFromTxref(txref) {
    if (!txref) {
        throw "Missing txref argument";
    }
    let txDetails = await util.txDetailsFromTxref(txref);
    let deterministicDid = await toDidDocument(txDetails, txref);
    return deterministicDid;
}

async function resolveFromTxid(txid, chain, utxoIndex=0) {
    if (!txid) {
        throw "Missing txid argument";
    }
    if (!chain) {
        throw "Missing chain argument";
    }
    let txDetails = await util.txDetailsFromTxid(txid, chain, utxoIndex);
    let deterministicDid = await toDidDocument(txDetails, txDetails.txref);
    return deterministicDid;
}

/*
resolveFromTxref("did:btcr:xyv2-xzpq-q9wa-p7t").then(dddo => {
    console.log(JSON.stringify(dddo, null, 4));
}, error => {
    console.error(error)
});*/

/*
resolveFromTxid("11d8023bd6ef3afc621a019d939345d31a5afa65c93dd4aab6af5feb6a55f4f2", "mainnet").then(dddo => {
  console.log(JSON.stringify(dddo, null, 4));
}, error => {
  console.error(error)
});*/

module.exports = {
    resolveFromTxref: resolveFromTxref,
    resolveFromTxid: resolveFromTxid
};
