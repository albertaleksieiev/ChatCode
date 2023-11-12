require('dotenv').config();
const OpenAI = require("openai")
const yargs = require("yargs");
const {hideBin} = require('yargs/helpers');
const {sync, getAssistantIfExists, checkAndCreateAssistant, createThreadAndSendMessage} = require("./src/code");
const {askCli, logSuccess, logAction, logWarning, logError, logInfo} = require('./src/utils')
const fs = require("fs");
const path = require("path");
const appDirectoryPath = process.env.APP_PATH;

const openaiInstance = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // defaults to process.env["OPENAI_API_KEY"]
});


function printMenu() {
    logAction("1. Check) Check if the assistant exists")
    logAction("2. Create) Create the assistant if it does not exist")
    logAction("3. Sync) Create the assistant if it does not exist and sync if required")

    logAction("4. CC) Chat with code")
}

async function step(selectedOption) {
    switch (selectedOption) {
        case "1":
        case "check":
            const assistant = await getAssistantIfExists(openaiInstance, "ChatCodeAssistant");
            if (assistant) {
                console.log("Assistant exists:", assistant.name);
            } else {
                console.log("Assistant does not exist.");
            }
            break
        case "2":
        case "create":
            await checkAndCreateAssistant(openaiInstance, []);
            console.log("Checked and created assistant if necessary.");
            break
        case "3":
        case "sync":
            await sync(openaiInstance, "ChatCodeAssistant", appDirectoryPath);
            break
        case "4":
        case "cc":
            const files = fs.readdirSync(appDirectoryPath);
            files.forEach(i => logSuccess(i))

            const fileName = await askCli("Select file")

            const fullPath = path.join(appDirectoryPath, fileName)
            logWarning(`${fs.readFileSync(fullPath)}`)

            const feature = await askCli("New change")


            const newCode = await createThreadAndSendMessage(openaiInstance, "ChatCodeAssistant", fileName, feature);
            logInfo(`Old code:`)
            logWarning(`${fs.readFileSync(fullPath)}`)
            logInfo(`New Code:`)
            logSuccess(`${newCode}`)

            const r = await askCli("Update code Y/N?")
            if (r.toLowerCase() === "y") {
                fs.writeFileSync(fullPath, newCode, "utf-8")
                logSuccess('Code updated')
            }
            break
    }
}

async function main() {
    while (true) {
        printMenu()
        const option = await askCli(">")
        try {
            await step(option.toLowerCase().trim())
        } catch (e) {
            console.error(e)
        }
    }
}

((async () => await main()))();