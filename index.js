const createBtcrDid = require("./createBtcrDid");
const signClaim = require("./signClaim");
const ddoResolver = require("./ddoResolver");

module.exports = {
  signClaim: signClaim.signClaim,
  createBtcrDid: createBtcrDid.createBtcrDid,
  resolveFromTxref: ddoResolver.resolveFromTxref,
  resolveFromTxid: ddoResolver.resolveFromTxid

};
