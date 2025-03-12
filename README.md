# Markdown Downloader MCP Server

## Overview

Markdown Downloader is a powerful MCP (Model Context Protocol) server that allows you to download webpages as markdown files with ease. Leveraging the r.jina.ai service, this tool provides a seamless way to convert web content into markdown format.

<a href="https://glama.ai/mcp/servers/jrki7zltg7">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/jrki7zltg7/badge" alt="Markdown Downloader MCP server" />
</a>

## Features

- 🌐 Download webpages as markdown using r.jina.ai
- 📁 Configurable download directory
- 📝 Automatically generates date-stamped filenames
- 🔍 List downloaded markdown files
- 💾 Persistent configuration

## Prerequisites

- Node.js (version 16 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/markdown-downloader.git
   cd markdown-downloader
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Manually Add Server to Cline/Roo-Cline MCP Settings file  

```
{
  "mcpServers": {
    "markdown-downloader": {
      "command": "node",
      "args": [
        "/home/user/Documents/Cline/MCP/markdown-downloader/build/index.js"
      ],
      "disabled": false,
      "alwaysAllow": [
        "download_markdown",
        "set_download_directory"
      ]
    }
  }
}
```

## Tools and Usage

### 1. Set Download Directory

Change the download directory:

```bash
use set_download_directory /path/to/your/local/download/folder
```

- Validates directory exists and is writable
- Persists the configuration for future use

### 2. Download Markdown

Download a webpage as a markdown file:

```bash
use tool download_markdown https://example.com/blog-post
```

- The URL will be prepended with `r.jina.ai`
- Filename format: `{sanitized-url}-{date}.md`
- Saved in the configured download directory

### 3. List Downloaded Files

List all downloaded markdown files:

```bash
use list_downloaded_files
```

### 4. Get Download Directory

Retrieve the current download directory:

```bash
use get_download_directory
```

## Configuration

- Configuration is stored in `~/.config/markdown-downloader/config.json`
- Default download directory: `~/.markdown-downloads`

## Troubleshooting

- Ensure you have an active internet connection
- Check that the URL is valid and accessible
- Verify write permissions for the download directory

## Security

- The tool uses r.jina.ai to fetch markdown content
- Local files are saved with sanitized filenames
- Configurable download directory allows flexibility

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Disclaimer

This tool is provided as-is. Always review downloaded content for accuracy and appropriateness.

## Support

For issues or feature requests, please open an issue on the GitHub repository.