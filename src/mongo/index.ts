import config from '../config';

const { MongoClient } = require('mongodb');

export const mongo = new MongoClient(`mongodb://${config.mongo.username}:${config.mongo.password}@${config.mongo.host}`);

export async function setupMongo() {
    await mongo.connect();
}

export const webservicesDbContinuous = () => mongo.db('tonstatus').collection('webservicesPerformance');
export const webservicesDbLast = () => mongo.db('tonstatus').collection('webservicesPerformanceLast');
