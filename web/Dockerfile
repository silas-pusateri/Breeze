FROM node:18-alpine as builder

# Set Node options for increased memory
ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with clean npm cache and only production dependencies
RUN npm cache clean --force && \
    npm ci --only=production --no-optional && \
    npm cache clean --force

# Copy source files
COPY . .

# Build the application with production optimization
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy the built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add nginx configuration for SPA routing
RUN echo 'location / { \n\
    try_files $uri $uri/ /index.html; \n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 