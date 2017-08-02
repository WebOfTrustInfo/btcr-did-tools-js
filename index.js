const createBtcrDid = require("./createBtcrDid");
const signClaim = require("./signClaim");
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


const toDeterministicDid = function (txDetails, txref) {
  const result = {
    "@context": ["https://schema.org/", "https://w3id.org/security/v1"]
  };

  const fundingTxid = txDetails.inputs[0].previousHash;
  const fundingScript = txDetails.inputs[0].script;
  const pubKey = extractCompressedPublicKey(fundingScript);

  return txRefConversion.txidToTxref(fundingTxid, txDetails.chain)
    .then(fundingTxref => {
      const inputValue = txDetails.inputs[0].outputValue * SATOSHI_TO_BTC;
      const ownerDid = "did:btcr:" + txref.substring(txref.indexOf('-') + 1);

      let ddoHex = null;
      let ddoAsm = null;
      let ddoText = null;
      let proofType = null;
      let outputValue = 0;
      let outputAddress = null;
      for (let i = 0; i < txDetails.outputs.length; i++) {
        const output = txDetails.outputs[i];
        if (output.dataString != null) {
          ddoHex = output.script;
          ddoAsm = "OP_RETURN " + output.dataHex;
          ddoText = output.dataString;
        } else {
          proofType = output.scriptType;
          outputValue = output.outputValue * SATOSHI_TO_BTC;
          outputAddress = output.addresses[0];
        }
      }

      const burnFee = outputValue - inputValue;

      const ddo = {
        "txid": txDetails.txHash,
        "funding-txid": fundingTxid,
        "funding-txref": fundingTxref,
        "hash": txDetails.txHash,
        "more-ddo-hex": ddoHex,
        "more-ddo-asm": ddoAsm,
        "more-ddo-txt": ddoText,
        "owner": [
          {
            "id": ownerDid,
            "type": ["CryptographicKey", "EdDsaSAPublicKey", "update-proof"],
            "curve": "secp256k1",
            "publicKeyHex": pubKey
          }
        ],
        "control": [
          {
            "control-bond": parseFloat(outputValue.toFixed(COIN_DECIMAL_PRECISION)),
            "rotate-proof": [
              {
                "proof-type": proofType,
                "hash-base58check": outputAddress
              }
            ],
            "revocation-proof": [
              {
                "bond-value": parseFloat(outputValue.toFixed(COIN_DECIMAL_PRECISION)),
                "proof-type": proofType,
                "hash-base58check": outputAddress
              }
            ]
          }
        ]
      };
      const signature = {
        "type": "SatoshiBlockchainSignature2017",
        "id": ownerDid,
        "chain": txDetails.chain,
        "blockhash": txDetails.blockHash,
        "blockindex": txDetails.blockIndex,
        "blocktime": txDetails.txConfirmed,
        "confirmations": txDetails.numConfirmations,
        "time": txDetails.txReceived,
        "timereceived": txDetails.txReceived,
        "burn-fee": parseFloat(burnFee.toFixed(COIN_DECIMAL_PRECISION))
      };
      result.ddo = ddo;
      result.signature = signature;

      return result;
    })
    .catch(error => {
      console.error(error);
      throw error;
    });
};

const chainDdo = function (formatted, txDetails) {
  if (formatted.ddo['more-ddo-txt'] != null) {
    return txRefConversion.promisifiedRequest({"url": formatted.ddo['more-ddo-txt']})
      .then(frag1 => {
        return {
          "txDetails": txDetails,
          "deterministicDdo": formatted,
          "fragment1": JSON.parse(frag1)
        };
      })
  } else {
    return {
      "txDetails": txDetails,
      "deterministicDdo": formatted
    };
  }
};

const getDeterministicDdoFromTxref = function (txref) {
  return txRefConversion.txDetailsFromTxref(txref)
    .then(txDetails => {
      this.txDetails = txDetails;
      return toDeterministicDid(txDetails, txref)
    })
    .then(formatted => {
      return chainDdo(formatted, this.txDetails);
    })
    .catch(error => {
      console.error(error);
      throw error;
    });
};


const getDeterministicDdoFromTxid = function (txid, chain) {
  return txRefConversion.txDetailsFromTxid(txid, chain)
    .then(txDetails => {
      this.txDetails = txDetails;
      return toDeterministicDid(txDetails, txDetails.txref)
    })
    .then(formatted => {
      return chainDdo(formatted, this.txDetails);
    })
    .catch(error => {
      console.error(error);
      throw error;
    });
};


module.exports = {
  signClaim: signClaim,
  createBtcrDid: createBtcrDid,
  getDeterministicDdoFromTxref: getDeterministicDdoFromTxref,
  getDeterministicDdoFromTxid: getDeterministicDdoFromTxid
};

/*
getDeterministicDdoFromTxref("txtest1-xyv2-xzyq-qqm5-tyke").then(dddo => {
  console.log(dddo);
}, error => {
  console.error(error)
});
*/

