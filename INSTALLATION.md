# Installation Guide for Apple Notes Clone

## Prerequisites Installation

### 1. Install Node.js and npm

1. Download the Node.js installer from [nodejs.org](https://nodejs.org/)
   - Choose the LTS (Long Term Support) version for Windows
   - Direct link: https://nodejs.org/dist/v18.16.0/node-v18.16.0-x64.msi

2. Run the installer and follow the installation steps:
   - Accept the license agreement
   - Choose the default installation path
   - Click "Next" through the installation wizard
   - Click "Install"

3. Verify installation by opening a new PowerShell window and typing:
   ```
   node -v
   npm -v
   ```

### 2. Install the project dependencies

1. Open PowerShell and navigate to the project directory:
   ```
   cd "C:\Users\raj97\OneDrive\Desktop\AppleNotesClone"
   ```

2. Install the dependencies:
   ```
   npm install
   ```
   This may take a few minutes to complete.

## Setting up Google Drive Integration (Optional)

If you want to use the Google Drive sync functionality:

1. Visit the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Drive API for your project
4. Create OAuth 2.0 credentials:
   - Choose "Web application" type
   - Add "http://localhost:3000/oauth2callback" as an authorized redirect URI
5. Create a `.env` file in the project root:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
   ```

## Running the Application

1. In PowerShell, navigate to the project directory:
   ```
   cd "C:\Users\raj97\OneDrive\Desktop\AppleNotesClone"
   ```

2. Start the application:
   ```
   npm start
   ```

## Troubleshooting

If you encounter any errors:

1. Make sure you have installed Node.js correctly
2. Try running as administrator
3. Check that all dependencies were installed properly
4. For Google Drive sync issues, verify your API credentials 