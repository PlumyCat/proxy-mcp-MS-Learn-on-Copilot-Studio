# Use Node.js LTS slim to reduce image size
FROM node:22-slim

# Update system packages to address vulnerabilities
RUN apt-get update && apt-get upgrade -y && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code
COPY . .

# Create a non-root user for security
RUN groupadd -r nodeuser && useradd -r -g nodeuser nodeuser
RUN chown -R nodeuser:nodeuser /app
USER nodeuser

# Expose port
EXPOSE 3000

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Startup command
CMD ["node", "server.js"]