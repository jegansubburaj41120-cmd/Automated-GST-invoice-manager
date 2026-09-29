const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Preparing clean ZIP package: gst-invoice-receipt-manager.zip...');

const targetZip = path.join(__dirname, 'gst-invoice-receipt-manager.zip');
if (fs.existsSync(targetZip)) {
  fs.unlinkSync(targetZip);
}

// Create a staging directory
const stagingDir = path.join(__dirname, 'staging_pkg');
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

function copyRecursive(src, dest, ignoreDirs = ['node_modules', '.git', 'dist', 'staging_pkg', 'logs']) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    const baseName = path.basename(src);
    if (ignoreDirs.includes(baseName)) return;

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      if (entry === 'gst-invoice-receipt-manager.zip' || entry === '.env') continue;
      copyRecursive(path.join(src, entry), path.join(dest, entry), ignoreDirs);
    }
  } else {
    // Skip zip or raw logs
    if (src.endsWith('.zip') || src.endsWith('.log')) return;
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(__dirname, stagingDir);

// Package using PowerShell Compress-Archive
console.log('Compressing staging files into ZIP...');
try {
  execSync(`powershell -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${targetZip}' -Force"`, {
    stdio: 'inherit'
  });
  console.log('✅ Clean ZIP package created successfully at:', targetZip);
} catch (err) {
  console.error('Error creating ZIP:', err);
} finally {
  // Clean staging
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
}
