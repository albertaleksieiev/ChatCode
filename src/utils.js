function askCli(msg) {
    return new Promise((resolve, reject) => {
        const readline = require('readline');

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(`${msg}: `, function(text) {
            try {
                rl.history = rl.history.slice(1);
            } catch (e) {
                console.error(e)
            }
            rl.close();
            resolve(text)
        });

        rl._writeToOutput = function _writeToOutput(stringToWrite) {
            rl.output.write(stringToWrite);
        };
    })
}

const color = require('cli-color');

const info = color.blue;
const success = color.green;
const warning = color.yellowBright;
const error = color.red;
const action = color.blueBright;

const logInfo = (message) => colorLog(message, info);
const logSuccess = (message) => colorLog(message, success);
const logWarning = (message) => colorLog(message, warning);
const logError = (message) => colorLog(message, error);
const logAction = (message) => colorLog(`· · ${message}`, action);

function colorLog(message, color) {
    console.log(
        color(getText(message))
    );
}

function getText(message) {
    if (typeof message === 'object') {
        console.error(message)
        return JSON.stringify(message)
    } else {
        return String(message)
    }
}



module.exports = {
    askCli,
    logInfo,
    logSuccess,
    logError,
    logWarning,
    logAction
};