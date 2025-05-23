// aws_utils.js
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const {
  AWS_REGION,
  aws_access_key_id,
  aws_secret_access_key,
  aws_session_token,
  S3_BUCKET_NAME
} = process.env;

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: aws_access_key_id,
    secretAccessKey: aws_secret_access_key,
    sessionToken: aws_session_token
  }
});

const EXPIRATION_SECONDS = parseInt(process.env.S3_URL_EXPIRES_SECONDS || '3600', 10);

async function getPresignedUrl(key, operation = 'getObject', contentType = 'application/octet-stream') {
  const command = operation === 'putObject'
    ? new PutObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key, ContentType: contentType })
    : new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key });

  return await getSignedUrl(s3, command, { expiresIn: EXPIRATION_SECONDS });
}

async function generateAssetEntriesFromS3Prefix(prefix, extensions = [], destinationFolder = null) {
  const assets = [];
  const listCommand = new ListObjectsV2Command({ Bucket: S3_BUCKET_NAME, Prefix: prefix });
  const { Contents } = await s3.send(listCommand);

  for (const item of Contents || []) {
    const key = item.Key;
    const ext = path.extname(key).toLowerCase().slice(1);
    if (!extensions.includes(ext)) continue;

    const url = await getPresignedUrl(key);
    const destination = destinationFolder
      ? path.posix.join(destinationFolder, path.basename(key))
      : key;

    assets.push({
      source: { url },
      destination
    });
  }

  return assets;
}

module.exports = {
  getPresignedUrl,
  generateAssetEntriesFromS3Prefix
};