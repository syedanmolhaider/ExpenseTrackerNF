# Base image with Node 18 on Debian Bullseye
FROM node:18-bullseye-slim

# Install system dependencies and Chromium for WhatsApp-Web Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    fonts-noto-color-emoji \
    ca-certificates \
    wget \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source code
COPY . .

# Expose Render default port and bridge port
EXPOSE 10000 3001

# Start WhatsApp Bot
CMD ["node", "whatsapp-bot.js"]
