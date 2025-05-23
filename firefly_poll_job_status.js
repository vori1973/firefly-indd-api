const dotenv = require('dotenv');
dotenv.config();

const { getAccessToken, pollJobStatus } = require('./utils/firefly_utils');
const path = require('path');
const fs = require('fs-extra');

(async () => {
  const statusUrl = process.argv[2]; // input should be the full status URL
  if (!statusUrl) {
    console.error('Usage: node firefly_poll_job_status.js <statusUrl>');
    process.exit(1);
  }

  try {
    const jobFolder = path.join(__dirname, 'output', `poll-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    await fs.ensureDir(jobFolder);

    const token = await getAccessToken();
    await pollJobStatus(statusUrl, token, jobFolder);
  } catch (err) {
    console.error('❌ Error polling job status:', err.response?.data || err.message);
  }
})();