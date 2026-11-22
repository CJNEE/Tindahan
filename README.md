# Tindahan — SHELLA Sari-Sari Store POS System

A modern, responsive Sari-Sari Store Point of Sale (POS) and inventory management web application. Features dark/light themes, offline-first persistence, receipt printing, customer utang tracking & debt settlement, and cloud database connectivity.

## 🚀 Deployment Guide

### Backend on Render
1. Create a new **Web Service** on [Render](https://render.com).
2. Connect this repository: `https://github.com/ostagashella-afk/Tindahan.git`.
3. Set the following configuration:
   - **Root Directory**: `backend`
   - **Environment**: `Python`
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn store_project.wsgi:application`
4. In **Environment Variables**, add:
   - `DATABASE_URL`: Your PostgreSQL connection string (e.g., Aiven PostgreSQL).
   - `DJANGO_SECRET`: Any random secure secret key string.
   - `DJANGO_DEBUG`: `0`

### Frontend on Vercel
1. Import this repository on [Vercel](https://vercel.com).
2. Set the **Root Directory** to `frontend`.
3. In **Environment Variables**, add:
   - `VITE_API_URL`: Your deployed Render backend URL + `/api` (e.g. `https://your-app.onrender.com/api`).
4. Click **Deploy**.

---

## 💻 Local Development Setup

### Backend (Django)
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
