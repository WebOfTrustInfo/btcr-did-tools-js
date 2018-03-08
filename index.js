const createBtcrDid = require("./createBtcrDid");
const signClaim = require("./signClaim");
const ddoResolver = require("./ddoResolver");
const util = require("./util");

module.exports = {
  signClaim: signClaim.signClaim,
  createBtcrDid: createBtcrDid.createBtcrDid,
  resolveFromTxid: ddoResolver.resolveFromTxid,
  resolveFromTxref: ddoResolver.resolveFromTxref,
  txDetailsFromTxid: util.txDetailsFromTxid,
  txDetailsFromTxref: util.txDetailsFromTxref,
  publicKeyHexFromWif: util.publicKeyHexFromWif,
  extractPublicKeyHexFromScript: util.extractPublicKeyHexFromScript,
  extractPublicKeyHexFromTxref: util.extractPublicKeyHexFromTxref
};
