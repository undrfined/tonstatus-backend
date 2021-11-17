import needle from 'needle';
import { webservicesDbContinuous, webservicesDbLast } from '../mongo';
import config from '../config';

const { performance } = require('perf_hooks');

export interface Webservice {
    name: string;
    url: string;
}

interface ServicePerformanceMeasurementV1 {
    version: 1;
    service: string;
    date: Date;
    responseTime: number;
    up: boolean;
}

interface DateServicePerformanceMeasurementV1 {
    service: string;
    date: Date;
    avgResponseTime: number;
    uptime: number;
    recordsCount: number;
}

interface ServicePerformanceV1 {
    service: string;
    from: Date;
    to: Date;
    avgResponseTime: number;
    up: boolean;
    uptime: number;
    lastCheck: Date | null;
    last24Hours: DateServicePerformanceMeasurementV1[],
}

export async function measureWebsiteResponseTimeMs(url: string): Promise<number> {
    const t0 = performance.now();

    await needle('get', url);

    const t1 = performance.now();

    return t1 - t0;
}

export async function getWebservicePerformance(webservice: Webservice, from: Date | undefined, to: Date | undefined): Promise<ServicePerformanceV1> {
    const measurements = await getWebservicePerformanceMeasurements(webservice, from, to);
    const lastMeasurement = await getWebserviceLastPerformanceMeasurement(webservice);

    const totalResponseTime = measurements
        .filter(measurement => measurement.up)
        .map(doc => doc.responseTime)
        .reduce((p, c) => p + c, 0);

    const avgResponseTime = measurements.length ? totalResponseTime / measurements.length : 0;

    const up = lastMeasurement?.up ?? false;

    const uptime = measurements.length ? measurements.filter(m => m.up).length / measurements.length * 100 : 0;

    const lastCheck = lastMeasurement?.date ?? null;

    const now = new Date();
    const sub24 = new Date();
    sub24.setHours(sub24.getHours()-24);

    const last24Hours = await getWebserviceHourlyPerformanceMeasurement(webservice, sub24, now);

    return {
        service: webservice.name,
        avgResponseTime,
        from,
        to,
        up,
        uptime,
        lastCheck,
        last24Hours,
    };
}

export async function getWebserviceDailyPerformanceMeasurement(webservice: Webservice, from: Date | undefined, to: Date | undefined): Promise<DateServicePerformanceMeasurementV1[]> {
    const measurements = await getWebservicePerformanceMeasurements(webservice, from, to);

    const daily = {} as { [key: number]: ServicePerformanceMeasurementV1[] };

    for (const measurement of measurements) {
        const date = measurement.date;
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);

        if (!daily[+date]) {
            daily[+date] = [];
        }

        daily[+date].push(measurement);
    }

    return Object.entries(daily).map(([date, measurements]): DateServicePerformanceMeasurementV1 => {
        const totalResponseTime = measurements
            .filter(measurement => measurement.up)
            .map(doc => doc.responseTime)
            .reduce((p, c) => p + c, 0);

        const avgResponseTime = measurements.length ? totalResponseTime / measurements.length : 0;

        const uptime = measurements.length ? measurements.filter(m => m.up).length / measurements.length * 100 : 0

        return {
            service: webservice.name,
            avgResponseTime,
            uptime,
            date: new Date(Number(date)),
            recordsCount: measurements.length,
        };
    });
}

export async function getWebserviceHourlyPerformanceMeasurement(webservice: Webservice, from: Date | undefined, to: Date | undefined): Promise<DateServicePerformanceMeasurementV1[]> {
    const measurements = await getWebservicePerformanceMeasurements(webservice, from, to);

    const daily = {} as { [key: number]: ServicePerformanceMeasurementV1[] };

    for (const measurement of measurements) {
        const date = measurement.date;
        date.setMinutes(0);
        date.setSeconds(0);
        date.setMilliseconds(0);

        if (!daily[+date]) {
            daily[+date] = [];
        }

        daily[+date].push(measurement);
    }

    return Object.entries(daily).map(([date, measurements]): DateServicePerformanceMeasurementV1 => {
        const totalResponseTime = measurements
            .filter(measurement => measurement.up)
            .map(doc => doc.responseTime)
            .reduce((p, c) => p + c, 0);

        const avgResponseTime = measurements.length ? totalResponseTime / measurements.length : 0;

        const uptime = measurements.length ? measurements.filter(m => m.up).length / measurements.length * 100 : 0

        return {
            service: webservice.name,
            avgResponseTime,
            uptime,
            date: new Date(Number(date)),
            recordsCount: measurements.length,
        };
    });
}

export async function getWebservicePerformanceMeasurements(webservice: Webservice, from: Date | undefined, to: Date | undefined): Promise<ServicePerformanceMeasurementV1[]> {
    if (!from) {
        from = new Date(0);
    }

    if (!to) {
        to = new Date();
    }

    const all = await webservicesDbContinuous().find().toArray();

    const measurements = all.map(m => ({ ...m, date: new Date(m.date) })) as ServicePerformanceMeasurementV1[];

    return measurements.filter(doc =>
        doc.date >= from &&
        doc.date <= to &&
        doc.service === webservice.name
    );
}

export async function getWebserviceLastPerformanceMeasurement(webservice: Webservice): Promise<ServicePerformanceMeasurementV1> {
    return (await webservicesDbLast().find().filter({ service: webservice.name }).toArray())
        .map(m => ({ ...m, date: new Date(m.date) }))[0] as ServicePerformanceMeasurementV1;
}

export async function saveWebservicePerformanceMeasurement(measurement: ServicePerformanceMeasurementV1): Promise<void> {
    await webservicesDbContinuous().insertOne(measurement);
}

export async function saveWebserviceLastPerformanceMeasurement(measurement: ServicePerformanceMeasurementV1): Promise<void> {
    await webservicesDbLast().findOneAndUpdate(
        { service: measurement.service },
        { $set: measurement, },
        { upsert: true }
    );
}

async function measureWebservicePerformance(webservice: Webservice): Promise<ServicePerformanceMeasurementV1> {
    const date = new Date();

    let responseTime = 0;
    let up = true;

    try {
        responseTime = await measureWebsiteResponseTimeMs(webservice.url)
    } catch (e) {
        up = false;
    }

    return {
        version: 1,
        service: webservice.name,
        responseTime,
        date,
        up,
    };
}

// store most recent measurement
setInterval(() => {
    config.webservices.list.forEach(async (webservice: Webservice) => {
        await saveWebserviceLastPerformanceMeasurement(
            await measureWebservicePerformance(webservice)
        );
    });
}, config.webservices.intervalLast * 1000);

// store continuous measurements for graphs
setInterval(() => {
    config.webservices.list.forEach(async (webservice: Webservice) => {
        await saveWebservicePerformanceMeasurement(
            await measureWebservicePerformance(webservice)
        );
    });
}, config.webservices.intervalContinuous * 1000);
