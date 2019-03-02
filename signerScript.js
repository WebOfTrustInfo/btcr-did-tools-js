const bitcoin = require('bitcoinjs-lib');
const jsonld = require('jsonld');
const jsig = require('jsonld-signatures');
const fs = require('fs');
const createBtcrDid = require('./createBtcrDid');

let network = bitcoin.networks.testnet;

let wif = process.env.WIF;

let names = ["Alice", "Bob", "Charles", "Dan", "Edward", "Fred",
	     "Giselle", "Harry", "Jessica", "Kim", "Laura", "Monica",
	     "Naomi", "Olivia", "Peter"];

let surnames = ["Allison", "Burton", "Ceed", "Daniels",
		"Garfield", "Garrick", "Gladstone", "Goody",
		"Hayhurst", "Hayley", "Holton", "Home",
		"Peyton", "Pickering", "Pinkerton", "Prescott"]

let randomString = function() {
    return Math.random().toString(36).replace(/[^a-z0-9]+/g, '').substr(0, 4);
}

function generateDid() {
    let uid = `${randomString()}-${randomString()}-${randomString()}-${randomString()}`;
    return `did:btcr:${uid}`;
}

function randomName() {
    return names[Math.floor(Math.random()*names.length)];
}

function randomSurname() {
    return surnames[Math.floor(Math.random()*names.length)];
}

function generateClaim() {
    let name1 = randomName();
    let name2 = randomName();
    let label = name1 + "-" + "knows" + "-" + name2;
    let did = generateDid();
    let did0 = did + "/0#did-transaction-key"; // /0#did-transaction-key
    let claimId = did + "/1#" + label;
    let recipientDid = generateDid();
    let relationship = "colleague";
    let issuedDate = "2019-03-02";
    let alternateName = name2 + " " +
	surnames[Math.floor(Math.random()*names.length)];
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
    return claim;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let rootPath = "https://raw.githubusercontent.com/alfonsoegio/btcr-did-tools-js/master/corpus/test1/";

const signClaim = function (claim, index) {
    let keyPair = bitcoin.ECPair.fromWIF(wif, network);
    keyPair.compressed = true;
    let publicKeyBuffer = keyPair.getPublicKeyBuffer();
    let publicKeyHex = publicKeyBuffer.toString('hex');
    let testPublicKeyFriendly = "ecdsa-koblitz-pubkey:" + publicKeyHex;
    let didPathName = randomString();
    let did = rootPath + didPathName + ".jsonld";
    jsig.sign(claim, {
	algorithm: 'EcdsaKoblitzSignature2016',
	privateKeyWif: wif,
	creator: testPublicKeyFriendly
    }, async function (err, signedDocument) {
	if (err) {
	    console.error(err);
	    process.exit(1);
	}
 	let btcrDid = await createBtcrDid.createBtcrDid(process.env.BTC_ADDRESS,
							process.env.BTC_ADDRESS,
							null,
							process.env.WIF,
							did,
							0.0001);
	console.log("TXID");
	let result = JSON.parse(btcrDid);
	console.log(result);
	console.log(typeof btcrDid);
	await fs.writeFile("corpus/test1/tx-" + result["data"]["txid"] + ".jsonld",
			   JSON.stringify(signedDocument) , () => {});
	console.log("Signed " + signedDocument["id"]);
    });
};

async function main() {
    let claim = generateClaim();
    signClaim(claim, Math.floor(Math.random() * 1000));
}

main();
