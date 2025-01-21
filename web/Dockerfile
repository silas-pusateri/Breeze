FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --no-optional || exit 1

COPY . .

ENV BROWSER=none

EXPOSE 3000
CMD ["sh", "-c", "npm run dev -- --host 0.0.0.0 --port 3000"] 