// Cross-platform post-build script
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildIndexPath = path.join(__dirname, '..', 'build', 'index.js');

// Only set executable permissions on Unix-like systems
if (process.platform !== 'win32') {
  try {
    fs.chmodSync(buildIndexPath, '755');
    console.log('Set executable permissions on build/index.js');
  } catch (error) {
    console.error('Error setting executable permissions:', error);
  }
} else {
  console.log('Skipping chmod on Windows platform');
}

console.log('Post-build tasks completed');
