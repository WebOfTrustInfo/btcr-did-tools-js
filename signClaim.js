const bitcoin = require('bitcoinjs-lib');
const jsonld = require('jsonld');
const jsig = require('jsonld-signatures');

let counterSign = false;

let wif = process.env.WIF;

let network = bitcoin.networks.testnet;

let label = "kimh-knows-christophera";
let did = "did:btcr:xgjd-xzvz-qq03-7as7";
let did0 = did + "/0#did-transaction-key";
let claimId = did + "/1#" + label;
let recipientDid = "did:btcr:xyv2-xzyq-qqm5-tyke";
let relationship = "colleague";
let issuedDate = "2017-07-17";
let alternateName = "christophera";

let claim = null;
if (counterSign) {
  claim = {
    "@context": [
      "https://schema.org/",
      "https://w3id.org/security/v1"
    ],
    "id": "did:btcr:xyv2-xzyq-qqm5-tyke/1#christophera-knows-kimh",
    "type": [
      "Credential",
      "Identity",
      "Person"
    ],
    "issuer": "did:btcr:xyv2-xzyq-qqm5-tyke/0#did-transaction-key",
    "issued": "2017-07-17",
    "label": "christophera-knows-kimh",
    "claim": {
      "knows": "did:btcr:xgjd-xzvz-qq03-7as7",
      "relationship": "colleague",
      "alternate-name": "KimH"
    },
    "signature": {
      "type": "EcdsaKoblitzSignature2016",
      "created": "2017-07-17T18:41:40Z",
      "creator": "ecdsa-koblitz-pubkey:036abdaaa4db47ba2c0b81ad9bbf7be85d04f0fd50a62c6754499ac299a7647270",
      "signatureValue": "IPYL4YW8/G0m+EFiGBWoyF3rC3xqDntN2pZesAZFLwrVDg7OfB2KPtKPBBwMvcAWfroqKdY0m1Z8lJae0dlHvyQ="
    }
  };
} else {
  claim = {
    "@context": ["https://schema.org/", "https://w3id.org/security/v1"],
    "id": claimId,
    "type": ["Credential", "Identity", "Person"],
    "issuer": did0,
    "issued": issuedDate,
    "label": label,
    "claim": {
      "knows": recipientDid,
      "relationship": relationship,
      "alternate-name": alternateName
    }
  };
}


const signClaim = function () {
// get public key
  let keyPair = bitcoin.ECPair.fromWIF(wif, network);
  keyPair.compressed = true;
  let publicKeyBuffer = keyPair.getPublicKeyBuffer();
  let publicKeyHex = publicKeyBuffer.toString('hex');

  let testPublicKeyFriendly = "ecdsa-koblitz-pubkey:" + publicKeyHex;

  let originalSignature = claim.signature;
  jsig.use('jsonld', jsonld);
  jsig.sign(claim, {
    algorithm: 'EcdsaKoblitzSignature2016',
    privateKeyWif: wif,
    creator: testPublicKeyFriendly
  }, function (err, signedDocument) {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    if (counterSign) {
      // add back original signature if counter signing
      const signature = signedDocument.signature;
      signedDocument.signature = [originalSignature, signature];
    }

    console.log(JSON.stringify(signedDocument, null, 4));
  });
};

module.exports = {
  signClaim: signClaim
};