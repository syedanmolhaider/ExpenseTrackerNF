# Use active Node 20 LTS on Debian Bookworm (fixes Debian 11 Bullseye EOL 404s)
FROM node:20-bookworm-slim

# Install system utilities and official Google Chrome
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    procps \
    fonts-liberation \
    fonts-freefont-ttf \
    && wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get install -y --no-install-recommends ./google-chrome-stable_current_amd64.deb \
    && rm -f google-chrome-stable_current_amd64.deb \
    && rm -rf /var/lib/apt/lists/*

# Point Puppeteer to the installed Google Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    NODE_ENV=production

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application files
COPY . .

# Expose Render default port and local bridge port
EXPOSE 10000 3001

# Start WhatsApp Bot
CMD ["node", "whatsapp-bot.js"]
