FROM nginx:alpine

# Build arguments for configuration
ARG REBUILDERD_URL=http://localhost:8080
ARG REBUILDERD_AUTH_TOKEN=""

# Install Node.js and yarn for build process
RUN apk add --no-cache nodejs npm yarn

# Copy source files
WORKDIR /app
COPY package*.json ./
COPY yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy all source files
COPY . .

# Set environment variables for build
ENV REBUILDERD_URL=${REBUILDERD_URL}
ENV REBUILDERD_AUTH_TOKEN=${REBUILDERD_AUTH_TOKEN}

# Build the application (universal build for all distributions)
RUN yarn run build:prod

# Copy built files to nginx directory
RUN cp -r public/* /usr/share/nginx/html/

# Create nginx configuration with environment substitution
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]