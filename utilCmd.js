const bitcoin = require('bitcoinjs-lib');
const util = require('./util');
const program = require('commander');

program
    .version('1.0.0')
    .usage('[options]')
    .option('-n, --network <network>', 'testnet or mainnet; default is testnet', 'testnet');

program.parse(process.argv);

let chain = program.network === "mainnet" ? bitcoin.networks.mainnet : bitcoin.networks.testnet;
let wif = process.env.WIF;
let publicKeyHex = util.publicKeyHexFromWif(wif, chain);
console.log(publicKeyHex);

