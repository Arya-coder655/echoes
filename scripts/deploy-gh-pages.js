import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const distDir = path.resolve('dist');
if (!fs.existsSync(distDir)) {
  console.error('dist directory does not exist! Run npm run build first.');
  process.exit(1);
}

const tempDir = path.join(os.tmpdir(), `gh-pages-deploy-${Date.now()}`);
fs.mkdirSync(tempDir, { recursive: true });

function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyRecursive(distDir, tempDir);

const run = (cmd, cwd = tempDir) => {
  return execSync(cmd, { cwd, stdio: 'inherit' });
};

console.log('Initializing git in temp directory:', tempDir);
run('git init');
run('git config user.name "Arya-coder655"');
run('git config user.email "aryamore655@gmail.com"');
run('git checkout -b gh-pages');
run('git add -A');
run('git commit -m "deploy: update GitHub Pages build with full mobile responsive system and beer easter egg"');

const rootRemoteUrl = execSync('git remote get-url origin', { cwd: path.resolve('.') }).toString().trim();
run(`git remote add origin ${rootRemoteUrl}`);
console.log('Pushing to origin gh-pages...');
run('git push origin gh-pages --force');

// Cleanup
fs.rmSync(tempDir, { recursive: true, force: true });
console.log('✨ GitHub Pages successfully updated!');
