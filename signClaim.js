var bitcoin = require('bitcoinjs-lib');
var jsonld = require('jsonld');
var jsig = require('jsonld-signatures');
jsig.use('jsonld', jsonld);


let wif = process.env.WIF;

let network = bitcoin.networks.testnet;

// TODO: I'm not sure if this is correct
let keyPair = bitcoin.ECPair.fromWIF(wif, network);
let publicKeyBuffer = keyPair.getPublicKeyBuffer();
let publicKeyHex = publicKeyBuffer.toString("hex");


let label = "kimh-knows-christophera";
let did = "did:btcr:xgjd-xzvz-qq03-7as7";
let did0 = did + "/0#did-transaction-key";
let claimId = did + "/1#" + label;
let recipientDid = "did:btcr:xyv2-xzyq-qqm5-tyke";
let relationship = "colleague";
let issuedDate = "2017-07-17";
let alternateName = "christophera";


let claim = {
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

let testPublicKeyFriendly = "ecdsa-koblitz-pubkey:" + publicKeyHex;

/*
let claimToCountersign = {
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
  }};
*/


jsig.sign(claim, {
  algorithm: 'EcdsaKoblitzSignature2016',
  privateKeyWif: wif,
  creator: testPublicKeyFriendly
}, function(err, signedDocument) {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  // If countersigning....
  /*
  var signature = signedDocument.signature;
  var originalSignature = {
    "type": "EcdsaKoblitzSignature2016",
    "created": "2017-07-17T18:41:40Z",
    "creator": "ecdsa-koblitz-pubkey:036abdaaa4db47ba2c0b81ad9bbf7be85d04f0fd50a62c6754499ac299a7647270",
    "signatureValue": "IPYL4YW8/G0m+EFiGBWoyF3rC3xqDntN2pZesAZFLwrVDg7OfB2KPtKPBBwMvcAWfroqKdY0m1Z8lJae0dlHvyQ="
  };
  signedDocument.signature = [originalSignature, signature];
  */

  console.log(JSON.stringify(signedDocument, null, 4));
});