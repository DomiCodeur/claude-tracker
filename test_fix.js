import os from 'os';
import path from 'path';
import fs from 'fs';
import { globSync } from 'glob';

const projectsDir = path.join(os.homedir(), '.claude', 'projects');

// Test avec les patterns corrigés
const patterns = [
  path.join(projectsDir, '**/*.jsonl').replace(/\\/g, '/'),
  path.join(projectsDir, '**/conversations_*.jsonl').replace(/\\/g, '/'),
  path.join(projectsDir, '*/*.jsonl').replace(/\\/g, '/')
];

console.log('Testing corrected patterns:');
let allFiles = [];

for (const pattern of patterns) {
  console.log(`Pattern: ${pattern}`);
  try {
    const files = globSync(pattern, { absolute: true, windowsPathsNoEscape: true });
    console.log(`  Found ${files.length} files:`);
    files.forEach(f => console.log(`    ${f}`));
    allFiles.push(...files);
  } catch (error) {
    console.error(`  Error: ${error.message}`);
  }
}

console.log(`\nTotal files found: ${allFiles.length}`);

if (allFiles.length > 0) {
  // Find most recent
  const latestFile = allFiles.reduce((latest, current) => {
    const currentStats = fs.statSync(current);
    const latestStats = fs.statSync(latest);
    
    return currentStats.mtime > latestStats.mtime ? current : latest;
  });
  
  console.log(`Most recent file: ${latestFile}`);
  const stats = fs.statSync(latestFile);
  console.log(`Last modified: ${stats.mtime}`);
}