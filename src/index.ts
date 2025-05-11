#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Configuration management
// Use platform-specific paths for configuration
const homedir = os.homedir();
const configBasePath = process.platform === 'win32'
  ? path.join(process.env.APPDATA || homedir, 'markdown-downloader')
  : path.join(homedir, '.config', 'markdown-downloader');
const CONFIG_DIR = configBasePath;
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Default download directory based on platform
const getDefaultDownloadDir = () => {
  return process.platform === 'win32'
    ? path.join(homedir, 'Documents', 'markdown-downloads')
    : path.join(homedir, '.markdown-downloads');
};

interface MarkdownDownloaderConfig {
  downloadDirectory: string;
}

function getConfig(): MarkdownDownloaderConfig {
  try {
    fs.ensureDirSync(CONFIG_DIR);
    if (!fs.existsSync(CONFIG_FILE)) {
      // Default to platform-specific directory if no config exists
      const defaultDownloadDir = getDefaultDownloadDir();
      const defaultConfig: MarkdownDownloaderConfig = {
        downloadDirectory: defaultDownloadDir
      };
      fs.writeJsonSync(CONFIG_FILE, defaultConfig);
      fs.ensureDirSync(defaultConfig.downloadDirectory);
      return defaultConfig;
    }
    return fs.readJsonSync(CONFIG_FILE);
  } catch (error) {
    console.error('Error reading config:', error);
    // Fallback to default
    const defaultDownloadDir = getDefaultDownloadDir();
    return {
      downloadDirectory: defaultDownloadDir
    };
  }
}

function saveConfig(config: MarkdownDownloaderConfig) {
  try {
    fs.ensureDirSync(CONFIG_DIR);
    fs.writeJsonSync(CONFIG_FILE, config);
    fs.ensureDirSync(config.downloadDirectory);
  } catch (error) {
    console.error('Error saving config:', error);
  }
}

function sanitizeFilename(url: string): string {
  // Remove protocol, replace non-alphanumeric chars with dash
  return url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase();
}

function generateFilename(url: string): string {
  const sanitizedUrl = sanitizeFilename(url);
  const datestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `${sanitizedUrl}-${datestamp}.md`;
}

class MarkdownDownloaderServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'markdown-downloader',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (serverError: unknown) => console.error('[MCP Error]', serverError);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'download_markdown',
          description: 'Download a webpage as markdown using r.jina.ai',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL of the webpage to download'
              },
              subdirectory: {
                type: 'string',
                description: 'Optional subdirectory to save the file in'
              }
            },
            required: ['url']
          }
        },
        {
          name: 'list_downloaded_files',
          description: 'List all downloaded markdown files',
          inputSchema: {
            type: 'object',
            properties: {
              subdirectory: {
                type: 'string',
                description: 'Optional subdirectory to list files from'
              }
            }
          }
        },
        {
          name: 'set_download_directory',
          description: 'Set the main local download folder for markdown files',
          inputSchema: {
            type: 'object',
            properties: {
              directory: {
                type: 'string',
                description: 'Full path to the download directory'
              }
            },
            required: ['directory']
          }
        },
        {
          name: 'get_download_directory',
          description: 'Get the current download directory',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'create_subdirectory',
          description: 'Create a new subdirectory in the root download folder',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the subdirectory to create'
              }
            },
            required: ['name']
          }
        }
      ]
    }));

    // Tool to download markdown
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      // Download markdown
      if (request.params.name === 'download_markdown') {
        const url = request.params.arguments?.url;
        const subdirectory = request.params.arguments?.subdirectory;

        if (!url || typeof url !== 'string') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'A valid URL must be provided'
          );
        }

        try {
          // Get current download directory
          const config = getConfig();

          // Prepend r.jina.ai to the URL
          const jinaUrl = `https://r.jina.ai/${url}`;

          // Download markdown
          const response = await axios.get(jinaUrl, {
            headers: {
              'Accept': 'text/markdown'
            }
          });

          // Generate filename
          const filename = generateFilename(url);
          let filepath = path.join(config.downloadDirectory, filename);

          // If subdirectory is specified, use it
          if (subdirectory && typeof subdirectory === 'string') {
            filepath = path.join(config.downloadDirectory, subdirectory, filename);
            fs.ensureDirSync(path.dirname(filepath));
          }

          // Save markdown file
          await fs.writeFile(filepath, response.data);

          return {
            content: [
              {
                type: 'text',
                text: `Markdown downloaded and saved as ${filename} in ${path.dirname(filepath)}`
              }
            ]
          };
        } catch (downloadError) {
          console.error('Download error:', downloadError);
          return {
            content: [
              {
                type: 'text',
                text: `Failed to download markdown: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`
              }
            ],
            isError: true
          };
        }
      }

      // List downloaded files
      if (request.params.name === 'list_downloaded_files') {
        try {
          const config = getConfig();
          const subdirectory = request.params.arguments?.subdirectory;
          const listDir = subdirectory && typeof subdirectory === 'string'
            ? path.join(config.downloadDirectory, subdirectory)
            : config.downloadDirectory;
          const files = await fs.readdir(listDir);
          return {
            content: [
              {
                type: 'text',
                text: files.join('\n')
              }
            ]
          };
        } catch (listError) {
          const errorMessage = listError instanceof Error ? listError.message : 'Unknown error';
          return {
            content: [
              {
                type: 'text',
                text: `Failed to list files: ${errorMessage}`
              }
            ],
            isError: true
          };
        }
      }

      // Set download directory
      if (request.params.name === 'set_download_directory') {
        const directory = request.params.arguments?.directory;

        if (!directory || typeof directory !== 'string') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'A valid directory path must be provided'
          );
        }

        try {
          // Validate directory exists and is writable
          await fs.access(directory, fs.constants.W_OK);

          // Update and save config
          const config = getConfig();
          config.downloadDirectory = directory;
          saveConfig(config);

          return {
            content: [
              {
                type: 'text',
                text: `Download directory set to: ${directory}`
              }
            ]
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return {
            content: [
              {
                type: 'text',
                text: `Failed to set download directory: ${errorMessage}`
              }
            ],
            isError: true
          };
        }
      }

      // Get download directory
      if (request.params.name === 'get_download_directory') {
        const config = getConfig();
        return {
          content: [
            {
              type: 'text',
              text: config.downloadDirectory
            }
          ]
        };
      }

      // Create subdirectory
      if (request.params.name === 'create_subdirectory') {
        const subdirectoryName = request.params.arguments?.name;

        if (!subdirectoryName || typeof subdirectoryName !== 'string') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'A valid subdirectory name must be provided'
          );
        }

        try {
          const config = getConfig();
          const newSubdirectoryPath = path.join(config.downloadDirectory, subdirectoryName);

          // Create the subdirectory
          await fs.ensureDir(newSubdirectoryPath);

          return {
            content: [
              {
                type: 'text',
                text: `Subdirectory created: ${newSubdirectoryPath}`
              }
            ]
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return {
            content: [
              {
                type: 'text',
                text: `Failed to create subdirectory: ${errorMessage}`
              }
            ],
            isError: true
          };
        }
      }

      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${request.params.name}`
      );
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Markdown Downloader MCP server running on stdio');
  }
}

const server = new MarkdownDownloaderServer();
server.run().catch((error: Error) => console.error('Server error:', error));