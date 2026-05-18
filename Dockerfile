# Use the official Node.js image with tag 18-alpine
FROM node:18-alpine

# Install Python, make, and other required dependencies
RUN apk add --update --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    libgcc \
    libstdc++

# Create the app directory
RUN mkdir -p /home/app

# Set the working directory to /home/app
WORKDIR /home/app

# Copy the current directory contents into the container at /home/app
COPY . /home/app

# Install global Node.js packages
RUN npm install -g typescript pnpm turbo prisma

# Install app dependencies using pnpm
RUN pnpm install

# Build the app
RUN pnpm build

# Expose the ports
EXPOSE 3000
EXPOSE 3001
EXPOSE 4000

# Start your Node.js application
CMD ["pnpm", "start"]
