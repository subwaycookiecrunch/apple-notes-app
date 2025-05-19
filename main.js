// Apple Notes Clone with Google Drive Integration

// Import necessary dependencies
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { google } = require('googleapis');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

// Global references
let mainWindow;
let db;
let darkMode = false;

// Database initialization
function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'notes.db');
  
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Database opening error: ', err);
    
    db.serialize(() => {
      // Create tables if they don't exist
      db.run(`CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      
      db.run(`CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        folder_id INTEGER,
        is_pinned INTEGER DEFAULT 0,
        is_favorite INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        drive_sync_id TEXT,
        last_synced TIMESTAMP,
        FOREIGN KEY (folder_id) REFERENCES folders (id)
      )`);
      
      db.run(`CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id INTEGER,
        file_path TEXT,
        file_type TEXT,
        file_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (note_id) REFERENCES notes (id)
      )`);
      
      // Create default folder if none exists
      db.get("SELECT COUNT(*) as count FROM folders", (err, row) => {
        if (err) console.error(err);
        if (row.count === 0) {
          db.run("INSERT INTO folders (name) VALUES ('Notes')");
        }
      });
    });
  });
}

// Google Drive API setup
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
let oauth2Client = null;

function setupGoogleDrive() {
  const credentials = {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback'
  };
  
  oauth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    credentials.redirect_uri
  );
  
  // Check if we have stored tokens
  const userDataPath = app.getPath('userData');
  const tokenPath = path.join(userDataPath, 'google_tokens.json');
  
  try {
    if (fs.existsSync(tokenPath)) {
      const tokens = JSON.parse(fs.readFileSync(tokenPath));
      oauth2Client.setCredentials(tokens);
    }
  } catch (error) {
    console.error('Error loading Google tokens:', error);
  }
}

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: darkMode ? '#1e1e1e' : '#ffffff'
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  
  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  
  // Create application menu
  createAppMenu();
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create the application menu
function createAppMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New Note', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('new-note') },
        { label: 'New Folder', accelerator: 'CmdOrCtrl+Shift+N', click: () => mainWindow.webContents.send('new-folder') },
        { type: 'separator' },
        { label: 'Export Note', accelerator: 'CmdOrCtrl+E', click: () => mainWindow.webContents.send('export-note') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        { 
          label: 'Format',
          submenu: [
            { label: 'Bold', accelerator: 'CmdOrCtrl+B', click: () => mainWindow.webContents.send('format-bold') },
            { label: 'Italic', accelerator: 'CmdOrCtrl+I', click: () => mainWindow.webContents.send('format-italic') },
            { label: 'Underline', accelerator: 'CmdOrCtrl+U', click: () => mainWindow.webContents.send('format-underline') },
            { label: 'Strikethrough', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow.webContents.send('format-strikethrough') },
            { type: 'separator' },
            { label: 'Heading 1', accelerator: 'CmdOrCtrl+1', click: () => mainWindow.webContents.send('format-h1') },
            { label: 'Heading 2', accelerator: 'CmdOrCtrl+2', click: () => mainWindow.webContents.send('format-h2') },
            { label: 'Heading 3', accelerator: 'CmdOrCtrl+3', click: () => mainWindow.webContents.send('format-h3') },
            { type: 'separator' },
            { label: 'Bulleted List', accelerator: 'CmdOrCtrl+Shift+8', click: () => mainWindow.webContents.send('format-bullet') },
            { label: 'Numbered List', accelerator: 'CmdOrCtrl+Shift+7', click: () => mainWindow.webContents.send('format-number') },
            { label: 'Checklist', accelerator: 'CmdOrCtrl+Shift+L', click: () => mainWindow.webContents.send('format-checklist') }
          ]
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { 
          label: 'Toggle Dark Mode', 
          accelerator: 'CmdOrCtrl+Shift+D', 
          click: () => {
            darkMode = !darkMode;
            mainWindow.webContents.send('toggle-dark-mode', darkMode);
          } 
        },
        { type: 'separator' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Google Drive',
      submenu: [
        { label: 'Sign In', click: () => initiateGoogleAuth() },
        { label: 'Sign Out', click: () => signOutGoogle() },
        { type: 'separator' },
        { label: 'Sync Now', accelerator: 'CmdOrCtrl+S', click: () => syncWithDrive() },
        { label: 'Sync Settings', click: () => mainWindow.webContents.send('open-sync-settings') }
      ]
    },
    {
      role: 'help',
      submenu: [
        { label: 'About', click: () => mainWindow.webContents.send('show-about') },
        { label: 'Documentation', click: async () => { 
          const { shell } = require('electron');
          await shell.openExternal('https://github.com/yourusername/apple-notes-clone');
        }}
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Google Drive Authentication
function initiateGoogleAuth() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  
  const authWindow = new BrowserWindow({
    width: 600,
    height: 800,
    webPreferences: {
      nodeIntegration: false
    }
  });
  
  authWindow.loadURL(authUrl);
  
  authWindow.webContents.on('will-navigate', handleGoogleCallback);
  authWindow.webContents.on('will-redirect', handleGoogleCallback);
  
  function handleGoogleCallback(event, url) {
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get('code');
    
    if (code) {
      authWindow.close();
      
      oauth2Client.getToken(code, (err, tokens) => {
        if (err) {
          console.error('Error getting tokens:', err);
          return;
        }
        
        oauth2Client.setCredentials(tokens);
        
        // Save tokens for future use
        const userDataPath = app.getPath('userData');
        const tokenPath = path.join(userDataPath, 'google_tokens.json');
        fs.writeFileSync(tokenPath, JSON.stringify(tokens));
        
        // Notify renderer about successful authentication
        mainWindow.webContents.send('google-auth-success');
        
        // Create a dedicated folder for notes backup if it doesn't exist
        createDriveBackupFolder();
      });
    }
  }
}

// Create a dedicated folder in Google Drive for notes backup
async function createDriveBackupFolder() {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  // Check if the folder already exists
  const response = await drive.files.list({
    q: "name='AppleNotesClone' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id, name)'
  });
  
  if (response.data.files.length > 0) {
    // Folder exists, store its ID
    const folderId = response.data.files[0].id;
    saveDriveFolderId(folderId);
    return folderId;
  } else {
    // Create a new folder
    const fileMetadata = {
      name: 'AppleNotesClone',
      mimeType: 'application/vnd.google-apps.folder'
    };
    
    const folder = await drive.files.create({
      resource: fileMetadata,
      fields: 'id'
    });
    
    saveDriveFolderId(folder.data.id);
    return folder.data.id;
  }
}

// Save Drive folder ID to app settings
function saveDriveFolderId(folderId) {
  const userDataPath = app.getPath('userData');
  const settingsPath = path.join(userDataPath, 'settings.json');
  
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath));
  }
  
  settings.driveFolderId = folderId;
  fs.writeFileSync(settingsPath, JSON.stringify(settings));
}

// Sign out from Google
function signOutGoogle() {
  const userDataPath = app.getPath('userData');
  const tokenPath = path.join(userDataPath, 'google_tokens.json');
  
  if (fs.existsSync(tokenPath)) {
    fs.unlinkSync(tokenPath);
  }
  
  oauth2Client = null;
  setupGoogleDrive();
  
  mainWindow.webContents.send('google-auth-signout');
}

// Sync notes with Google Drive
async function syncWithDrive() {
  if (!oauth2Client) {
    mainWindow.webContents.send('sync-error', 'Not authenticated with Google Drive');
    return;
  }
  
  try {
    mainWindow.webContents.send('sync-started');
    
    // Get all notes from the database
    const notes = await getAllNotes();
    
    // Get the Drive folder ID
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    let folderId;
    
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath));
      folderId = settings.driveFolderId;
    }
    
    if (!folderId) {
      folderId = await createDriveBackupFolder();
    }
    
    // Sync each note
    for (const note of notes) {
      await syncNoteWithDrive(note, folderId);
    }
    
    mainWindow.webContents.send('sync-completed');
  } catch (error) {
    console.error('Sync error:', error);
    mainWindow.webContents.send('sync-error', error.message);
  }
}

// Get all notes from the database
function getAllNotes() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM notes", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Sync a single note with Google Drive
async function syncNoteWithDrive(note, folderId) {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  // Prepare note content as JSON
  const noteContent = {
    id: note.id,
    title: note.title,
    content: note.content,
    folder_id: note.folder_id,
    is_pinned: note.is_pinned,
    is_favorite: note.is_favorite,
    created_at: note.created_at,
    updated_at: note.updated_at
  };
  
  const tempFilePath = path.join(app.getPath('temp'), `note_${note.id}.json`);
  fs.writeFileSync(tempFilePath, JSON.stringify(noteContent, null, 2));
  
  if (note.drive_sync_id) {
    // Update existing file
    await drive.files.update({
      fileId: note.drive_sync_id,
      media: {
        mimeType: 'application/json',
        body: fs.createReadStream(tempFilePath)
      }
    });
  } else {
    // Create new file
    const fileMetadata = {
      name: `note_${note.id}.json`,
      parents: [folderId]
    };
    
    const response = await drive.files.create({
      resource: fileMetadata,
      media: {
        mimeType: 'application/json',
        body: fs.createReadStream(tempFilePath)
      },
      fields: 'id'
    });
    
    // Update note with Drive sync ID
    await updateNoteDriveSyncId(note.id, response.data.id);
  }
  
  // Clean up temp file
  fs.unlinkSync(tempFilePath);
  
  // Update last synced timestamp
  await updateNoteLastSynced(note.id);
}

// Update note's Drive sync ID in the database
function updateNoteDriveSyncId(noteId, driveSyncId) {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE notes SET drive_sync_id = ? WHERE id = ?",
      [driveSyncId, noteId],
      function(err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Update note's last synced timestamp
function updateNoteLastSynced(noteId) {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE notes SET last_synced = CURRENT_TIMESTAMP WHERE id = ?",
      [noteId],
      function(err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// IPC handlers for communication with renderer process
function setupIpcHandlers() {
  // Note operations
  ipcMain.handle('get-notes', async (event, folderId) => {
    return new Promise((resolve, reject) => {
      const query = folderId 
        ? "SELECT * FROM notes WHERE folder_id = ? ORDER BY is_pinned DESC, updated_at DESC" 
        : "SELECT * FROM notes ORDER BY is_pinned DESC, updated_at DESC";
      
      const params = folderId ? [folderId] : [];
      
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });
  
  ipcMain.handle('get-note', async (event, noteId) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM notes WHERE id = ?", [noteId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  });
  
  ipcMain.handle('create-note', async (event, note) => {
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO notes (title, content, folder_id) VALUES (?, ?, ?)",
        [note.title, note.content, note.folder_id],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...note });
        }
      );
    });
  });
  
  ipcMain.handle('update-note', async (event, note) => {
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE notes SET title = ?, content = ?, folder_id = ?, is_pinned = ?, is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [note.title, note.content, note.folder_id, note.is_pinned, note.is_favorite, note.id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  });
  
  ipcMain.handle('delete-note', async (event, noteId) => {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM notes WHERE id = ?", [noteId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  });
  
  // Folder operations
  ipcMain.handle('get-folders', async () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM folders ORDER BY name", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });
  
  ipcMain.handle('create-folder', async (event, folderName) => {
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO folders (name) VALUES (?)",
        [folderName],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, name: folderName });
        }
      );
    });
  });
  
  ipcMain.handle('update-folder', async (event, folder) => {
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE folders SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [folder.name, folder.id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  });
  
  ipcMain.handle('delete-folder', async (event, folderId) => {
    return new Promise((resolve, reject) => {
      // First move all notes in this folder to the default folder
      db.run("UPDATE notes SET folder_id = 1 WHERE folder_id = ?", [folderId], (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Then delete the folder
        db.run("DELETE FROM folders WHERE id = ?", [folderId], function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        });
      });
    });
  });
  
  // Search functionality
  ipcMain.handle('search-notes', async (event, searchTerm) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM notes 
        WHERE title LIKE ? OR content LIKE ? 
        ORDER BY is_pinned DESC, updated_at DESC
      `;
      const param = `%${searchTerm}%`;
      
      db.all(query, [param, param], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });
  
  // Google Drive operations
  ipcMain.handle('sync-with-drive', async () => {
    try {
      await syncWithDrive();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('check-google-auth', async () => {
    const userDataPath = app.getPath('userData');
    const tokenPath = path.join(userDataPath, 'google_tokens.json');
    return fs.existsSync(tokenPath);
  });
  
  ipcMain.on('initiate-google-auth', () => {
    initiateGoogleAuth();
  });
  
  ipcMain.on('sign-out-google', () => {
    signOutGoogle();
  });
}

// App lifecycle events
app.whenReady().then(() => {
  initDatabase();
  setupGoogleDrive();
  createWindow();
  setupIpcHandlers();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Close database connection
  if (db) {
    db.close();
  }
}); 