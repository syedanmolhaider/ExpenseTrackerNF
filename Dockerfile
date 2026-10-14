FROM node:20-bookworm-slim

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 10000 3001

CMD ["node", "--max-old-space-size=256", "whatsapp-bot.js"]
