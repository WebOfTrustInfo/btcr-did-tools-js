const program = require('commander');
const request = require("txref-conversion-js");
const fetch = require('node-fetch');

let blockHeight = null;
let txId = null;
let utxoIndex = null;
let network = "testnet";

program
    .version('1.0.0')
    .usage('[options]')
    .option('-b, --blockHash <blockHash>', 'blockHash (required)')
    .option('-t, --txId <txId>', 'TxId')
    .option('-u, --utxoIndex <utxoIndex>', 'UTXO index, default 1', 1)
    .option('-n, --network <network>', 'testnet or mainnet; default is testnet', 'testnet');

program.parse(process.argv);
blockHash = program.blockHash;
txId = program.txId;
utxoIndex = program.utxoIndex;
network = network;

async function main() {
    response = await fetch("https://chain.so/api/v2/block/BTCTEST/" + blockHash)
    let data = await response.json();
    let blockHeight = data["data"]["block_no"];
    let txPos = 0;
    for(let txi in data["data"]["txs"]) {
	if (data["data"]["txs"][txi]["txid"] === txId) {
	    break;
	}
	txPos++;
    }
    console.log("Block Height = " + blockHeight);
    console.log("txPos = " + txPos);
    console.log("UTXOIndex = " + utxoIndex);
    console.log("Network = " + network);
    console.log(request.txrefEncode(network, blockHeight, txPos, utxoIndex));
}
main();
