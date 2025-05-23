const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const FormData = require('form-data');
const dotenv = require('dotenv');

dotenv.config();

const {
  FIREFLY_SERVICES_CLIENT_ID,
  FIREFLY_SERVICES_CLIENT_SECRET,
  ADOBE_IMS_ORG_ID
} = process.env;

const { getAccessToken } = require('./utils/firefly_utils');


async function submitCustomScriptZip(zipFilePath) {
  const accessToken = await getAccessToken();
  const url = 'https://indesign.adobe.io/v3/scripts';

  const form = new FormData();
  form.append('file', fs.createReadStream(zipFilePath));

  const headers = {
    ...form.getHeaders(),
    Authorization: `Bearer ${accessToken}`,
    'x-api-key': FIREFLY_SERVICES_CLIENT_ID,
    'x-gw-ims-org-id': ADOBE_IMS_ORG_ID
  };

  const { data } = await axios.post(url, form, { headers });
  return data;
}

(async () => {
  try {
    const zipFilePath = process.argv[2];
    if (!zipFilePath) {
      throw new Error('Please provide a path to the .zip file. Usage: node submit_indesign_script.js ./script_package.zip');
    }

    const result = await submitCustomScriptZip(zipFilePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(__dirname, 'output');
    await fs.ensureDir(outputDir);

    const outputPath = path.join(outputDir, `submitted_script_response_${timestamp}.json`);
    await fs.writeJson(outputPath, result, { spaces: 2 });

    console.log(`✅ Script ZIP submitted successfully. Response saved to ${outputPath}`);
  } catch (err) {
    console.error('❌ Error submitting script ZIP:', err.response?.data || err.message);
  }
})();
