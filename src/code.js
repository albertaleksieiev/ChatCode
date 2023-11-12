const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const removeMarkdown = require("markdown-to-text");
const puppeteer = require('puppeteer');
var MarkdownIt = require('markdown-it'),
    md = new MarkdownIt();

// Function to check if the assistant exists and return its details
async function getAssistantIfExists(openaiInstance, assistantName) {
    try {
        const response = await openaiInstance.beta.assistants.list();
        const assistant = response.data.find(assistant => assistant.name === assistantName);
        return assistant || null;
    } catch (error) {
        console.error("Error fetching assistant list:", error);
        return null;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCode(code) {
    const browser = await puppeteer.launch({headless: true, PUPPETEER_DISABLE_HEADLESS_WARNING: true});
    const page = await browser.newPage();
    await page.goto('https://google.com'); // Or a local HTML file
    try {
    // Execute JavaScript code in the context of the page
        const result = await page.evaluate(code);
    } catch (e) {
        console.error(e)
        return {error: e.message}
    }
    await browser.close();
    return true
}

async function createChatCodeAssistant(openaiInstance, fileIds) {
    try {
        const assistant = await openaiInstance.beta.assistants.create({
            model: "gpt-4-1106-preview",
            name: "ChatCodeAssistant",
            description: "An assistant that helps with the code by using attached files as a reference.",
            instructions: "Your role is to assist in navigating and modifying a given codebase. The codebases you'll work with are provided as attached files. Upon receiving a specific task, your responsibilities include: Identifying the Relevant Files: Determine which files within the attached codebase need modifications or updates based on the given prompt. Modifying the Code: Implement the necessary changes within the identified files. This may involve editing existing code or adding new logic to fulfill the requirements of the task. Returning the Updated Code: Provide the revised file, containing the complete code, as a downloadable attachment in the conversation. This ensures that all changes are easily accessible and reviewable in their entirety. It's imperative that all code modifications are returned as files, ensuring a comprehensive and efficient review process.",
            tools: [{type: "retrieval"}],
            file_ids: fileIds,
            metadata: {},
        });

        console.log("ChatCodeAssistant created successfully:", assistant);
        return assistant;
    } catch (error) {
        console.error("Error creating ChatCodeAssistant:", error);
    }
}

async function checkAndCreateAssistant(openaiInstance, fileIds) {
    const assistantName = "ChatCodeAssistant";
    const exists = await getAssistantIfExists(openaiInstance, assistantName);
    if (!exists) {
        console.log(`Assistant '${assistantName}' not found. Creating new assistant.`);
        await createChatCodeAssistant(openaiInstance, fileIds);
    } else {
        console.log(`Assistant '${assistantName}' already exists.`);
    }
}

async function filesMD5(directoryPath) {
    const files = fs.readdirSync(directoryPath);

    let hashStr = ""
    files.forEach(file => {
        const content = fs.readFileSync(path.join(directoryPath, file));
        const fileMD5 = crypto.createHash('md5').update(content).digest('hex');
        hashStr += fileMD5
    });
    return crypto.createHash('md5').update(hashStr).digest('hex');
}

async function sync(openaiInstance, assistantName, directoryPath) {
    const assistant = await getAssistantIfExists(openaiInstance, assistantName);

    if (!assistant) {
        console.error(`No assistant found with name '${assistantName}'.`);
        return null;
    }

    const remoteFilesMD5 = assistant.metadata['ChatCodeFilesMD5']
    const localDirMD5 = await filesMD5(directoryPath)

    if (localDirMD5 !== remoteFilesMD5) {
        console.warn(`MD5 directory not the same. ${remoteFilesMD5} != ${localDirMD5}`)
        const remoteFileIds = assistant.file_ids || [];

        const files = fs.readdirSync(directoryPath);

        let updatedFiles = []

        console.log("Upload files")
        for(const i in files) {
            const filePath = path.join(directoryPath, files[i])
            const response = await openaiInstance.files.create({
                file: fs.createReadStream(filePath),
                purpose: 'assistants', // or other purpose depending on your use case
            });
            updatedFiles.push(response.id)
        }

        console.log("Update assistant")
        const updatedAssistant = await openaiInstance.beta.assistants.update(assistant.id, {
            file_ids: updatedFiles,
            metadata: {...assistant.metadata, ChatCodeFilesMD5: localDirMD5}
        });

        console.log("Delete files")
        for (const i in remoteFileIds) {
            await openaiInstance.files.del(remoteFileIds[i]);
        }
        console.log("Sync done")
    } else {
        console.log("No changes")
    }
}

async function createThreadAndSendMessage(openai, assistantName, fileName, featureName) {
    const assistant = await getAssistantIfExists(openai, assistantName);

    const thread = await openai.beta.threads.create();

    let messageToSend = `I want to add new logic into ${fileName} that I have attached to assistant. You need to ${featureName}, and return resulting entire file content as a text, so I can download it. You should return only text without any explanation, because I will copy paste your code.`
    let code = ""
    while (true) {
        const threadMessages = await sendMessage(openai, assistant, thread, messageToSend)
        console.log(threadMessages.data[0].content[0].text.value)
        code = md.parse(threadMessages.data[0].content[0].text.value).filter(i => i.tag === "code")[0].content

        console.log(`Received a code. Evaluate`)

        const codeRun = await runCode(code)
        if (codeRun.error) {
            console.log(`Found error: ${codeRun.error}`)
            messageToSend = codeRun.error
        } else {
            break
        }
    }

    return code
}

async function sendMessage(openai, assistant, thread, content) {
    const message = await openai.beta.threads.messages.create(
        thread.id,
        {
            role: "user",
            content: content
        }
    );

    const run = await openai.beta.threads.runs.create(
        thread.id,
        {
            assistant_id: assistant.id
        }
    );

    let runResponse
    while (true) {
        runResponse = await openai.beta.threads.runs.retrieve(
            thread.id,
            run.id
        );

        if (runResponse.status !== "queued" && runResponse.status !== "in_progress") {
            break
        }
        console.log(`Waiting for state change, current state(${runResponse.status})...`)
        await sleep(5000)
    }

    console.log(`Run status: ${runResponse.status}`)
    const messages = await openai.beta.threads.messages.list(
        thread.id
    );


    if (runResponse.status !== "completed") {
        throw Error(`Bad state ${runResponse}`)
    }

    return messages
}


module.exports = {
    getAssistantIfExists,
    checkAndCreateAssistant,
    sync,
    createThreadAndSendMessage
};