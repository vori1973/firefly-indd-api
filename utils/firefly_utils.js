// firefly_utils.js
const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');
const dotenv = require('dotenv');
dotenv.config();

const {
  FIREFLY_SERVICES_CLIENT_ID,
  FIREFLY_SERVICES_CLIENT_SECRET,
  ADOBE_IMS_ORG_ID
} = process.env;

async function getAccessToken() {
  const authUrl = 'https://ims-na1.adobelogin.com/ims/token/v3';
  const params = new URLSearchParams();
  params.append('client_id', FIREFLY_SERVICES_CLIENT_ID);
  params.append('client_secret', FIREFLY_SERVICES_CLIENT_SECRET);
  params.append('grant_type', 'client_credentials');
  params.append('scope', 'openid,AdobeID,firefly_api,ff_apis');

  const { data } = await axios.post(authUrl, params);
  return data.access_token;
}

async function pollJobStatus(statusUrl, accessToken, jobFolder, interval = 10000, maxAttempts = 40) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'x-api-key': FIREFLY_SERVICES_CLIENT_ID,
    'x-gw-ims-org-id': ADOBE_IMS_ORG_ID,
  };

  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await axios.get(statusUrl, { headers });
    const status = data.status || data.jobStatus;

    console.log(`⏳ Poll #${i + 1} — Job status: ${status}`);
    console.log(JSON.stringify(data, null, 2));

    if (status === 'succeeded' || status === 'failed') {
      const statusPath = path.join(jobFolder, 'job-status.json');
      await fs.writeJson(statusPath, data, { spaces: 2 });
      console.log(`📄 Final job status saved to: ${statusPath}`);

      if (status === 'failed') {
        throw new Error('❌ Job failed.');
      }

      return data;
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('❌ Job polling timed out.');
}

module.exports = {
  getAccessToken,
  pollJobStatus
};