# PulseBoard 📊

PulseBoard is a high-performance, real-time interactive polling application designed to demonstrate event-driven web architectures using **.NET Web API**, **SignalR**, and **React**.

---

## 🚀 Key Features

* **Real-time Live Updates:** Instant vote distribution and bar chart animations via WebSockets (SignalR).
* **Role-based Architecture:** Host management interface paired with an anonymous participant portal.
* **Resilient Connection Handling:** Automatic fallback polling mechanism for late-joining participants.
* **Clean UI & Motion:** Built with Tailwind CSS and Framer Motion for smooth transitions.

---

## 🛠️ Tech Stack

### **Backend**
* **Framework:** .NET 8 Web API
* **Real-time Communication:** ASP.NET Core SignalR
* **Database:** Entity Framework Core / SQL Server
* **Authentication:** JWT Bearer Tokens

### **Frontend**
* **Library:** React (TypeScript + Vite)
* **Styling:** Tailwind CSS
* **Animations:** Framer Motion
* **Real-time Client:** `@microsoft/signalr`

---

## 📂 Project Structure


PulseBoard/
├── PulseBoard-Backend/   # .NET Web API solution, EF Core models, & SignalR Hubs
└── PulseBoard-Frontend/  # React SPA, custom hooks, & real-time chart UI

⚙️ Getting Started
Prerequisites
.NET 8 SDK

Node.js (v18+)

1. Run the Backend

cd PulseBoard-Backend/src/PulseBoard.API
dotnet restore
dotnet run

2. Run the Frontend

cd PulseBoard-Frontend
npm install
npm run dev
Open http://localhost:5173 in your browser to launch the client.