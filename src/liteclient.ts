import {exec} from "child_process";

function escapeShell(cmd: string) {
    return '"' + cmd.replace(/(["'$`\\])/g, '\\$1') + '"';
}

export function runCommand(command: string, liteserver?: number): Promise<string> {
    return new Promise((resolve, reject) => {
        exec('/ton/build/lite-client/lite-client --verbosity 0 --global-config /config.json --cmd '
            + escapeShell(command) + (liteserver != null ? ' -i ' + liteserver : ''),
            (err, stdout, stderr) => {
            if(err) {
                // reject(err);
            } else {
                resolve(stdout)
            }
        })
    })
}

export function checkLoadAll() {
    const end = Math.floor(Date.now() / 1000) - 60;
    const start = end - 2000;
    return runCommand(`checkloadall ${start} ${end}`).then(l =>
        l
            .split('\n')
            .filter(l => l.includes('pubkey') && l.includes('val'))
            .map(l => l.split(' '))
            .map(l => {
                const [masterBlocksCreated, workBlocksCreated] = l[6].replace(/\)/, '').replace(/\(/, '')
                    .split(',').map(Number);

                const [masterBlocksExpected, workBlocksExpected] = l[8].replace(/\)/, '').replace(/\(/, '')
                    .split(',').map(Number);

                const mr = masterBlocksExpected === 0 ? 0 : masterBlocksCreated / masterBlocksExpected;
                const wr = workBlocksExpected === 0 ? 0 : workBlocksCreated / workBlocksExpected;
                const r = (mr + wr) / 2
                const efficiency = Math.round(r * 100)
                return ({
                    id: l[1].replace('#', '').replace(':', ''),
                    pubkey: l[4].replace(',', ''),
                    masterBlocksCreated,
                    workBlocksCreated,
                    masterBlocksExpected,
                    workBlocksExpected,
                    online: efficiency > 10
                });
            })
    )
}

export function getConfig34() {
    return runCommand('getconfig 34')
        .then(l => ({
            totalValidators: Number(l.match(/total:(\d+)/)[1])
        }))
}


export function getConfigAddr() {
    return runCommand('getconfig 0')
        .then(l => "-1:" + l.match(/config_addr:x(.+?)\)/)[1])
}

export function getOffers(fullConfigAddr: string) {
    return runCommand(`runmethodfull ${fullConfigAddr} list_proposals`)
}

export function getFullElectorAddr(): Promise<string> {
    return runCommand('getconfig 1')
        .then(l => "-1:" + l.match(/elector_addr:x(.+?)\)/)[1])
}

export function getActiveElectionId(fullElectorAddr: string) {
    return runCommand(`runmethodfull ${fullElectorAddr} participant_list_extended`)
}

export function getLastBlock(): Promise<string> {
    return runCommand('last').then(l =>
        l
            .split('\n')
            .find(l => l.includes("latest masterchain block"))
            .split(' ')[7]
    )
}

export function getShards(block: string) {
    return runCommand(`allshards ${block}`).then(l =>
        l
            .split('\n')
            .filter(l => l.includes("shard #"))
            .map(l => l.split(' '))
            .map(l => ({
                id: l[1].substr(1, l[1].length - 1),
                block: l[3]
            }))
    )
}

export function getTransactions(block: string) {
    return runCommand(`listblocktrans ${block} 999`).then(l =>
        l
            .split('\n')
            .filter(l => l.includes('transaction #'))
            .map(l => l.split(" "))
            .map(l =>
                ({
                    id: l[1].substr(1, l[1].length - 2),
                    account: l[3],
                    lt: l[5],
                    hash: l[7]
                }))
    )
}
