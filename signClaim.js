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

jsig.sign(claim, {
  algorithm: 'EcdsaKoblitzSignature2016',
  privateKeyWif: wif,
  creator: testPublicKeyFriendly
}, function(err, signedDocument) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(signedDocument);
});