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

# JWT Configuration
JWT_SECRET="<random-alphanumeric-long-text>"
BCRYPT_SALT_ROUNDS="10"
JWT_EXPIRATION="1h"

# OpenAI Configuration
OPENAI_API_KEY="<your info>"
OPENAI_MAX_RETRIES="3"
OPENAI_BACKOFF_FACTOR="3"
EMBEDDING_MODEL="text-embedding-3-small"
LLM_MODEL="gpt-4o-mini"

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

## ✅ Query and response from RAG:
curl --location 'http://localhost:3000/api/rag/query' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer XXXXXXXXXXXXX' \
--data '{
    "query": "What is Operating Expenses DeltaCore Solutions.?",
    "documentsIds": ["1b3f398e-edd3-4dc5-8244-a6ed8c0303fb"]
}'

## ✅ Expected Response:
{
    "query": "What is Operating Expenses DeltaCore Solutions.?",
    "answer": "The Operating Expenses for DeltaCore Solutions in 2024 are $10,500,000.",
    "documentsIds": [
        "1b3f398e-edd3-4dc5-8244-a6ed8c0303fb"
    ],
    "matchedChunks": [
        {
            "content": "\n\nCompany Name: DeltaCore Solutions \nIndustry: Software Development and Consulting \nBusiness Description: \nDeltaCore Solutions is a software development and consulting firm specializing in custom ERP \nsystems and CRM integrations for mid-sized businesses. Despite an increase in operational costs and \nproject cancellations, the company maintained steady revenue but ended 2024 with a significant net \nloss. \n \nFinancial Overview (2024): \n• Revenue: $22,000,000 \n• Gross Profit: $8,800,000 \n• Net Loss: -$3,600,000 \n• Operating Expenses: $10,500,000 \n• Cost of Goods Sold (COGS): $13,200,000 \n \nAssets: \n• Cash: $2,000,000 \n• Accounts Receivable: $1,600,000 \n• Property and Equipment: $5",
            "document_id": "1b3f398e-edd3-4dc5-8244-a6ed8c0303fb",
            "chunk_index": 0
        }
    ]
}