# MERN File Uploader

A full-stack file uploader built with the MERN stack. Users can register, log in, upload files, view their files, and delete them. Files are stored in MongoDB using GridFS.

## Features

- User registration and login (JWT authentication)
- Forgot password and reset password via email (Nodemailer)
- File upload with Multer and GridFS
- View and delete uploaded files

## Tech Stack

- **Frontend:** React, Vite
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose, GridFS)
- **Auth:** JWT, bcryptjs
- **Email:** Nodemailer

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A MongoDB database (local or MongoDB Atlas)
- A Gmail account with an App Password

### 1. Clone the repository

```bash
git clone https://github.com/kitabilaibii-web/Syntecxhub_-MERN-File-Uploader.git
cd Syntecxhub_-MERN-File-Uploader
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_gmail_app_password
FRONTEND_URL=http://localhost:5173
```

Start the server:

```bash
npm start
```

### 3. Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:

```
VITE_API_URL=http://localhost:5000
```

Start the app:

```bash
npm run dev
```

The app runs on `http://localhost:5173`.

## Author

Your Name# Syntecxhub_-MERN-File-Uploader
