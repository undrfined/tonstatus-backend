import config from "../config";
import { checkLoadAll, getConfig34, getLastBlock, getShards, getTransactions } from "../liteclient";
import { tpsDbContinuous, validatorsDbContinuous } from '../mongo';

interface ValidatorsMeasurementV1 {
    totalValidators: number,
    onlineValidators: number,
    date: Date,
}

interface TpsMeasurementV1 {
    tps1minute: number,
    tps5minute: number,
    tps15minute: number,
    date: Date,
}

let blocks = [];
let oldBlock: string;
let transNumTotal = 0;
let transNumTotalList = new Array(15 * 6).fill(0);

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

export async function getValidatorsPerformance(from: Date | undefined, to: Date | undefined): Promise<any> {
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

export async function getTpsPerformance(from: Date | undefined, to: Date | undefined): Promise<any> {
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

}, config.liteservers.intervals.numberOfValidators * 1000);

setInterval(async () => {
    const block = await getLastBlock();
    if (block !== oldBlock) {
        oldBlock = block;
        blocks.push(block);
    }
}, config.liteservers.intervals.scanBlocks * 1000)

setInterval(async () => {
    const date = new Date();

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

    lastTpsMeasurement = {
        tps1minute: avg[0],
        tps5minute: avg[1],
        tps15minute: avg[2],
        date,
    };

    await tpsDbContinuous().insertOne(lastTpsMeasurement);

    console.log('tps 1 minute / 5 / 15', avg)
}, config.liteservers.intervals.statistics * 1000)

setInterval(async () => {
    if (blocks.length === 0) {
        return;
    }
    const block = blocks.shift()

    if (!block) return;


    const transactions = await getTransactions(block);
    let transNum = transactions.length;
    const shards = await getShards(block);

    for (const shard of shards) {
        const transactionsShard = await getTransactions(shard.block);
        transNum += transactionsShard.length;
    }
    transNumTotal += transNum;

    console.log('read blocks')
}, config.liteservers.intervals.readBlocks * 1000)
