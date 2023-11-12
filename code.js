const fs = require('fs');
const path = require('path');
const crypto = require('crypto');


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

async function createChatCodeAssistant(openaiInstance, fileIds) {
    try {
        const assistant = await openaiInstance.beta.assistants.create({
            model: "gpt-4",
            name: "ChatCodeAssistant",
            description: "An assistant that helps with the code by using attached files as a reference.",
            instructions: "You are an assistant that helps understand and work with the provided code base. Answer queries and provide code examples or explanations using the attached files as your knowledge base.",
            tools: [{type: "code_interpreter"}],
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
    const localDirMD5 = await filesMD5("./app")

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

module.exports = {
    getAssistantIfExists,
    checkAndCreateAssistant,
    sync
};