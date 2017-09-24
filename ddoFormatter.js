'use strict';

const txRefConversion = require("txref-conversion-js");

let COIN_DECIMAL_PRECISION = 4;
let COMPRESSED_PUBLIC_KEY_BYTE_LEN = 33;
let COMPRESSED_PUBLIC_KEY_HEX_LEN = COMPRESSED_PUBLIC_KEY_BYTE_LEN * 2;
let SATOSHI_TO_BTC = 0.00000001;

const extractCompressedPublicKey = function (script) {
  const b = new Buffer(script);

  const startIndex = b.length - COMPRESSED_PUBLIC_KEY_HEX_LEN;
  const pub = b.slice(startIndex);
  return pub;
};

let createUpdateDdo = function (outputAddress) {
  return {
    "capability": "UpdateDidDescription",
    "permittedProofType": [
      {
        "proofType": "SatoshiBlockchainSignature2017",
        "authenticationCredential": [
          {
            "type": [
              "EdDsaSAPublicKey",
              "CryptographicKey"
            ],
            "hash-base58check": outputAddress
          }
        ]
      }
    ]
  };
};

var keyCounter = 0;
/**
 * For each authentication credential
 *   - if missing an owner then add it
 *   - if missing id (special case if hex matches or not)
 *
 * @param authenticationCredential
 * @param btcrDid
 * @returns fixed auth credential
 */
let fixAuthenticationCredentials = function (authenticationCredential, btcrDid, publicKeyHex) {
  if (!authenticationCredential) {
    return [];
  }
  let fixed = authenticationCredential.reduce(
      (r, e, i, a) => {
        if (!e.owner) {
          e.owner = btcrDid;
        }
        if (!e.id) {
          if (e.publicKeyHex == publicKeyHex) {
            e.id = btcrDid + "/keys/fundingKey";
          } else {
            keyCounter++;
            e.id = btcrDid + "/keys/" + keyCounter.toString();
          }
        }
        r.push(e);
        return r;
      }, []);
  return fixed;
};

let fixPermittedProofTypes = function (permittedProofTypes, btcrDid, publicKeyHex) {
  let fixed = permittedProofTypes.reduce(
      (r1, e1) => {
        var fixed2 = fixAuthenticationCredentials(e1.authenticationCredential, btcrDid, publicKeyHex);
        r1.push(fixed2);
        return r1;
      }, []);
  return fixed;
};


async function toDeterministicDid(txDetails, txref) {
  const result = {
    "@context": ["https://schema.org/", "https://w3id.org/security/v1"]
  };

  let btcrDidComponent = txref.substring(txref.indexOf('-') + 1);
  let btcrDid = "did:btcr:" + btcrDidComponent;
  const fundingScript = txDetails.inputs[0].script;
  let publicKeyHex = extractCompressedPublicKey(fundingScript).toString();
  let spendOutput = txDetails.outputs.find((o) => o.addresses);
  let proofType = spendOutput.scriptType;
  let outputAddress = spendOutput.addresses[0];
  let ddoUrl = txDetails.outputs.filter((o) => o.dataString).map(e => e.dataString).find(f => f);

  let ddoJson;

  if (ddoUrl) {
    let ddo1 = await txRefConversion.promisifiedRequest({"url": ddoUrl});
    ddoJson = JSON.parse(ddo1);
  }

  let authorizations = [];
  // create "update" capability, which belongs to the transaction output
  authorizations.push(createUpdateDdo(outputAddress));

  // for each authorization, if missing an entity then add it.
  // fix nested authorization proof types
  if (ddoJson && ddoJson.authorization) {
    let fixedAuthorizations = ddoJson.authorization.reduce(
        (r, e, i, a) => {
          if (!a.entity) {
            e.entity = btcrDid;
          }
          e.permittedProofType = fixPermittedProofTypes(e.permittedProofType, btcrDid, publicKeyHex);
          r.push(e);
          return r;
        }, []);
    fixedAuthorizations.forEach(e => authorizations.push(e));
  }
  result.authorization = authorizations;

  // fix authentication credentials
  let fixedAuthenticationCredential = fixAuthenticationCredentials(ddoJson.authenticationCredential, btcrDid, publicKeyHex);
  result.authenticationCredential = fixedAuthenticationCredential;

  const signature = {
    "type": "SatoshiBlockchainSignature2017",
    "id": btcrDid,
    "chain": txDetails.chain,
  };

  result.signature = signature;

  return result;

}

async function getDeterministicDdoFromTxref(txref) {
  let txDetails = await txRefConversion.txDetailsFromTxref(txref);
  let deterministicDid = await toDeterministicDid(txDetails, txref);
  return {
    "txDetails": txDetails,
    "ddo": deterministicDid,
  };
}

async function getDeterministicDdoFromTxid(txid, chain) {
  let txDetails = await txRefConversion.txDetailsFromTxid(txid, chain);
  let deterministicDid = await toDeterministicDid(txDetails, txDetails.txref);
  return {
    "txDetails": txDetails,
    "ddo": deterministicDid,
  };
}

// kim current: 67c0ee676221d9e0e08b98a55a8bf8add9cba854f13dda393e38ffa1b982b833
// christopher past: f8cdaff3ebd9e862ed5885f8975489090595abe1470397f79780ead1c7528107
/*
getDeterministicDdoFromTxref("txtest1-xkyt-fzgq-qq87-xnhn").then(dddo => {
  console.log(JSON.stringify(dddo, null, 4));
}, error => {
  console.error(error)
});*/

module.exports = {
  getDeterministicDdoFromTxref: getDeterministicDdoFromTxref,
  getDeterministicDdoFromTxid: getDeterministicDdoFromTxid
};
