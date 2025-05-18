require('dotenv').config();
const { Readable } = require('stream');
const { SQSClient } = require('@aws-sdk/client-sqs');
const { S3Client, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

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
const uploadToS3 = async (fileBuffer, documentId, title) => {
    const params = {
        Bucket: process.env.RAW_DATA_BUCKET,
        Key: `${documentId}/${title}.pdf`,
        Body: fileBuffer,
        ContentType: 'application/pdf',
    };
    return s3.send(new PutObjectCommand(params));
};

/**
 * Delete a file from S3
 * @param {string} s3Key - The key of the file to be deleted
 * @returns {Promise<void>}
 */
const deleteFromS3 = async (s3Key) => {
    const params = {
        Bucket: process.env.RAW_DATA_BUCKET,
        Key: s3Key,
    };

    try {
        const command = new DeleteObjectCommand(params);
        await s3.send(command);
        console.log(`File deleted from S3: ${s3Key}`);
    } catch (err) {
        console.error(`Error deleting from S3: ${err.message}`);
        throw new Error("Failed to delete file from S3");
    }
};

/**
 * Download a file from S3 as a stream
 * @param {string} s3Key - The key of the file to be downloaded
 * @returns {ReadableStream} - S3 object read stream
 */
const downloadFromS3 = async (s3Key) => {
    const params = {
        Bucket: process.env.RAW_DATA_BUCKET,
        Key: s3Key,
    };

    try {
        const command = new GetObjectCommand(params);
        let s3Stream = await s3.send(command);
        console.log(`File streamed from S3: ${s3Key}`);
        return s3Stream.Body;
    } catch (err) {
        console.error(`Error downloading from S3: ${err.message}`);
        throw new Error("Failed to download file from S3");
    }
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

module.exports = { sendToSQS, uploadToS3, deleteFromS3, downloadFromS3 };
