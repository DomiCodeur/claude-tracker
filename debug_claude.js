import os from 'os';
import path from 'path';
import fs from 'fs';
import { globSync } from 'glob';

const projectsDir = path.join(os.homedir(), '.claude', 'projects');
console.log('Projects dir:', projectsDir);

// Test direct file listing
const subDirs = fs.readdirSync(projectsDir);
console.log('Subdirectories:', subDirs);

for (const subDir of subDirs) {
  const fullSubDir = path.join(projectsDir, subDir);
  console.log(`\nChecking ${subDir}:`);
  
  if (fs.statSync(fullSubDir).isDirectory()) {
    const files = fs.readdirSync(fullSubDir);
    console.log('  Files:', files);
    
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
    console.log('  JSONL files:', jsonlFiles);
    
    // Get full paths with timestamps
    jsonlFiles.forEach(file => {
      const fullPath = path.join(fullSubDir, file);
      const stats = fs.statSync(fullPath);
      console.log(`    ${file} - Modified: ${stats.mtime}`);
    });
  }
}

// Test glob patterns
const patterns = [
  path.join(projectsDir, '**', '*.jsonl'),
  path.join(projectsDir, '*', '*.jsonl')
];

console.log('\nTesting glob patterns:');
for (const pattern of patterns) {
  console.log(`Pattern: ${pattern}`);
  try {
    const files = globSync(pattern);
    console.log(`  Found ${files.length} files:`);
    files.forEach(f => console.log(`    ${f}`));
  } catch (e) {
    console.error(`  Error: ${e.message}`);
  }
}