# AI-interview-platform

# 🚀 AI Interview Preparation Platform

An advanced full-stack web application designed to help users prepare for technical interviews through AI-powered mock interview sessions. The platform simulates real-world interview scenarios across multiple rounds, including Technical, HR, Coding, and Aptitude, providing users with a structured and interactive preparation experience.

## 🌟 Features

* 🔐 **User Authentication** – Secure signup and login system using JWT
* 🤖 **AI-Powered Interviews** – Dynamic question generation using AI APIs
* 🧠 **Multiple Interview Rounds**

  * Technical Round
  * HR Round
  * Coding Round
  * Aptitude Round
* 💾 **Real-Time Data Storage** – User responses and progress saved in MongoDB
* 📊 **Performance Tracking** – Analyze answers and improve interview skills
* 🌐 **Fully Deployed Application** – Accessible via live hosted URL

## 🛠️ Tech Stack

**Frontend:** React.js, Tailwind CSS / Bootstrap
**Backend:** Node.js, Express.js
**Database:** MongoDB Atlas
**Authentication:** JWT (JSON Web Tokens)
**APIs:** OpenRouter API (AI), JDoodle API (Code Execution)
**Deployment:** Render

## 📦 Project Structure

* `/frontend` – React application
* `/backend` – Express server and APIs
* `/models` – MongoDB schemas
* `/routes` – API routes
* `/controllers` – Business logic

## ⚙️ Environment Variables

Create a `.env` file in the backend directory and add:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
OPENROUTER_API_KEY=your_api_key
JDOODLE_CLIENT_ID=your_client_id
JDOODLE_CLIENT_SECRET=your_client_secret
```

> ⚠️ Do not commit your `.env` file to GitHub.

## 🚀 Installation & Setup

### 1. Clone the Repository

```
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. Install Dependencies

```
cd backend
npm install

cd ../frontend
npm install
```

### 3. Run the Application

```
# Backend
cd backend
npm start

# Frontend
cd frontend
npm run dev
```

## 🌐 Live Demo

👉 [Live Website Link]
👉 [GitHub Repository Link]

## 📈 Future Improvements

* AI-based scoring system
* Take Four Rounds of (Aptituted,Technical,Coding.HR)interviews
* Detailed analytics dashboard
* Real Time Feedback from AI

## 🙌 Author

Developed by **Nisarg Trivedi**
B.Tech Computer Engineering | Full Stack Developer

---

✨ This project demonstrates strong skills in full-stack development, API integration, authentication, and real-world deployment.

