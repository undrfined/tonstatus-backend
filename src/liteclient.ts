import {exec} from "child_process";

function escapeShell(cmd: string) {
    return '"' + cmd.replace(/(["'$`\\])/g, '\\$1') + '"';
}

export function runCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec('/ton/build/lite-client/lite-client --verbosity 0 --global-config /config.json --cmd ' + escapeShell(command), (err, stdout, stderr) => {
            if(err) {
                reject(err);
            } else {
                resolve(stdout)
            }
        })
    })
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
