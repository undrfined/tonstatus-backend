import config from '../config';

const { MongoClient } = require('mongodb');

export const mongo = new MongoClient(`mongodb://${config.mongo.username}:${config.mongo.password}@${config.mongo.host}`);

export async function setupMongo() {
    await mongo.connect();
}
