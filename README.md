# Document Ingestion Service

A Node.js-based service that handles document uploads, stores them in S3, logs metadata in PostgreSQL, and triggers processing via SQS.

---

## ✅ Features

- Upload documents and store them in S3
- Insert document metadata into PostgreSQL
- Send processing requests to SQS
- Modular and scalable architecture
- Configurable via `.env` file

---

## ✅ Tech Stack

- Node.js (v22)
- Express.js
- AWS SDK (S3, SQS)
- PostgreSQL
- Multer (File Upload)
- UUID (Unique IDs)
- Docker

---

## ✅ Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- AWS S3 bucket and SQS queue
- PostgreSQL database

---

## ✅ Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
RAW_DATA_BUCKET=your-raw-data-bucket
DOC_PROCESSING_QUEUE_URL=rag-documents-process-dev

# PostgreSQL Configuration
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=db
DB_PORT=5432
DB_NAME=documentdb

## ✅  Create the database
CREATE DATABASE documentdb;

USE documentdb;

CREATE TABLE rag-users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- Hashed Password
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
  id UUID PRIMARY KEY,
  s3_path TEXT NOT NULL,
  title TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

## ✅ AWS S3 and SQS Setup
aws s3api create-bucket --bucket your-raw-data-bucket --region us-east-1
aws sqs create-queue --queue-name rag-documents-process-dev

## ✅ Build and run container
docker build -t document-ingestion-app .
docker run -d \
  --name document-ingestion-service \
  --env-file .env \
  -p 3000:3000 \
  document-ingestion-app

## ✅ Test the Upload Endpoint:
curl -X POST http://localhost:3000/api/ingestion/upload \
  -F "file=@/path/to/sample.pdf" \
  -F "title=Sample Document" \
  -F "uploadedBy=test-user"


## ✅ Expected Response:
{
  "message": "Document uploaded and processing started",
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "sqsMessageId": "abcdef12-3456-7890-abcd-ef1234567890"
}
