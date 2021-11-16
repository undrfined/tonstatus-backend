import config from '../config';
import { getLastBlock, getShards, getTransactions } from "../liteclient";
import {
    getWebserviceDailyPerformanceMeasurement,
    getWebserviceHourlyPerformanceMeasurement,
    getWebservicePerformance,
    Webservice
} from '../metrics/website';
import { getTpsPerformance, getValidatorsPerformance } from '../metrics/network';

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

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

app.get('/validators', async (req, res) => {
    const from = req.query['from'];
    const to = req.query['to'];

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    res.send(await getValidatorsPerformance(fromDate, toDate));
});

app.get('/tps', async (req, res) => {
    const from = req.query['from'];
    const to = req.query['to'];

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    res.send(await getTpsPerformance(fromDate, toDate));
});

app.get('/webservices', async (req, res) => {
    const from = req.query['from'];
    const to = req.query['to'];

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const resolve = (webservice: Webservice) => getWebservicePerformance(webservice, fromDate, toDate);

    const all = await Promise.all(
        config.webservices.list
            .map(service => resolve(service))
    );

    res.send(all);
});

app.get('/webservice-daily/:service', async (req, res) => {
    const service = req.params['service'];
    const from = req.query['from'];
    const to = req.query['to'];

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const resolve = (webservice: Webservice) => getWebserviceDailyPerformanceMeasurement(webservice, fromDate, toDate);

    const webservice = config.webservices.list.find(ws => ws.name === service) as Webservice;

    res.send(await resolve(webservice));
});

app.get('/webservice-hourly/:service', async (req, res) => {
    const service = req.params['service'];
    const from = req.query['from'];
    const to = req.query['to'];

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    const resolve = (webservice: Webservice) => getWebserviceHourlyPerformanceMeasurement(webservice, fromDate, toDate);

    const webservice = config.webservices.list.find(ws => ws.name === service) as Webservice;

    res.send(await resolve(webservice));
});

export async function setupExpress() {
    return new Promise((res) => {
        app.listen(config.http.port, () => {
            console.log(`TONStatus listening at http://${config.http.host}:${config.http.port}`)

            res(app);
        });
    });
}
