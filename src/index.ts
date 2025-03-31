#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

// Define types
interface Config {
  openaiApiKey: string;
  model: string;
}

interface OSInfo {
  platform: string;
  release: string;
  type: string;
  arch: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(os.homedir(), '.aicli-config.json');

// Load package.json to get version
const PACKAGE_JSON = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

// Default configuration
const DEFAULT_CONFIG: Config = {
  openaiApiKey: '',
  model: 'gpt-4o-mini'
};

// Load or create configuration
function loadConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (error) {
    console.error('Error loading config:', (error as Error).message);
  }
  return DEFAULT_CONFIG;
}

// Save configuration
function saveConfig(config: Config): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(chalk.green('Configuration saved successfully!'));
  } catch (error) {
    console.error('Error saving config:', (error as Error).message);
  }
}

// Initialize the OpenAI client
function initOpenAIClient(apiKey: string): OpenAI {
  if (!apiKey) {
    console.error(chalk.red('OpenAI API key is not configured.'));
    console.log(chalk.yellow('Please run: aicli config --set-api-key YOUR_API_KEY'));
    process.exit(1);
  }
  
  return new OpenAI({
    apiKey: apiKey,
  });
}

// Generate shell command from natural language
async function generateCommand(input: string, config: Config): Promise<string | null> {
  const spinner = ora('Generating command...').start();
  
  try {
    const openai = initOpenAIClient(config.openaiApiKey);
    
    // Get system information for context
    const osInfo: OSInfo = {
      platform: os.platform(),
      release: os.release(),
      type: os.type(),
      arch: os.arch()
    };
    
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that converts natural language instructions into shell commands.
                   Generate shell commands that accurately fulfill the user's request.
                   For complex requests that require multiple steps, you can generate multiple commands separated by newlines.
                   Each line will be treated as a separate command that requires confirmation.
                   You can also use '&&' to chain commands that should be executed together as a single unit.
                   Generate only the command without explanation or markdown.
                   System information: ${JSON.stringify(osInfo)}`
        },
        {
          role: 'user',
          content: `Convert this request to a shell command: ${input}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });
    
    spinner.stop();
    return response.choices[0].message.content?.trim() || null;
  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    return null;
  }
}

// Execute the command
function executeCommand(command: string): void {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      return;
    }
    
    if (stderr) {
      console.error(chalk.yellow(`Warning: ${stderr}`));
    }
    
    console.log(chalk.green('\nOutput:'));
    console.log(stdout || 'Command executed successfully.');
  });
}

// Parse and process command(s)
async function processCommands(commandString: string): Promise<void> {
  // Split by newlines to get separate commands
  const commands = commandString.split('\n').filter(cmd => cmd.trim() !== '');
  
  for (const command of commands) {
    console.log(chalk.blue('\nGenerated Command:'));
    console.log(chalk.yellow(command));
    
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'execute',
        message: 'Do you want to execute this command?',
        default: false
      }
    ]);
    
    if (answer.execute) {
      console.log(chalk.blue('\nExecuting command...'));
      executeCommand(command);
    } else {
      console.log(chalk.gray('Command skipped.'));
    }
  }
}

// Main program
const program = new Command();

program
  .name('aicli')
  .description('AI-powered CLI tool that converts natural language to shell commands')
  .version(PACKAGE_JSON.version);

// Config command
program
  .command('config')
  .description('Configure the CLI tool')
  .option('--set-api-key <key>', 'Set OpenAI API key')
  .option('--set-model <model>', 'Set OpenAI model (default: gpt-4o-mini)')
  .option('--view', 'View current configuration')
  .action((options) => {
    const config = loadConfig();
    
    if (options.setApiKey) {
      config.openaiApiKey = options.setApiKey;
      saveConfig(config);
    }
    
    if (options.setModel) {
      config.model = options.setModel;
      saveConfig(config);
    }
    
    if (options.view || (!options.setApiKey && !options.setModel)) {
      console.log(chalk.blue('Current Configuration:'));
      console.log('API Key:', config.openaiApiKey ? '********' + config.openaiApiKey.slice(-4) : 'Not set');
      console.log('Model:', config.model);
    }
  });

// Default command for processing instructions
program
  .argument('[instruction]', 'Natural language instruction to convert to a shell command')
  .action(async (instruction?: string) => {
    const config = loadConfig();
    
    // If no instruction provided, prompt the user
    if (!instruction) {
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'instruction',
          message: 'Enter your instruction:',
          validate: (input: string) => input.trim() !== '' ? true : 'Instruction cannot be empty'
        }
      ]);
      instruction = answer.instruction;
    }
    
    if (instruction) {
      const command = await generateCommand(instruction, config);
      
      if (command) {
        await processCommands(command);
      }
    }
  });

program.parse(process.argv); 