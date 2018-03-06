const bitcoin = require('bitcoinjs-lib');
const util = require('./util');
const program = require('commander');

program
    .version("1.0.0")
    .description("Extracts hex-encoded public key from a TXREF or a WIF")
    .usage("[options]")
    .option("-n, --network <network>", "Network to use if extacting the public key from process.env.WIF. Values are " +
        "testnet or mainnet; default is testnet", "testnet")
    .option("-t, --txref <network>", "TXREF to extract public key from. If not provided, this will try to extract" +
        " a public key from process.env.WIF");

program.parse(process.argv);

let txref = program.txref;

if (txref) {
    let publicKeyHex = util.extractPublicKeyHexFromTxref(txref).then( r => console.log(r.toString()));
} else {
    let wif = process.env.WIF;
    let chain = program.network === "mainnet" ? bitcoin.networks.mainnet : bitcoin.networks.testnet;
    if (wif && chain) {
        let publicKeyHex = util.publicKeyHexFromWif(wif, chain);
        console.log(publicKeyHex);
    } else {
        console.log(program.helpInformation());
    }

}






