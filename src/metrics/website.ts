import needle from 'needle';
import { mongo } from '../mongo';
import config from '../config';

const { performance } = require('perf_hooks');

interface ServicePerformanceMeasurementV1 {
    version: 1;
    service: string;
    date: Date;
    responseTime: number;
    up: boolean;
}

interface ServicePerformanceV1 {
    service: string;
    from: Date;
    to: Date;
    avgResponseTime: number;
    up: boolean;
    uptime: number;
    lastCheck: Date;
}

const db = () => mongo.db('tonstatus').collection('webservicesPerformance');

export async function measureWebsiteResponseTimeMs(url: string): Promise<number> {
    const t0 = performance.now();

    await needle('get', url);

    const t1 = performance.now();

    return t1 - t0;
}

export async function getServicePerformance(service: string, from: Date | undefined, to: Date | undefined): Promise<ServicePerformanceV1> {
    if (!from) {
        from = new Date(0);
    }

    if (!to) {
        to = new Date();
    }

    const measurements = await getServicePerformanceMeasurements(service, from, to);

    const totalResponseTime = measurements
        .filter(measurement => measurement.up)
        .map(doc => doc.responseTime)
        .reduce((p, c) => p + c, 0);

    const avgResponseTime = measurements.length ? totalResponseTime / measurements.length : 0;

    const lastMeasurement = measurements.sort((a, b) => Number(b.date) - Number(a.date))[0];

    const up = lastMeasurement?.up ?? false;

    const uptime = measurements.length ? measurements.filter(m => m.up).length / measurements.length * 100 : 0;

    const lastCheck = lastMeasurement.date;

    return {
        service,
        avgResponseTime,
        from,
        to,
        up,
        uptime,
        lastCheck,
    };
}

export async function getServicePerformanceMeasurements(service: string, from: Date, to: Date): Promise<ServicePerformanceMeasurementV1[]> {
    const all = await db().find().toArray();

    const measurements = all.map(m => ({ ...m, date: new Date(m.date) })) as ServicePerformanceMeasurementV1[];

    return measurements.filter(doc =>
        doc.date >= from &&
        doc.date <= to &&
        doc.service === service
    );
}

export async function saveServicePerformanceMeasurement(measurement: ServicePerformanceMeasurementV1): Promise<void> {
    console.log(measurement);
    await db().insertOne(measurement);
}

setInterval(() => {
    config.webservices.list.forEach(async (service: string) => {
        const date = new Date();

        let responseTime = 0;
        let up = true;

        try {
            responseTime = await measureWebsiteResponseTimeMs(`https://${service}`)
        } catch (e) {
            up = false;
        }

        await saveServicePerformanceMeasurement({
            version: 1,
            service,
            responseTime,
            date,
            up,
        });
    });
}, config.webservices.interval * 1000);
