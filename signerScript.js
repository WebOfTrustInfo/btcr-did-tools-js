const bitcoin = require('bitcoinjs-lib')
const jsig = require('jsonld-signatures')
const fs = require('fs')
const createBtcrDid = require('./createBtcrDid')
const request = require('txref-conversion-js')
const fetch = require('node-fetch')
const coinkey = require('coinkey')
const coininfo = require('coininfo')

// Read wif private key from environment
let wif = process.env.WIF

// Default root path (change it according to your own repo)
let rootPath = 'https://raw.githubusercontent.com/alfonsoegio/btcr-did-tools-js/develop/corpus/test1/'

// List of random names to build claims about
let names = ['Alice', 'Bob', 'Charles', 'Dan', 'Edward', 'Fred',
  'Giselle', 'Harry', 'Jessica', 'Kim', 'Laura', 'Monica',
  'Naomi', 'Olivia', 'Peter']

let randomString = function () {
  return Math.random().toString(36).replace(/[^a-z0-9]+/g, '').substr(0, 4)
}

function randomName () {
  return names[Math.floor(Math.random() * names.length)]
}

// Generates a json-ld encoded claim linking a BTCR-DID
function generateClaim (did) {
  let name1 = randomName()
  let name2 = randomName()
  let label = name1 + '-' + 'knows' + '-' + name2
  let did0 = did + '/0#did-transaction-key'
  let claimId = did + '/1#' + label
  let recipientDid = did
  let relationship = 'colleague'
  let issuedDate = String(new Date())
  let alternateName = name2
  let claim = {
    '@context': ['https://schema.org/', 'https://w3id.org/security/v1'],
    'id': claimId,
    'type': ['Credential', 'Identity', 'Person'],
    'issuer': did0,
    'issued': issuedDate,
    'label': label,
    'claim': {
      'knows': recipientDid,
      'relationship': relationship,
      'alternate-name': alternateName
    }
  }
  return claim
}

// Reads personal "wallet" and returns last WIF
const checkLastAddress = async function () {
  let path = './keys.json'
  if (fs.existsSync(path)) {
    let content = JSON.parse(fs.readFileSync(path))
    return content['keys'][content['keys'].length - 1]
  } else {
    return null
  }
}

// Saves new UTXO WIF on the wallet
const saveNewAddress = async function (wif) {
  let path = './keys.json'
  if (fs.existsSync(path)) {
    let content = JSON.parse(fs.readFileSync(path))
    content['keys'].push(wif)
    fs.writeFileSync(path, JSON.stringify(content))
  }
}

// Main claim signer function
const signClaim = async function () {
  let ddoPathName = randomString()
  let ddo = rootPath + ddoPathName + '.jsonld'
  let lastAddress = await checkLastAddress()
  if (lastAddress == null) {
    // Still don't have a "wallet", start with environment WIF
    wif = process.env.WIF
  } else {
    wif = await checkLastAddress()
  }
  // Build old public key from WIF
  let oldKey = coinkey.fromWif(wif)
  // Creating a new keypair on the fly
  let newKey = coinkey.createRandom(coininfo('BTC-TEST'))
  let newWif = newKey.privateWif
  // Saving it to the wallet
  saveNewAddress(newWif)
  let btcrDid = await createBtcrDid.createBtcrDid(oldKey.publicAddress,
    newKey.publicAddress,
    null,
    wif,
    ddo,
    0.0005)
  let result = JSON.parse(btcrDid)
  console.log(result)
  // Asynchronously poll the blockchain waiting for tx first confirmation
  setInterval(waitForConfirm, 20000, result['data']['txid'], ddoPathName, wif)
}

async function waitForConfirm (txid, ddoPathName, wif) {
  let response = await fetch('https://chain.so/api/v2/tx/BTCTEST/' + txid)
  let tx = await response.json()
  if (tx['data']['block_no'] == null) {
    console.log('Waiting form confirmation ...')
  }
  if (tx['data']['block_no'] != null) {
    // TX has block number
    console.log('TX first confirmation')
    let blockHash = tx['data']['blockhash']
    let blockResponse = await fetch('https://chain.so/api/v2/block/BTCTEST/' + blockHash)
    let blockData = await blockResponse.json()
    let txPos = 0
    for (let txi in blockData['data']['txs']) {
      if (blockData['data']['txs'][txi]['txid'] === txid) {
        break
      }
      // Counting block position of tx
      txPos++
    }
    let blockHeight = tx['data']['block_no']
    let utxoIndex = 1
    let network = 'testnet'
    console.log('Block Height = ' + blockHeight)
    console.log('txPos = ' + txPos)
    console.log('UTXOIndex = ' + utxoIndex)
    console.log('Network = ' + network)
    let did = request.txrefEncode(network, blockHeight, txPos, utxoIndex)
    console.log('DID = ' + did)
    // Check DID encoding/decoding match
    let decodedDid = request.txrefDecode(did)
    console.log('Decoded DID = ' + JSON.stringify(decodedDid))
    console.log('DDO PATHNAME = ' + ddoPathName)
    // Generating random claim
    let claim = generateClaim('did:' + did)
    console.log('CLAIM:')
    console.log(claim)
    let testnet = bitcoin.networks.testnet
    let keyPair = bitcoin.ECPair.fromWIF(wif, testnet)
    keyPair.compressed = true
    let publicKeyBuffer = keyPair['__d']
    let publicKeyHex = publicKeyBuffer.toString('hex')
    let testPublicKeyFriendly = 'ecdsa-koblitz-pubkey:' + publicKeyHex
    console.log(testPublicKeyFriendly)
    // Signing the claim
    let signedDocument = await jsig.sign(claim, {
      algorithm: 'EcdsaKoblitzSignature2016',
      privateKeyWif: wif,
      creator: testPublicKeyFriendly
    })
    console.log('Already signed')
    console.log(signedDocument)
    // Save the file
    fs.writeFileSync('corpus/test1/' + ddoPathName + '.jsonld',
      JSON.stringify(signedDocument), (err) => console.log(err))
    console.log('Signed ' + signedDocument['id'])
    process.exit(0)
  }
}

async function main () {
  await signClaim()
}

main()
