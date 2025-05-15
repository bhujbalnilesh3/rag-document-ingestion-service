require('dotenv').config();
const { SQSClient } = require('@aws-sdk/client-sqs');
const { S3Client } = require('@aws-sdk/client-s3');

const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { SendMessageCommand } = require('@aws-sdk/client-sqs');

const sqs = new SQSClient({ region: process.env.AWS_REGION });
const s3 = new S3Client({ region: process.env.AWS_REGION });

/**
 * Utility function to upload file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} s3Key - S3 object key
 * @returns {Promise}
 */
const uploadToS3 = async (fileBuffer, s3Key) => {
    const params = {
        Bucket: process.env.RAW_DATA_BUCKET,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: 'application/pdf',
    };
    return s3.send(new PutObjectCommand(params));
};

/**
 * Utility function to send SQS message
 * @param {Object} message - The SQS message payload
 * @returns {Promise}
 */
const sendToSQS = async (message) => {
    const params = {
        QueueUrl: `https://sqs.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_ACCOUNT_ID}/${process.env.DOC_PROCESSING_QUEUE_URL}`,
        MessageBody: JSON.stringify(message),
    };
    return sqs.send(new SendMessageCommand(params));
};

module.exports = { sendToSQS, uploadToS3 };
