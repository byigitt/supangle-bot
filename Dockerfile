# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Install pnpm globally
RUN npm install -g pnpm@10.11.0

# Set the working directory in the container
WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package*.json pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Create a non-root user to run the application
RUN addgroup -g 1001 -S nodejs
RUN adduser -S botuser -u 1001

# Change ownership of the app directory to the botuser
RUN chown -R botuser:nodejs /app
USER botuser

# Expose the port (if your bot serves any web interface, otherwise this can be omitted)
# EXPOSE 3000

# Command to run the application
CMD ["pnpm", "start"]