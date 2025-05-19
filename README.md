# Apple Notes Clone

A clean, simple notes application inspired by Apple Notes with Google Drive integration for synchronization across devices.

## Features

- 📝 Create, edit, and organize notes
- 📁 Folder organization for notes
- 🔍 Search functionality
- ✏️ Rich text formatting
- 🌙 Dark mode support
- 📱 Responsive design
- 🔄 Google Drive synchronization

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```
git clone https://github.com/yourusername/apple-notes-clone.git
cd apple-notes-clone
```

2. Install dependencies:
```
npm install
```

3. Create environment variables for Google API credentials:
- Create a `.env` file in the root directory with the following:
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

4. Start the application:
```
npm start
```

## Development

To run the application in development mode:

```
npm run dev
```

## Google Drive Integration

To use the Google Drive integration:

1. Create a Google Cloud Project
2. Enable the Google Drive API
3. Create OAuth credentials (Web application type)
4. Add the credentials to your `.env` file

## License

MIT

## Credits

- Built with Electron
- Uses SQLite for local storage
- Google Drive API for cloud synchronization 