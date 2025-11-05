const fs = require('fs');
const path = require('path');

// Create archive directory
const archiveDir = path.join(__dirname, 'docs', 'archive');
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
}

// Files to KEEP in root
const keepFiles = [
  'README.md',
  'CLAUDE.md',
  'prd.md',
  'DEMO_ACCOUNTS.md',
  'HONEST_STATUS_REPORT.md',
  'APPLY_MIGRATION_MANUALLY.md',
];

// Files to ARCHIVE (move to docs/archive)
const archivePatterns = [
  /^WEEK_\d/,
  /^DAY_\d/,
  /^PHASE_/,
  /SUMMARY\.md$/,
  /REPORT\.md$/,
  /COMPLETE\.md$/,
  /CHECKLIST\.md$/,
  /GUIDE\.md$/,
  /FIX/,
  /IMPLEMENTATION/,
  /TRACKING/,
  /DELIVERY/,
  /PROJECT_/,
  /AGENT_/,
  /test-/,
  /button-test/,
];

console.log('🗑️  Starting .md cleanup...\n');

// Get all .md files in root
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.md'));

console.log(`📊 Found ${files.length} .md files in root\n`);

let kept = 0;
let archived = 0;

files.forEach(file => {
  if (keepFiles.includes(file)) {
    console.log(`✅ KEEP: ${file}`);
    kept++;
    return;
  }

  const shouldArchive = archivePatterns.some(pattern => pattern.test(file));

  if (shouldArchive) {
    const source = path.join(__dirname, file);
    const dest = path.join(archiveDir, file);

    try {
      fs.renameSync(source, dest);
      console.log(`📦 ARCHIVED: ${file}`);
      archived++;
    } catch (err) {
      console.error(`❌ Failed to archive ${file}:`, err.message);
    }
  } else {
    console.log(`⚠️  REVIEW MANUALLY: ${file}`);
  }
});

console.log(`\n📈 Summary:`);
console.log(`   Kept in root: ${kept}`);
console.log(`   Archived: ${archived}`);
console.log(`   Need review: ${files.length - kept - archived}`);
console.log(`\n✅ Cleanup complete!`);
console.log(`📁 Archived files: docs/archive/`);
