# Stage 1: Build the application
FROM node:20-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy application into container
COPY . /app

# Install dependencies
RUN npm install

# Set npm to ignore scripts
ENV npm_config_ignore_scripts=true

# Run build manually ignoring scripts
WORKDIR /app/packages/svgcanvas
RUN npx rollup -c
WORKDIR /app
RUN npx rollup -c
