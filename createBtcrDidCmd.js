const program = require('commander');
const createBtcrDid = require('./createBtcrDid');

let inputAddress = null;
let changeAddress = null;
let ddo1Ref = null;
let fee = 0;
let chain = null;


program
    .version('1.0.0')
    .usage('[options]')
    .option('-i, --inputAddress <inputAddress>', 'input (funding) address; required')
    .option('-c, --changeAddress <changeAddress>', 'change address; required')
    .option('-n, --network <network>', 'testnet or mainnet; default is testnet', 'testnet')
    .option('-d, --ddo1Ref <ddo1Ref>', 'DDO/1 reference; will be added to the OP_RETURN field. Can be null')
    .option('-f, --fee <fee>', 'Transaction fee in BTC. Default is 0.001 BTC', 0.001);

program.parse(process.argv);

inputAddress = program.inputAddress;
changeAddress = program.changeAddress;
ddo1Ref = program.ddo1Ref;
fee = program.fee;
let wif = process.env.WIF;

if (inputAddress === null || changeAddress === null|| wif === null) {
  program.help();
  process.exit(1);
}

createBtcrDid.createBtcrDid(inputAddress, changeAddress, chain, wif, ddo1Ref, fee)
    .then(result => console.log("wait for confirmation before using"))
    .catch(err => console.error(err));
