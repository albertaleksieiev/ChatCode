require('dotenv').config();
const OpenAI = require("openai")

const openaiInstance = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // defaults to process.env["OPENAI_API_KEY"]
});

const yargs = require("yargs");
const { hideBin } = require('yargs/helpers');

const { sync, getAssistantIfExists, checkAndCreateAssistant } = require("./code");
const appDirectoryPath = process.env.APP_PATH;

async function main() {
    await yargs(hideBin(process.argv))
        .command({
            command: 'check-assistant',
            describe: 'Check if the assistant exists',
            handler: async () => {
                const assistant = await getAssistantIfExists(openaiInstance, "ChatCodeAssistant");
                if (assistant) {
                    console.log("Assistant exists:", assistant.name);
                } else {
                    console.log("Assistant does not exist.");
                }
            }
        })
        .command({
            command: 'create-assistant',
            describe: 'Create the assistant if it does not exist',
            handler: async () => {
                await checkAndCreateAssistant(openaiInstance, []);
                console.log("Checked and created assistant if necessary.");
            }
        })
        .command({
            command: 'compare-files',
            describe: 'Check if the directory is in sync with the assistant',
            handler: async () => {
                await sync(openaiInstance, "ChatCodeAssistant", appDirectoryPath);
            }
        })
        .demandCommand(1, 'You need at least one command before moving on')
        .help()
        .argv;
}
((async () => await main()))();