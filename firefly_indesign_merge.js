  const axios = require('axios');
  const dotenv = require('dotenv');
  const fs = require('fs-extra');
  const path = require('path');
  
  dotenv.config();
  
  const {
    FIREFLY_SERVICES_CLIENT_ID,
  } = process.env;
  const { getPresignedUrl, generateAssetEntriesFromS3Prefix } = require('./utils/aws_utils');
 const { getAccessToken, pollJobStatus } = require('./utils/firefly_utils');

  
  async function callInDesignMergeAPI({ inddUrl, dataFileUrl, fontFolder, outputUrl, accessToken, jobFolder }) {
    const endpoint = 'https://indesign.adobe.io/v3/merge-data';
  
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'x-api-key': FIREFLY_SERVICES_CLIENT_ID,
      'Content-Type': 'application/json',
    };
    const fontAssets = await generateAssetEntriesFromS3Prefix(
      fontFolder,
      ['ttf', 'otf', 'lst'],
      'Document fonts'
    );
    
    const imageAssets = await generateAssetEntriesFromS3Prefix(
      'SampleMerge/Images/',
      ['jpg', 'jpeg', 'png','svg','ai'],
      'Images'
    );
    
      const linksAssets = await generateAssetEntriesFromS3Prefix(
      'SampleMerge/Links/',
      ['jpg', 'jpeg', 'png','svg','ai'],
      'Links'
    );
    const assets = [
      { source: { url: inddUrl , storageType:"Aws"}, destination: 'template.indd' },
      { source: { url: dataFileUrl }, destination: 'data.csv' },
      ...fontAssets,
      ...linksAssets,
      ...imageAssets
    ];

    const body = {
      assets,
      params: {
        generalSettings: {
            "fonts": {
                "fontsDirectories": []
            },
            "adobeFonts": {
                    "includeDocuments": []
                }
        },
        targetDocument: "template.indd",
        dataSource: "data.csv",
        outputMediaType: "application/pdf",
        outputFileBaseString: "result",
        outputFolderPath: "MyOutput/",
       // pagesPerDocument:1,
       // recordRange:"2",
      // pagesPerDocument:1,
        exportSettings: {
          pdfPreset: "High Quality Print"
        },
        allowMultipleRecordsPerPage: false
      },
      /* 
      //In the absence of outputs, the outputs assets are stored in a temporary repository, 
      // and a pre-signed URL will be shared for those assets, which will be valid for 24hrs.
      outputs: [
        {
          source: "MyOutput\\range1\\result.pdf",
          destination: {
            url: outputUrl
          }
        }
      ]*/
    };
  
    const requestPath = path.join(jobFolder, 'request.json');
    await fs.writeJson(requestPath, { headers: { ...headers, Authorization: '[REDACTED]' }, body }, { spaces: 2 });
    console.log(`📄 Request written to: ${requestPath}`);
  
    const { data } = await axios.post(endpoint, body, { headers });
    return data;
  }
  
  (async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const jobFolder = path.join(__dirname, 'output', `indesign-merge-${timestamp}`);
      await fs.ensureDir(jobFolder);
  
      const inddKey = 'SampleMerge/SampleMerge.indd';
      const dataFileKey = 'SampleMerge/data.csv';
      const outputKey = `output/result-${timestamp}.pdf`;
      const fontFolder = 'SampleMerge/Document fonts/';
  
      const [inddUrl, dataFileUrl, outputUrl] = await Promise.all([
        getPresignedUrl(inddKey),
        getPresignedUrl(dataFileKey),
        getPresignedUrl(outputKey, 'putObject', 'application/pdf'),
      ]);
  
      const token = await getAccessToken();
  
      const result = await callInDesignMergeAPI({
        inddUrl,
        dataFileUrl,
        fontFolder,
        outputUrl,
        accessToken: token,
        jobFolder,
      });
  
      const responsePath = path.join(jobFolder, 'response.json');
      await fs.writeJson(responsePath, result, { spaces: 2 });
      console.log(`✅ Merge job submitted. Response saved to: ${responsePath}`);
  
      if (result.statusUrl) {
        await pollJobStatus(result.statusUrl, token, jobFolder);
      }
    } catch (err) {
      const error = err.response?.data || err.message;
      console.error('❌ Error:', error);
    }
  })();