# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-04-XX

### Added
- Windows platform support
- Cross-platform configuration paths
- Platform-specific default download directories
- Updated documentation with Windows-specific instructions

### Changed
- Replaced Unix-specific build script with cross-platform version
- Improved environment variable handling using Node.js os module
- Updated README with platform-specific configuration information

### Security
- Updated axios from 1.7.9 to 1.8.3 to fix CVE-2025-27152 (High severity)

## [1.0.0] - 2025-XX-XX

### Added
- Initial release
- Download webpages as markdown using r.jina.ai
- Configurable download directory
- List downloaded markdown files
- Create subdirectories for organizing downloads
