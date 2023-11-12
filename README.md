
# Chat Code 💻

## Overview
Chat Code CLI is a command-line interface tool that enhances your interaction with OpenAI's ChatGPT models. It's synchronize your project files with an AI assistant. This synchronization ensures the assistant is always up-to-date with your project context, enabling more effective assistance, including the capability to edit existing code upon request.

## Features
- **Assistant Check**: Verify the existence of the OpenAI assistant.
- **Assistant Creation**: Automatically create the assistant if it doesn't exist.
- **File Sync**: Ensure local files are in sync with the assistant's storage.

## Getting Started

### Prerequisites
- Node.js installed on your machine.
- An active OpenAI API key.

### Installation
Install the required dependencies:
```bash
npm install
```

### Configuration
Create a `.env` file in the root directory of the project with the following content:
```env
OPENAI_API_KEY=[Your OpenAI API Key]
APP_PATH="./app" # Your app to sync
ASSISTANT_NAME=ChatCodeAssistant
```
Replace `[Your OpenAI API Key]` with your actual OpenAI API key.

### Usage
The CLI provides the following commands:
- `check-assistant`: Checks if the specified assistant exists.
- `create-assistant`: Creates the assistant if it does not exist.
- `compare-files`: Compares local files with the assistant configuration.


For example:
```bash
node main.js compare-files
```

## License
MIT

This project is not affiliated with OpenAI but is designed to work with OpenAI's APIs.
