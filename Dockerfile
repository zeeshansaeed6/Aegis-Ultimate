# Aegis Ultimate - Headless Web Deployment
FROM node:20-alpine

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies only (skip electron devDependency)
RUN npm ci --omit=dev

# Copy application files
COPY . .

# Expose standard port
ENV PORT=3000
EXPOSE 3000

# Start Aegis Privacy Search & Proxy Engine
CMD ["node", "server/server.js"]
