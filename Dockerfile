FROM node:20-alpine

# curl para healthcheck no EasyPanel/Docker
RUN apk add --no-cache curl

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
