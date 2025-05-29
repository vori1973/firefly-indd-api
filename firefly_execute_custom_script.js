const fs = require('fs-extra');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');
dotenv.config();

const {
  getPresignedUrl,
  generateAssetEntriesFromS3Prefix
} = require('./utils/aws_utils');

const {
  getAccessToken,
  pollJobStatus
} = require('./utils/firefly_utils');

const {
  FIREFLY_SERVICES_CLIENT_ID,
  ADOBE_IMS_ORG_ID,
} = process.env;

async function executeCustomScript({ scriptUrl, inddKey, fontPrefix, linksPrefix,labels, outputPath, jobFolder }) {
  const accessToken = await getAccessToken();
  const url = scriptUrl;

  const inddUrl = await getPresignedUrl(inddKey);

  const inddAsset = {
    source: { url: inddUrl },
    destination: path.basename(inddKey)
  };


  const fontAssets = await generateAssetEntriesFromS3Prefix(fontPrefix, ['ttf', 'otf', 'lst'], 'Document Fonts');
  const linksAssets = await generateAssetEntriesFromS3Prefix(linksPrefix, ['jpg', 'jpeg', 'png', 'psd', 'tif', 'ai'], 'Links');

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'x-api-key': FIREFLY_SERVICES_CLIENT_ID,
    'x-gw-ims-org-id': ADOBE_IMS_ORG_ID,
    'Content-Type': 'application/json'
  };

  const body = {
    assets: [inddAsset, ...fontAssets, ...linksAssets],
    params: {
      targetDocument: inddAsset.destination,
      outputPath,
      labels, 
      hyphenate: true
    }
  };

  const requestPath = path.join(jobFolder, 'request.json');
  await fs.writeJson(requestPath, { headers: { ...headers, Authorization: '[REDACTED]' }, body }, { spaces: 2 });
  console.log(`📄 Request written to: ${requestPath}`);

  const { data } = await axios.post(url, body, { headers });

  if (data.statusUrl) {
    await pollJobStatus(data.statusUrl, accessToken, jobFolder);
  }

  return data;
}

(async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jobFolder = path.join(__dirname, 'output', `execute-script-${timestamp}`);
    await fs.ensureDir(jobFolder);

    const SCRIPT_URL = process.argv[2];
    if (!SCRIPT_URL) throw new Error('Please provide SCRIPT_URL as first argument');

    const inddKey = 'Hyphenation/hyphenation.indd';
    const fontPrefix = 'Hyphenation/Document fonts/';
    const linksPrefix = 'Hyphenation/Links/';
    const outputPath = 'output.indd';
    const labels =  ["MainPara", "Heading"];

    const result = await executeCustomScript({
      scriptUrl: SCRIPT_URL,
      inddKey,
      fontPrefix,
      linksPrefix,
      labels,
      outputPath,
      jobFolder
    });

    const responsePath = path.join(jobFolder, 'response.json');
    await fs.writeJson(responsePath, result, { spaces: 2 });
    console.log(`✅ Script executed successfully. Response saved to: ${responsePath}`);
  } catch (err) {
    console.error('❌ Error executing script:', err.response?.data || err.message);
  }
})();