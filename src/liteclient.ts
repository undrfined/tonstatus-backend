import {exec} from "child_process";

function escapeShell(cmd: string) {
    return '"' + cmd.replace(/(["'$`\\])/g, '\\$1') + '"';
}

export function runCommand(command: string) {
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

