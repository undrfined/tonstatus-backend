import config from "../config";
import {checkLoadAll, getConfig34, getLastBlock, getShards, getTransactions} from "../liteclient";
const { performance } = require('perf_hooks');

let blocks = [];
let oldBlock: string;
let transNumTotal = 0;
let transNumTotalList = new Array(15 * 6).fill(0);

export const lol = () => {
    console.log('wow')
}

setInterval(async () => {
    const a = await getConfig34();
    const b = await checkLoadAll();
    const onlineValidators = b.map(l => l.online).filter(Boolean).length;
    const totalValidators = a.totalValidators;
    console.log('validators online/total ' + onlineValidators + "/" + totalValidators);
    console.log(a.totalValidators, );

}, config.liteservers.intervals.numberOfValidators * 1000);

setInterval(async () => {
    const block = await getLastBlock();
    if(block !== oldBlock) {
        oldBlock = block;
        blocks.push(block);
    }
}, config.liteservers.intervals.scanBlocks * 1000)

setInterval(async () => {
    transNumTotalList.shift();
    transNumTotalList.push(transNumTotal)
    // console.log(' got ', transNumTotal, transNumTotalList);

    transNumTotal = 0;

    const data = transNumTotalList.slice().reverse();
    const tps1minute = data.slice(0, 6);
    const tps5minute = data.slice(0, 5 * 6);
    const tps15minute = data.slice(0, 15 * 6);
    const avg = [
        tps1minute.reduce((acc, el) => acc + el / tps1minute.length),
        tps5minute.reduce((acc, el) => acc + el / tps5minute.length),
        tps15minute.reduce((acc, el) => acc + el / tps15minute.length),
    ]
    // console.log(tps1minute)
    // console.log(tps5minute)
    // console.log(tps15minute)
    console.log('tps 1 minute / 5 / 15', avg)
}, config.liteservers.intervals.statistics * 1000)

setInterval(async () => {
    if(blocks.length === 0) {
        return;
    }
    const block = blocks.shift()

    if(!block) return;


    const transactions = await getTransactions(block);
    let transNum = transactions.length;
    const shards = await getShards(block);

    for(const shard of shards) {
        const transactionsShard = await getTransactions(shard.block);
        transNum += transactionsShard.length;
    }
    transNumTotal += transNum;
    // console.log('read blocks')
}, config.liteservers.intervals.readBlocks * 1000)
