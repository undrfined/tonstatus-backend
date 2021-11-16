import config from '../config';
import { runCommand } from "../liteclient";

const express = require('express');

const app = express();

app.get('/', async (req, res) => {
    res.send(await runCommand('allshards'))
});

export async function setupExpress() {
    return new Promise((res) => {
        app.listen(config.http.port, () => {
            console.log(`TONStatus listening at http://${config.http.host}:${config.http.port}`)

            res();
        });
    });
}
