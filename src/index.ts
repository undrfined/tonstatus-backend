import { setupMongo } from './mongo';
import { setupExpress } from './express';

async function run() {
    await setupMongo();
    await setupExpress();
}

run();
