# Freedom Cafe — Setup Guide
## Google Sheets + ImgBB (100% Free)

Follow these steps to connect your website to a real backend. Takes about 15 minutes.

---

## STEP 1: Get ImgBB API Key (2 minutes)

1. Go to **https://api.imgbb.com/**
2. Click **"Get API key"**
3. Create a free account (just email + password)
4. Copy your API key — it looks like: `a1b2c3d4e5f6g7h8i9j0`
5. **Save it somewhere** — you'll need it in Step 4

---

## STEP 2: Create a Google Sheet (3 minutes)

1. Go to **https://sheets.google.com** and create a new blank spreadsheet
2. Rename it to **"Freedom Cafe Database"**
3. In the first sheet (Sheet1), rename the tab to **"data"**
4. In cell **A1** type: `key`
5. In cell **B1** type: `value`
6. That's it — the script will handle everything else automatically

---

## STEP 3: Add the Google Apps Script (5 minutes)

1. In your Google Sheet, click **Extensions → Apps Script**
2. **Delete** all the default code in the editor
3. **Copy and paste** the entire code below:

```javascript
// ═══════════════════════════════════════════════════
// FREEDOM CAFE — GOOGLE APPS SCRIPT BACKEND
// This runs as a free web API for your cafe website
// ═══════════════════════════════════════════════════

function doGet(e) {
  var params = e.parameter;
  var action = params.action;
  var key = params.key;

  if (action === "get" && key) {
    var value = getData(key);
    return sendJSON(value);
  }

  if (action === "getAll") {
    var all = getAllData();
    return sendJSON(all);
  }

  return sendJSON({ error: "Invalid action" });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;

    if (action === "set" && body.key) {
      setData(body.key, body.value);
      return sendJSON({ success: true });
    }

    if (action === "delete" && body.key) {
      deleteData(body.key);
      return sendJSON({ success: true });
    }

    return sendJSON({ error: "Invalid action" });
  } catch (err) {
    return sendJSON({ error: err.message });
  }
}

// ─── HELPERS ───

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName("data");
}

function getData(key) {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      try {
        return JSON.parse(data[i][1]);
      } catch (e) {
        return data[i][1];
      }
    }
  }
  return null;
}

function getAllData() {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var result = {};
  for (var i = 1; i < data.length; i++) {
    try {
      result[data[i][0]] = JSON.parse(data[i][1]);
    } catch (e) {
      result[data[i][0]] = data[i][1];
    }
  }
  return result;
}

function setData(key, value) {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var jsonValue = JSON.stringify(value);

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(jsonValue);
      return;
    }
  }
  sheet.appendRow([key, jsonValue]);
}

function deleteData(key) {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function sendJSON(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. Click **File → Save** (or Ctrl+S)
5. Name the project **"Freedom Cafe Backend"**

---

## STEP 4: Deploy the Script as a Web App (3 minutes)

1. In Apps Script editor, click **Deploy → New deployment**
2. Click the ⚙️ gear icon next to "Select type" and choose **"Web app"**
3. Fill in:
   - **Description:** `Freedom Cafe API`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Click **Deploy**
5. It will ask for authorization — click **Review Permissions → Choose your account → Advanced → Go to Freedom Cafe Backend (unsafe) → Allow**
6. **Copy the Web app URL** — it looks like: `https://script.google.com/macros/s/XXXXXX/exec`
7. **Save this URL** — you need it next!

---

## STEP 5: Connect Your Website (2 minutes)

Open your website code (`freedom-cafe-v3.jsx`) and find the CONFIG section at the very top:

```javascript
const CONFIG = {
  GOOGLE_SCRIPT_URL: "", // ← Paste your URL here
  IMGBB_API_KEY: "",     // ← Paste your API key here
};
```

Replace with your actual values:

```javascript
const CONFIG = {
  GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
  IMGBB_API_KEY: "your_imgbb_api_key_here",
};
```

Save the file. Done!

---

## STEP 6: Deploy Your Website (Optional)

To put your website live on the internet:

### Option A: Vercel (Easiest, Free)
1. Go to **https://vercel.com** and sign up with GitHub
2. Create a new project and upload your code
3. Vercel auto-detects React and deploys it
4. You get a free URL like `freedom-cafe.vercel.app`

### Option B: Netlify (Also Free)
1. Go to **https://netlify.com** and sign up
2. Drag and drop your build folder
3. Get a free URL like `freedom-cafe.netlify.app`

### Option C: GitHub Pages (Free)
1. Push code to GitHub
2. Enable Pages in repo settings
3. Free URL: `username.github.io/freedom-cafe`

---

## How It All Works

```
┌─────────────────────┐
│   Your Website      │ ← Visitors see this
│   (React App)       │
└────────┬────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│ Google │ │ ImgBB  │
│ Sheets │ │ (Free) │
│ (Free) │ │        │
│        │ │ Stores │
│ Stores │ │ images │
│ all    │ │ from   │
│ data:  │ │ gallery│
│-reviews│ │ admin  │
│-menu   │ │ upload │
│-config │ │        │
│-auth   │ │        │
│-feedbk │ │        │
└────────┘ └────────┘
```

### What gets stored where:

**Google Sheets** (your "database"):
- Site content (hero text, about, contact info)
- Menu items and prices
- Gallery image URLs
- Customer reviews
- Customer feedback
- Admin login credentials

**ImgBB** (image hosting):
- Gallery photos uploaded via admin panel
- Returns permanent URLs stored in Google Sheets

---

## For the Founder — Daily Usage

### To update your website:
1. Open your website
2. Click **⚙ Admin** (in nav bar or hamburger menu)
3. Log in with your username/password
4. Edit any section → Click **💾 Save**
5. Changes appear instantly!

### To upload gallery photos:
1. Go to Admin → Gallery tab
2. Click **📤 Upload Image** on any gallery item
3. Select a photo from your phone/computer
4. It uploads to ImgBB and appears on the site

### To check reviews and feedback:
1. Admin → Reviews tab: See, edit, or remove customer reviews
2. Admin → Feedback tab: Read customer suggestions and complaints

### To update menu prices:
1. Admin → Menu tab
2. Edit any item's name, description, or price
3. Add new items with **+ Item** button
4. Add new categories with **+ Category** button

### Emergency: Lost your password?
1. Open your Google Sheet directly
2. Find the row with key `fc3-auth`
3. The value column has your credentials in JSON format
4. You can edit it directly in the sheet

---

## Free Tier Limits (More Than Enough)

| Service | Free Limit | Your Likely Usage |
|---------|-----------|-------------------|
| Google Sheets | Unlimited rows, 10M cells | ~50 rows max |
| Google Apps Script | 20,000 calls/day | ~100-500/day |
| ImgBB | Unlimited uploads | ~50-100 photos |

You won't hit these limits unless you get 10,000+ visitors daily — and by then, you'll want to upgrade anyway!

---

## Troubleshooting

**"Script authorization failed"**
→ Make sure you clicked "Advanced → Go to... (unsafe) → Allow"

**"CORS error in console"**
→ Make sure "Who has access" is set to "Anyone" in deployment

**"Images not uploading"**
→ Check that your ImgBB API key is correct and has no extra spaces

**"Changes not saving"**
→ Check your Google Apps Script URL is correct
→ Make sure the Google Sheet has a tab named "data"

**"Admin login not working after redeployment"**
→ After updating the Apps Script, you must create a NEW deployment
→ Go to Deploy → Manage Deployments → Create new version
