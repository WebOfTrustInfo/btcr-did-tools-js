const program = require('commander');
const request = require("txref-conversion-js");

let blockHeight = null;
let txPos = null;
let utxoIndex = null;
let network = null;

program
    .version('1.0.0')
    .usage('[options]')
    .option('-b, --blockHeight <blockHeight>', 'blockHeight (required)')
    .option('-t, --txPos <txPos>', 'TxPos')
    .option('-u, --utxoIndex <utxoIndex>', 'UTXO index, default 1', 1)
    .option('-n, --network <network>', 'testnet or mainnet; default is testnet', 'testnet');

program.parse(process.argv);
blockHeight = program.blockHeight;
txPos = program.txPos;
utxoIndex = program.utxoIndex;
network = network;

console.log(request.txrefEncode(network, blockHeight, txPos, utxoIndex));
