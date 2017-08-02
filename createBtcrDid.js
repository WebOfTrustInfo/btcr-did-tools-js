const bitcoin = require('bitcoinjs-lib');
const program = require('commander');
const request = require("txref-conversion-js").promisifiedRequest;


const MAINNET_BLOCKR_IO = "https://btc.blockr.io/api/v1";
const TESTNET_BLOCKR_IO = "https://tbtc.blockr.io/api/v1";
const SATOSHIS_PER_BTC = 100000000;


class UnspentOut {
  /**
   *
   * @param address
   * @param txid
   * @param amount in BTC
   * @param numConfirmations
   * @param script
   */
  constructor(address, txid, amount, numConfirmations, script) {
    this.address = address;
    this.txid = txid;
    this.amount = amount;
    this.numConfirmations = numConfirmations;
    this.script = script;
  }
}


class BlockrIOBroadcaster {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  getUnspentOutputs(address) {
    let url = this.baseUrl + "/address/unspent/" + address;
    let obj = {
      "url": url
    };
    return request(obj)
      .then(result => {
        let resultJson = JSON.parse(result);
        if (resultJson.data.unspent == null || resultJson.data.unspent.length == 0) {
          throw Error("no unspent outputs for address " + address);
        }
        let firstUnspent = resultJson.data.unspent[0];
        return new UnspentOut(address,
          firstUnspent.tx,
          firstUnspent.amount,
          firstUnspent.confirmations,
          firstUnspent.script);
      }, error => {
        console.error(error);
        throw error;
      });
  }

  broadcast(hextx) {
    let url = this.baseUrl + '/tx/push';
    let obj = {
      "url": url,
      "method": "POST",
      "body": {"hex": hextx}
    };
    return request(obj)
      .then(result => {
        return result;
      }, error => {
        console.error(error);
        throw error;
      });
  }
}


const createDidTx = function (network, wif, inputTxid, outputAddress, ddo1Ref, changeAmount) {
  let tx = new bitcoin.TransactionBuilder(network);
  tx.addInput(inputTxid, 0);
  tx.addOutput(outputAddress, changeAmount);

  if (ddo1Ref != null) {
    let data = new Buffer(ddo1Ref);
    let ret = bitcoin.script.compile(
      [
        bitcoin.opcodes.OP_RETURN,
        data
      ]);
    tx.addOutput(ret, 0);
  }
  let key = bitcoin.ECPair.fromWIF(wif, network);
  tx.sign(0, key);
  return tx.build().toHex();
};



let inputAddress = null;
let changeAddress = null;
let ddo1Ref = null;
let fee = 0;
let chain = null;


const createBtcrDid = function () {

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
  chain = program.network === "mainnet" ? bitcoin.networks.mainnet : bitcoin.networks.testnet;

  if (inputAddress === null || changeAddress === null) {
    program.help();
    process.exit(1);
  }

  let baseUrl = chain === bitcoin.networks.bitcoin ? MAINNET_BLOCKR_IO : TESTNET_BLOCKR_IO;
  let connector = new BlockrIOBroadcaster(baseUrl);

  let wif = process.env.WIF;

  return connector.getUnspentOutputs(inputAddress)
    .then(unspentOutput => {
      let change = unspentOutput.amount - fee; // BTC
      let changeSatoshi = Math.round(change * SATOSHIS_PER_BTC); // SATOSHI
      let signedHexTx = createDidTx(chain, wif, unspentOutput.txid, changeAddress, ddo1Ref, changeSatoshi);
      connector.broadcast(signedHexTx)
        .then(result => {
          console.log(result);
          return result;
        }, error => {
          console.error(error);
          throw error;
        });

    }, error => {
      console.error(error);
      throw error;
    });
};

module.exports = {
  createBtcrDid: createBtcrDid
};