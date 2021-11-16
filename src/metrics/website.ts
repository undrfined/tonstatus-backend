import needle from 'needle';
import { mongo } from '../mongo';
import config from '../config';

const { performance } = require('perf_hooks');

interface ServicePerformanceMeasurementV1 {
    version: 1;
    service: string;
    date: Date;
    responseTime: number;
}

interface AvgServicePerformanceMeasurementV1 {
    service: string;
    from: Date;
    to: Date;
    avgResponseTime: number;
}

const db = () => mongo.db('tonstatus').collection('webservicesPerformance');

export async function measureWebsiteResponseTimeMs(url: string): Promise<number> {
    const t0 = performance.now();

    await needle('get', url);

    const t1 = performance.now();

    return t1 - t0;
}


export async function getAvgServicePerformance(service: string, from: Date | undefined, to: Date | undefined): Promise<AvgServicePerformanceMeasurementV1> {
    if (!from) {
        from = new Date(0);
    }

    if (!to) {
        to = new Date();
    }

    const measurements = await getServicePerformanceMeasurements(service, from, to);

    const totalResponseTime = measurements
        .map(doc => doc.responseTime)
        .reduce((p, c) => p + c, 0);

    const avgResponseTime = measurements.length ? totalResponseTime / measurements.length : 0;

    return {
        service,
        avgResponseTime,
        from,
        to,
    };
}

export async function getServicePerformanceMeasurements(service: string, from: Date, to: Date): Promise<ServicePerformanceMeasurementV1[]> {
    const all = await db().find().toArray() as ServicePerformanceMeasurementV1[];

    return all.filter(doc =>
        doc.date >= from &&
        doc.date <= to &&
        doc.service === service
    );
}

export async function saveServicePerformanceMeasurement(measurement: ServicePerformanceMeasurementV1): Promise<void> {
    await db().insertOne(measurement);
}

setInterval(() => {
    config.webservices.list.forEach(async (service: string) => {
        const date = new Date();
        const responseTime = await measureWebsiteResponseTimeMs(`https://${service}`);

        await saveServicePerformanceMeasurement({
            version: 1,
            service,
            responseTime,
            date,
        });
    });
}, 60 * 1000);
