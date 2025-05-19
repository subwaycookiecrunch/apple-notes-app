// Preload script for Electron
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Note operations
    getNotes: (folderId) => ipcRenderer.invoke('get-notes', folderId),
    getNote: (noteId) => ipcRenderer.invoke('get-note', noteId),
    createNote: (note) => ipcRenderer.invoke('create-note', note),
    updateNote: (note) => ipcRenderer.invoke('update-note', note),
    deleteNote: (noteId) => ipcRenderer.invoke('delete-note', noteId),
    
    // Folder operations
    getFolders: () => ipcRenderer.invoke('get-folders'),
    createFolder: (folderName) => ipcRenderer.invoke('create-folder', folderName),
    updateFolder: (folder) => ipcRenderer.invoke('update-folder', folder),
    deleteFolder: (folderId) => ipcRenderer.invoke('delete-folder', folderId),
    
    // Search functionality
    searchNotes: (searchTerm) => ipcRenderer.invoke('search-notes', searchTerm),
    
    // Google Drive operations
    syncWithDrive: () => ipcRenderer.invoke('sync-with-drive'),
    checkGoogleAuth: () => ipcRenderer.invoke('check-google-auth'),
    initiateGoogleAuth: () => ipcRenderer.send('initiate-google-auth'),
    signOutGoogle: () => ipcRenderer.send('sign-out-google'),
    
    // Event listeners
    on: (channel, callback) => {
      const validChannels = [
        'new-note', 
        'new-folder', 
        'export-note', 
        'format-bold', 
        'format-italic', 
        'format-underline', 
        'format-strikethrough', 
        'format-h1', 
        'format-h2', 
        'format-h3', 
        'format-bullet', 
        'format-number', 
        'format-checklist', 
        'toggle-dark-mode', 
        'open-sync-settings', 
        'show-about', 
        'google-auth-success', 
        'google-auth-signout', 
        'sync-started', 
        'sync-completed', 
        'sync-error'
      ];
      
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender` 
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
      }
    },
    
    off: (channel, callback) => {
      ipcRenderer.removeListener(channel, callback);
    }
  }
); 