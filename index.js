const createBtcrDid = require("./createBtcrDid");
const signClaim = require("./signClaim");
const ddoFormatter = require("./ddoFormatter");

module.exports = {
  signClaim: signClaim,
  createBtcrDid: createBtcrDid,
  getDeterministicDdoFromTxref: ddoFormatter.getDeterministicDdoFromTxref,
  getDeterministicDdoFromTxid: ddoFormatter.getDeterministicDdoFromTxid

};
