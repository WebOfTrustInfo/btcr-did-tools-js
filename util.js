const bitcoin = require('bitcoinjs-lib');


const publicKeyHexFromWif = function(wif, network) {
  let keyPair = bitcoin.ECPair.fromWIF(wif, network);
  keyPair.compressed = true;
  let publicKeyBuffer = keyPair.getPublicKeyBuffer();
  let publicKeyHex = publicKeyBuffer.toString('hex');
  return publicKeyHex;
};

module.exports = {
  publicKeyHexFromWif: publicKeyHexFromWif,
};