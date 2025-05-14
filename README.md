# QR Code Generator Web App

A full-featured QR code generator web application with user authentication, built using React, TypeScript, Vite, and MongoDB.

## Project Structure

This project uses a modern monorepo structure with separate frontend and backend directories:

```
qr-code-generator/
├── frontend/           # React & TypeScript frontend
│   ├── src/            # Frontend source code
│   ├── public/         # Static assets
│   └── .env           # Frontend environment variables
├── backend/            # Express & MongoDB backend
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── middleware/     # Express middleware
│   └── .env           # Backend environment variables
├── scripts/            # Helper scripts for running the app
│   ├── start-app.bat   # Windows script to start the application
│   ├── start-app.sh    # Unix script to start the application
│   ├── start-mongodb.bat # Windows script to start MongoDB
│   ├── start-mongodb.sh # Unix script to start MongoDB
│   ├── test-api.bat    # Windows script to test API endpoints
│   └── test-api.sh     # Unix script to test API endpoints
├── docs/              # Project documentation
└── data/              # MongoDB data directory (created at runtime)
```

## Features

- User authentication (login, signup, logout) with MongoDB and JWT
- Generate QR codes from text or URLs
- Download generated QR codes
- View history of generated QR codes
- Responsive design with Bootstrap

## Quick Start

1. **Use the interactive launcher:**

   ```
   # Windows
   start.bat

   # Unix/Mac
   ./start.sh
   ```

2. **Or run specific scripts directly:**

   ```
   # Windows
   scripts\start-app.bat            # Start the full application
   scripts\start-mongodb.bat        # Start MongoDB only
   scripts\test-api.bat             # Test API endpoints

   # Unix/Mac
   ./scripts/start-app.sh           # Start the full application
   ./scripts/start-mongodb.sh       # Start MongoDB only
   ./scripts/test-api.sh            # Test API endpoints
   ```

3. **Using npm commands:**

   ```
   npm run start                    # Start frontend and backend
   npm run start:mongodb            # Start MongoDB only
   npm run test:api                 # Test API endpoints
   ```

4. **Open in browser:**
   - Go to http://localhost:5173

## Environment Setup

### Frontend (.env)

```
VITE_API_URL=http://localhost:5000/api
```

### Backend (.env)

```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/qr-code-generator
JWT_SECRET=your_secure_random_string
```

## Troubleshooting

If you encounter any issues, please check the [Troubleshooting Guide](./TROUBLESHOOTING.md).

## Testing Authentication API

You can test the authentication API using the provided script:

- On Windows:
  ```
  test-api.bat
  ```
- On Linux/Mac:
  ```
  ./test-api.sh
  ```

## Technologies Used

- **Frontend**: React, TypeScript, Vite, Bootstrap
- **Authentication**: JWT (JSON Web Tokens), bcryptjs
- **Backend**: Express.js, MongoDB
- **Packages**: react-router-dom, qrcode, react-hot-toast

## Setup Instructions

### Prerequisites

- Node.js and npm installed
- MongoDB installed and running locally

### Frontend Setup

1. Clone this repository
2. Navigate to the frontend directory
   ```bash
   cd frontend
   ```
3. Install frontend dependencies
   ```bash
   npm install
   ```
4. Create a .env file in the frontend directory with the following content:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

### Backend Setup

1. Navigate to the backend directory
   ```bash
   cd backend
   ```
2. Install backend dependencies
   ```bash
   npm install
   ```
3. Create a .env file in the backend directory with the following content:
   ```
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/qr-code-generator
   JWT_SECRET=your_secure_random_string
   ```

### Running the Application

#### Option 1: Using the start script

```bash
# Windows
start-app.bat

# Linux/Mac
bash start-app.sh
```

#### Option 2: Using npm scripts

Run both frontend and backend concurrently from the root directory:

```bash
npm run start
```

Or run them separately:

```bash
# Frontend
npm run start:frontend

# Backend
npm run start:backend
```

## Project Structure

This project is organized as follows:

### Root Directory

- `package.json` - Workspace configuration
- `start-app.bat` - Script to start the entire application
- `start-mongodb.bat/sh` - Scripts to start MongoDB
- `test-api.bat/sh` - Scripts to test the API

### Frontend (`/frontend`)

- `src/` - Frontend React code
  - `components/` - React components
  - `contexts/` - Context providers (Auth)
  - `config/` - Configuration files

### Backend (`/backend`)

- `models/` - MongoDB models
- `routes/` - API routes
- `middleware/` - Express middleware
- `index.js` - Express server entry point

### Documentation (`/docs`)

- Various markdown files with documentation

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    "react-x": reactX,
    "react-dom": reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs["recommended-typescript"].rules,
    ...reactDom.configs.recommended.rules,
  },
});
```
