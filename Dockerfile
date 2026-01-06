# syntax=docker/dockerfile:1
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies like @angular/cli)
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build the Angular app
RUN npm run build -- --configuration production

# Production stage
FROM nginx:1.27-alpine AS runtime
ENV NODE_ENV=production

# Copy built files from build stage
COPY --from=build /app/dist/account_receivable/browser /usr/share/nginx/html

# Optional: Copy custom nginx config if you have one
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]