import config from "../config";
import { checkLoadAll, getConfig34, getLastBlock, getShards, getTransactions, runCommand } from "../liteclient";
import { tpsDbContinuous, validatorsDbContinuous } from '../mongo';
import * as fs from "fs";

const { performance } = require('perf_hooks');

interface ValidatorsMeasurementV1 {
    totalValidators: number;
    onlineValidators: number;
    date: Date;
}

interface ValidatorsPerformanceV1 {
    last: ValidatorsMeasurementV1;
    avgTotalValidators: number;
    avgOnlineValidators: number;
    from: Date;
    to: Date;
}

interface TpsMeasurementV1 {
    tps1minute: number;
    tps5minute: number;
    tps15minute: number;
    date: Date;
}

interface TpsPerformanceV1 {
    last: TpsMeasurementV1;
    avgTps1Minute: number;
    avgTps5Minute: number;
    avgTps15Minute: number;
    from: Date;
    to: Date;
}

let blocks = [];
let oldBlock: string;
let transNumTotal = 0;
let blocksTotal = 0;
let transNumTotalList = new Array(15 * 6).fill(0);
let blockRateList = new Array(15 * 6).fill(0);

let lastValidatorsMeasurement: ValidatorsMeasurementV1 = {
    totalValidators: 0,
    onlineValidators: 0,
    date: new Date(),
};
let lastTpsMeasurement: TpsMeasurementV1 = {
    tps1minute: 0,
    tps5minute: 0,
    tps15minute: 0,
    date: new Date(),
};

export async function getValidatorMeasurements(from: Date | undefined, to: Date | undefined): Promise<ValidatorsMeasurementV1[]> {
    if (!from) {
        from = new Date(0);
    }

    if (!to) {
        to = new Date();
    }

    const all = await validatorsDbContinuous().find().toArray();

    const measurements = all.map(m => ({ ...m, date: new Date(m.date) })) as ValidatorsMeasurementV1[];

    return measurements.filter(doc =>
        doc.date >= from &&
        doc.date <= to
    );
}

export async function getTpsMeasurements(from: Date | undefined, to: Date | undefined): Promise<TpsMeasurementV1[]> {
    if (!from) {
        from = new Date(0);
    }

    if (!to) {
        to = new Date();
    }

    const all = await tpsDbContinuous().find().toArray();

    const measurements = all.map(m => ({ ...m, date: new Date(m.date) })) as TpsMeasurementV1[];

    return measurements.filter(doc =>
        doc.date >= from &&
        doc.date <= to
    );
}

export async function getValidatorsPerformance(from: Date | undefined, to: Date | undefined): Promise<ValidatorsPerformanceV1> {
    if (!from) {
        from = new Date(0);
    }

    if (!to) {
        to = new Date();
    }

    const measurements = await getValidatorMeasurements(from, to);

    const totalTotalValidators = measurements
        .map(doc => doc.totalValidators)
        .reduce((p, c) => p + c, 0);
    const avgTotalValidators = measurements.length ? totalTotalValidators / measurements.length : 0;

    const totalOnlineValidators = measurements
        .map(doc => doc.onlineValidators)
        .reduce((p, c) => p + c, 0);
    const avgOnlineValidators = measurements.length ? totalOnlineValidators / measurements.length : 0;

    return {
        last: lastValidatorsMeasurement,
        avgTotalValidators,
        avgOnlineValidators,
        from,
        to,
    };
}

export async function getTpsPerformance(from: Date | undefined, to: Date | undefined): Promise<TpsPerformanceV1> {
    if (!from) {
        from = new Date(0);
    }

    if (!to) {
        to = new Date();
    }

    const measurements = await getTpsMeasurements(from, to);

    const totalTps = measurements
        .map(doc => [doc.tps1minute, doc.tps5minute, doc.tps15minute])
        .reduce((p, c) => [p[0] + c[0], p[1] + c[1], p[2] + c[2]], [0, 0, 0]);

    const avgTps1Minute = measurements.length ? totalTps[0] / measurements.length : 0;
    const avgTps5Minute = measurements.length ? totalTps[1] / measurements.length : 0;
    const avgTps15Minute = measurements.length ? totalTps[2] / measurements.length : 0;

    return {
        last: lastTpsMeasurement,
        avgTps1Minute,
        avgTps5Minute,
        avgTps15Minute,
        from,
        to,
    };
}

setInterval(async () => {
    const date = new Date();

    try {

        const a = await getConfig34();
        const b = await checkLoadAll();
        const onlineValidators = b.map(l => l.online).filter(Boolean).length;
        const totalValidators = a.totalValidators;
        console.log('validators online/total ' + onlineValidators + "/" + totalValidators);

        lastValidatorsMeasurement = {
            totalValidators,
            onlineValidators,
            date,
        };

        await validatorsDbContinuous().insertOne(lastValidatorsMeasurement);
    } catch (e) {

    }

}, config.liteservers.intervals.numberOfValidators * 1000);

