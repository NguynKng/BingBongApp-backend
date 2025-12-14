# Backend Dockerfile
FROM node:20-alpine

# Install build dependencies for native modules (bcrypt, canvas)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pkgconfig \
    libc-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (without --production to ensure all build deps are available)
RUN npm install

# Remove dev dependencies after build
RUN npm prune --production

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
