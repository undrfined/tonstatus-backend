import {runCommand} from './liteclient';

const express = require('express')
const app = express()
const port = 8080;

app.get('/', async (req, res) => {
    res.send(await runCommand('allshards'))
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})

