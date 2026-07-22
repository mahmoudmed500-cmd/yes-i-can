# Deploy "Yes I Can" to the Internet

Follow these steps in order. Total time: ~20 minutes.

---

## Step 1: Create a GitHub account (if you don't have one)

Go to https://github.com and sign up (free).

---

## Step 2: Install Git

Download from https://git-scm.com/download/win and install with default settings.

---

## Step 3: Upload your code to GitHub

Open a terminal and run these commands one by one:

```bash
cd C:\Users\pp\Desktop\yes-i-can
git init
git add .
git commit -m "Initial commit - Yes I Can"
```

Then:
1. Go to https://github.com/new
2. Name the repository: `yes-i-can`
3. Make it **Public** (required for free Vercel)
4. Click **Create repository**
5. Run these commands (replace `YOUR_USERNAME` with your GitHub username):

```bash
git remote add origin https://github.com/YOUR_USERNAME/yes-i-can.git
git branch -M main
git push -u origin main
```

---

## Step 4: Deploy the Backend (Railway)

1. Go to https://railway.app and sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `yes-i-can` repository
4. Railway will detect it has a `backend/` folder. If it asks for a root directory, type: `backend`
5. Once the service is created, go to **Settings** → **Networking** → **Generate Domain**
6. Copy the URL it gives you (looks like `xxx.up.railway.app`)
7. Go to **Variables** and add:
   - `YIC_SECRET_KEY` = `021c9ea1967897e36c3bf807480306a9c4f6f4bd0678a26d107a025229bfbe5f`
8. Wait for it to redeploy. Visit `https://your-url.up.railway.app/docs` — you should see the API docs.

---

## Step 5: Deploy the Frontend (Vercel)

1. Go to https://vercel.com and sign up with GitHub
2. Click **Add New** → **Project**
3. Import your `yes-i-can` repository
4. Set the **Framework Preset** to: `Vite`
5. Set the **Root Directory** to: `frontend`
6. Under **Environment Variables**, add:
   - Name: `VITE_API_URL`
   - Value: `https://your-url.up.railway.app` (the Railway URL from Step 4)
7. Click **Deploy**
8. Wait ~1 minute. Vercel gives you a URL like `yes-i-can.vercel.app`

---

## Step 6: Test it live

1. Open your Vercel URL on your phone
2. Tap **Try Demo (Admin)** to log in
3. On Chrome mobile, tap **"Add to Home Screen"** when the banner appears
4. The app now lives on your phone like a native app

---

## Step 7: Create real accounts

1. Log in as admin
2. Go to **Directory** tab
3. Click **+ Add person** to create real teacher and student accounts
4. Create groups and schedule classes

---

## That's it!

Your center now has:
- A live dashboard at `https://yes-i-can.vercel.app`
- A backend API at `https://xxx.up.railway.app`
- PWA installable on any phone
- All data persisted in the cloud

### Costs: $0/month (free tiers)

### If you hit limits:
- Railway free trial expires after $5 credit (~1-2 months of light use). After that, it's $5/month.
- Vercel free tier is unlimited for personal projects.
