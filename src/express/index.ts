import config from '../config';
import {
    getWebserviceDailyPerformanceMeasurement,
    getWebserviceHourlyPerformanceMeasurement,
    getWebservicePerformance,
    Webservice
} from '../metrics/website';
import {
    getBlocksPerformance,
    getLiteserversPerformance,
    getTpsPerformance,
    getValidatorsPerformance
} from '../metrics/network';
import * as path from "path";

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "../../frontend", "build")));

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

app.get('/blocks', async (req, res) => {
    const from = req.query['from'];
    const to = req.query['to'];

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    res.send(await getBlocksPerformance(fromDate, toDate));
});

app.get('/liteservers', async (req, res) => {
    const from = req.query['from'];
    const to = req.query['to'];

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    res.send(await getLiteserversPerformance(fromDate, toDate));
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