const fetchNextBlock = async () => {
    try {
        console.log('fetching block...')
        const block = await getLastBlock();
        console.log('fetched block', block)
        if (block !== oldBlock) {
            oldBlock = block;
            blocks.push(block);
            blocksTotal++;
        }
    } catch (e) {

    }
    setTimeout(fetchNextBlock, config.liteservers.intervals.scanBlocks * 1000)
}


fetchNextBlock()

setInterval(async () => {
    const date = new Date();

    transNumTotalList.shift();
    transNumTotalList.push(transNumTotal)
    blockRateList.shift();
    blockRateList.push(blocksTotal);
    // console.log(' got ', transNumTotal, transNumTotalList);

    transNumTotal = 0;
    blocksTotal = 0;

    const data = transNumTotalList.slice().reverse();
    const tps1minute = data.slice(0, 6);
    const tps5minute = data.slice(0, 5 * 6);
    const tps15minute = data.slice(0, 15 * 6);
    const avg = [
        tps1minute.reduce((acc, el) => acc + el / tps1minute.length),
        tps5minute.reduce((acc, el) => acc + el / tps5minute.length),
        tps15minute.reduce((acc, el) => acc + el / tps15minute.length),
    ]

    const dataBlocks = blockRateList.slice().reverse();
    const blocks1minute = dataBlocks.slice(0, 6);
    const blocks5minute = dataBlocks.slice(0, 5 * 6);
    const blocks15minute = dataBlocks.slice(0, 15 * 6);
    const avgBlocks = [
        blocks1minute.reduce((acc, el) => acc + el / blocks1minute.length),
        blocks5minute.reduce((acc, el) => acc + el / blocks5minute.length),
        blocks15minute.reduce((acc, el) => acc + el / blocks15minute.length),
    ]
    // console.log(tps1minute)
    // console.log(tps5minute)
    // console.log(tps15minute)

    lastTpsMeasurement = {
        tps1minute: avg[0],
        tps5minute: avg[1],
        tps15minute: avg[2],
        date,
    };

    await tpsDbContinuous().insertOne(lastTpsMeasurement);

    console.log('tps 1 minute / 5 / 15', avg)
    console.log('blocks 1 minute / 5 / 15', avgBlocks)
}, config.liteservers.intervals.statistics * 1000)

const readNextBlock = async () => {
    if (blocks.length === 0) {
        setTimeout(readNextBlock, config.liteservers.intervals.readBlocks * 1000)

        return;
    }
    const block = blocks.shift()

    if (!block) {
        setTimeout(readNextBlock, config.liteservers.intervals.readBlocks * 1000)

        return;
    }

    try {

        const transactions = await getTransactions(block);
        let transNum = transactions.length;
        const shards = await getShards(block);

        for (const shard of shards) {
            const transactionsShard = await getTransactions(shard.block);
            transNum += transactionsShard.length;
        }
        transNumTotal += transNum;

        console.log('read blocks')
    }catch (e) {

    }
    setTimeout(readNextBlock, config.liteservers.intervals.readBlocks * 1000)
}

readNextBlock()

function intToIP(int) {
    var part1 = int & 255;
    var part2 = ((int >> 8) & 255);
    var part3 = ((int >> 16) & 255);
    var part4 = ((int >> 24) & 255);

    return part4 + "." + part3 + "." + part2 + "." + part1;
}

const checkLiteservers = async () => {
    fs.readFile('/config.json', 'utf8', async function (err, data) {
        if (err) throw err;
        const obj = JSON.parse(data);
        const syncStates = await Promise.all(Object.keys(obj.liteservers).map(async l => {
            try {
                const start = performance.now()
                const result = await runCommand('last', Number(l))
                const addr = result.split('\n')
                .find(l => l.startsWith('using liteserver'))
                    .match(/\[(.+?)]/)[1]
                const time = performance.now() - start;
                const block = result.split('\n').find(l => l.includes("latest masterchain block"))
                    .split(' ')[7]
                const blockNumber = Number(block.split(':')[0].split(',')[2].replace(')', ''))
                return {time, addr, block, blockNumber};
            } catch (e) {
                return {
                    time: -1, addr: intToIP(obj.liteservers[l].ip) + ":" + obj.liteservers[l].port, block: ""
                };
            }
        }))

        const availableLiteservers = syncStates.filter(l => l.time !== -1);
        const maxBlockNumber = Math.max(...availableLiteservers.map(l => l.blockNumber));
        const unavailableLiteservers = syncStates.filter(l => l.time === -1);
        const averageResponseTime = availableLiteservers.reduce((acc, el) => acc + el.time / availableLiteservers.length, 0);
        const outOfSyncLiteservers = availableLiteservers.filter(l => maxBlockNumber - l.blockNumber > 2);

        console.log('Online: ', availableLiteservers.map(l => l.addr))
        console.log('Offline: ', unavailableLiteservers.map(l => l.addr))
        console.log('Average response time: ', averageResponseTime + 'ms')
        console.log('Out of sync: ', outOfSyncLiteservers.map(l => l.addr))

        // TODO update mongo and express
    });

    setTimeout(checkLiteservers, config.liteservers.intervals.liteservers * 1000)
}

checkLiteservers()
