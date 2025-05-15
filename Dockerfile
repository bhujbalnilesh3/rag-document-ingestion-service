# Base Image
FROM node:22-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy application code
COPY src ./src

# Copy .env file (if needed)
# Ensure not to copy .env in production
COPY .env ./

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
