const bitcoin = require('bitcoinjs-lib');
const ddoResolver = require('./ddoResolver');
const program = require('commander');

program
  .version("1.0.0")
  .description("Resolves a DDO From a TXREF or TXID")
  .usage("[options]")
  .option("-t, --txref <txref>", "TXREF to resolve.")
  .option("-i, --txid <txid>", "TXID to resolve.")
  .option("-n, --network <network>", "Network to use if resolving from txid. Values are " +
    "testnet or mainnet; default is testnet", "testnet");

program.parse(process.argv);

let txref = program.txref;
let txid = program.txid;
let network = program.network;

if (txref) {
  ddoResolver.resolveFromTxref(txref)
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(err => console.error(err));
} else {
  ddoResolver.resolveFromTxid(txid, network)
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(err => console.error(err));
}

