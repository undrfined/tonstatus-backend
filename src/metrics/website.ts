import needle from 'needle';

const { performance } = require('perf_hooks');

export async function measureWebsiteResponseTimeMs(url: string): Promise<number> {
    const t0 = performance.now();

    await needle('get', url);

    const t1 = performance.now();

    return t1 - t0;
}
