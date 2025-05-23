# 🔥 Adobe Firefly InDesign Automation

This Node.js project automates the submission and polling of custom InDesign scripts via the Adobe Firefly API. It also generates signed S3 URLs for assets and organizes job outputs by timestamp.

---

## 📁 Project Structure

```
.
├── firefly_execute_custom_script.js     # Main job runner script
├── firefly_poll_job_status.js           # Standalone polling script for status URLs
├── firefly_submit_indesign_script.js    # Upload a custom InDesign script ZIP to Firefly
├── utils
│   ├── aws_utils.js                     # S3 presigned URL + asset generator utilities
│   └── firefly_utils.js                 # Firefly access token and job polling logic
├── output/                              # Auto-generated folder for job logs and results
├── resources/                           # Input assets: INDD files, fonts, images, data
└── .env                                 # Environment variables (not committed)
```

---

## 🛠️ Setup

### 1. Clone the repo

```bash
git clone https://github.com/your-org/firefly-indd-api.git
cd firefly-indd-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create a `.env` file with the following variables:

```env
FIREFLY_SERVICES_CLIENT_ID=your_client_id
FIREFLY_SERVICES_CLIENT_SECRET=your_client_secret
ADOBE_IMS_ORG_ID=your_ims_org_id

AWS_REGION=us-east-1
aws_access_key_id=your_key
aws_secret_access_key=your_secret
aws_session_token=your_token_if_needed

S3_BUCKET_NAME=your-bucket-name
S3_URL_EXPIRES_SECONDS=3600
```

---

## 🚀 Usage

### Run a Firefly InDesign Job

```bash
node firefly_execute_custom_script.js <SCRIPT_ID>
```

- Uploads INDD, data, fonts, and images from S3 (via presigned URLs)
- Submits job to Adobe Firefly
- Polls until job completion
- Saves request and response to the `output/` folder

---

### Poll Job Status

```bash
node firefly_poll_job_status.js <statusUrl>
```

Use this to monitor a job if you already have a status URL.

---

### Submit Script ZIP

```bash
node firefly_submit_indesign_script.js ./resources/my-script.zip
```

This will upload your script package to the Adobe Firefly server.

---

## ✅ Example Output

```
output/execute-script-YYYY-MM-DDTHH-MM-SSZ/
├── request.json
├── response.json
└── job-status.json
```

---

## 📄 License

MIT © Adobe 
