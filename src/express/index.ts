import config from '../config';
import {getLastBlock, getShards, getTransactions, runCommand} from "../liteclient";
import { getServicePerformance } from '../metrics/website';

const express = require('express');

const app = express();

app.get('/', async (req, res) => {
    const block = await getLastBlock();
    const a = await getTransactions(block)
    const b = await getShards(block);
    console.log(a)
    console.log(b)

    res.send(JSON.stringify({
        block,
        shards: b,
        transactions: a
    }))
});

app.get('/webservices', async (req, res) => {
    const service = req.query['service'];
    const from = req.query['from'];
    const to = req.query['to'];

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const resolve = (service: string) => getServicePerformance(service, fromDate, toDate);

    if (service) {
        res.send(await resolve(service));
    } else {
        const all = await Promise.all(
            config.webservices.list
                .map(service => resolve(service))
        );

        res.send(all);
    }
});

export async function setupExpress() {
    return new Promise((res) => {
        app.listen(config.http.port, () => {
            console.log(`TONStatus listening at http://${config.http.host}:${config.http.port}`)

            res(app);
        });
    });
}
