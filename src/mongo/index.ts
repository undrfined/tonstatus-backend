import config from '../config';

const { MongoClient } = require('mongodb');

export const mongo = new MongoClient(`mongodb://${config.mongo.username}:${config.mongo.password}@${config.mongo.host}`);

export async function setupMongo() {
    await mongo.connect();
}

const db = () => mongo.db('tonstatus');

export const webservicesDbContinuous = () => db().collection('webservicesPerformance');
export const webservicesDbLast = () => db().collection('webservicesPerformanceLast');
export const validatorsDbContinuous = () => db().collection('validatorsPerformanceLast');
export const tpsDbContinuous = () => db().collection('tpsPerformanceLast');
