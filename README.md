# AICLI

A command-line tool that converts natural language instructions into shell commands using OpenAI's GPT-4o-mini.

## Installation

```bash
npm install -g @neimadvn/aicli
```

After installation, you'll need to set up your OpenAI API key:

```bash
aicli config --set-api-key YOUR_API_KEY
```

### Troubleshooting

If you encounter permissions issues, particularly on Unix-based systems (macOS, Linux), you may need to:

1. Make sure the CLI is executable:
   ```bash
   chmod +x $(which aicli)
   ```

2. If you're using npm with root/sudo privileges:
   ```bash
   sudo chmod +x $(npm root -g)/aicli/dist/index.js
   ```

## Usage

### Convert natural language to shell commands

```bash
aicli "copy file dist into folder ~"
```

The tool will generate a shell command (e.g., `cp ./dist ~`), show it to you, and ask for confirmation before executing.

### Multi-command processing

For complex requests, the tool can generate multiple commands:

```bash
aicli "setup a new nodejs project, initialize git, create a README with hello world"
```

Each command will be presented individually for confirmation before execution. You can:
- Approve each command individually
- Skip commands you don't want to execute
- Use chained commands (with &&) when they should execute as a unit

### Interactive mode

You can run the tool without arguments to be prompted for your instruction:

```bash
aicli
```

### Configuration

View current configuration:

```bash
aicli config --view
```

Set OpenAI API key:

```bash
aicli config --set-api-key YOUR_API_KEY
```

Change the model (default is gpt-4o-mini):

```bash
aicli config --set-model gpt-4o
```

## Features

- Convert natural language to shell commands
- Support for multi-command sequences with individual confirmation
- Provides OS context to the AI model
- Confirmation before command execution
- Configurable OpenAI API key and model
- Simple and direct interface

## Development

### Building from source

```bash
git clone https://github.com/neimadvn/aicli.git
cd aicli
npm install
npm run build
```

### Run in development mode

```bash
npm run dev
```

## License

MIT 