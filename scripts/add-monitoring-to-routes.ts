/**
 * Script to automatically add monitoring to all API routes
 * Run with: npx tsx scripts/add-monitoring-to-routes.ts
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const API_DIR = path.join(process.cwd(), 'app/api');

// Monitoring import to add
const MONITORING_IMPORT = `import { withMonitoring } from '@/lib/monitoring/api-middleware';`;

/**
 * Check if file already has monitoring
 */
function hasMonitoring(content: string): boolean {
  return content.includes('withMonitoring') || content.includes('api-middleware');
}

/**
 * Wrap handler function with monitoring
 */
function wrapHandler(content: string): string {
  // Add import if not present
  if (!content.includes('api-middleware')) {
    // Find the last import statement
    const importRegex = /^import .+ from .+;$/gm;
    const imports = content.match(importRegex);
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      content = content.replace(lastImport, `${lastImport}\n${MONITORING_IMPORT}`);
    } else {
      // No imports found, add at the top
      content = `${MONITORING_IMPORT}\n\n${content}`;
    }
  }

  // Wrap each handler function
  const handlerRegex = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(/g;
  
  content = content.replace(handlerRegex, (match, method) => {
    return `export const ${method} = withMonitoring(async function(`;
  });

  // Close the withMonitoring wrapper
  // Find the closing brace of each handler
  const lines = content.split('\n');
  const newLines: string[] = [];
  let inHandler = false;
  let braceCount = 0;
  let handlerStartLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is a handler function
    if (line.includes('export const') && /GET|POST|PUT|DELETE|PATCH/.test(line) && line.includes('withMonitoring')) {
      inHandler = true;
      handlerStartLine = i;
      braceCount = 0;
    }

    if (inHandler) {
      // Count braces
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      // If we've closed all braces, add closing parenthesis
      if (braceCount === 0 && i > handlerStartLine) {
        newLines.push(line + ');');
        inHandler = false;
        continue;
      }
    }

    newLines.push(line);
  }

  return newLines.join('\n');
}

/**
 * Process a single route file
 */
async function processRouteFile(filePath: string): Promise<void> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Skip if already has monitoring
    if (hasMonitoring(content)) {
      console.log(`✓ Skipped (already monitored): ${filePath}`);
      return;
    }

    // Skip if no handlers found
    if (!/export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/.test(content)) {
      console.log(`✓ Skipped (no handlers): ${filePath}`);
      return;
    }

    // Wrap handlers with monitoring
    const newContent = wrapHandler(content);

    // Write back to file
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`✓ Added monitoring: ${filePath}`);
  } catch (error: any) {
    console.error(`✗ Failed to process ${filePath}:`, error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Finding API route files...\n');

  // Find all route.ts files in app/api
  const routeFiles = glob.sync(`${API_DIR}/**/route.ts`);

  console.log(`Found ${routeFiles.length} route files\n`);
  console.log('📝 Adding monitoring to routes...\n');

  for (const file of routeFiles) {
    await processRouteFile(file);
  }

  console.log('\n✅ Done! Monitoring added to all API routes.');
  console.log('\n📋 Next steps:');
  console.log('1. Review the changes with: git diff');
  console.log('2. Test the API routes');
  console.log('3. Commit the changes');
  console.log('4. Deploy to production');
}

// Run the script
main().catch(console.error);
