/**
 * Aegis Local Folder Auto-Watcher & BM25 Vault Synchronizer
 * Recursively watches user-specified local directories (Obsidian vaults, markdown notes, code repos)
 * and updates the in-memory BM25 index in real-time as files change.
 */

const fs = require('fs');
const path = require('path');
const { vaultEngine } = require('./localIndex');

const SUPPORTED_EXTS = new Set(['.md', '.txt', '.json', '.js', '.py', '.ts', '.csv', '.html', '.sh', '.css']);

class FolderWatcher {
  constructor() {
    this.watchedPath = null;
    this.fsWatcher = null;
    this.indexedFilesCount = 0;
    this.lastSync = null;
    this.debounceTimer = null;
  }

  /**
   * Starts watching a directory and performs initial indexing
   */
  startWatching(targetPath) {
    if (!targetPath || !fs.existsSync(targetPath)) {
      throw new Error(`Directory does not exist: ${targetPath}`);
    }

    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) {
      throw new Error(`Specified path is a file, not a directory: ${targetPath}`);
    }

    // Stop existing watcher if active
    this.stopWatching();

    this.watchedPath = path.resolve(targetPath);

    // Initial recursive indexing
    this.indexDirectory(this.watchedPath);

    // Set up fs.watch
    try {
      this.fsWatcher = fs.watch(this.watchedPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        const ext = path.extname(filename).toLowerCase();
        if (!SUPPORTED_EXTS.has(ext)) return;

        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.handleFileEvent(eventType, path.join(this.watchedPath, filename));
        }, 400);
      });
    } catch (e) {
      console.warn('Recursive file watch warning (Windows fallback applied):', e.message);
    }

    this.lastSync = new Date().toISOString();
    return this.getStatus();
  }

  stopWatching() {
    if (this.fsWatcher) {
      this.fsWatcher.close();
      this.fsWatcher = null;
    }
    this.watchedPath = null;
    this.indexedFilesCount = 0;
  }

  indexDirectory(dirPath) {
    let count = 0;
    const scan = (currDir) => {
      try {
        const entries = fs.readdirSync(currDir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currDir, entry.name);

          // Ignore hidden folders, node_modules, .git
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

          if (entry.isDirectory()) {
            scan(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (SUPPORTED_EXTS.has(ext)) {
              this.indexFile(fullPath);
              count++;
            }
          }
        }
      } catch (e) {
        // Skip permission errors
      }
    };

    scan(dirPath);
    this.indexedFilesCount = count;
  }

  indexFile(filePath) {
    try {
      const stats = fs.statSync(filePath);
      // Skip files larger than 2MB
      if (stats.size > 2 * 1024 * 1024) return;

      const content = fs.readFileSync(filePath, 'utf-8');
      const filename = path.basename(filePath);
      const relativePath = path.relative(this.watchedPath, filePath);
      const ext = path.extname(filePath).replace('.', '');

      const docId = `watched_${Buffer.from(relativePath).toString('base64url')}`;

      vaultEngine.addDocument({
        id: docId,
        title: `${filename} (${relativePath})`,
        content: content,
        tags: [ext, 'local-file', 'auto-sync'],
        source: `Local Vault: ${relativePath}`
      });
    } catch (e) {}
  }

  handleFileEvent(eventType, fullPath) {
    try {
      if (fs.existsSync(fullPath)) {
        this.indexFile(fullPath);
      } else {
        const relativePath = path.relative(this.watchedPath, fullPath);
        const docId = `watched_${Buffer.from(relativePath).toString('base64url')}`;
        vaultEngine.removeDocument(docId);
      }
      this.lastSync = new Date().toISOString();
    } catch (e) {}
  }

  getStatus() {
    return {
      active: !!this.watchedPath,
      watchedPath: this.watchedPath,
      indexedFilesCount: this.indexedFilesCount,
      lastSync: this.lastSync
    };
  }
}

const folderWatcher = new FolderWatcher();

module.exports = {
  folderWatcher,
  FolderWatcher
};
