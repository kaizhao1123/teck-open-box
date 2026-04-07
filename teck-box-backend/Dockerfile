# Use Node 20 as the base
FROM node:20-slim

# 1. Install build tools needed for hnswlib-node (C++, Python, Make)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 2. Set working directory
WORKDIR /usr/src/app

# 3. Copy package files
COPY package*.json ./

# 4. Install with the flags we discussed
RUN npm install --omit=dev --legacy-peer-deps

# 5. Copy the rest of your code
COPY . .

# 6. Expose the port and start
EXPOSE 8080
CMD [ "node", "index.js" ]