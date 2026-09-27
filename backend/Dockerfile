FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN node ace build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3333
COPY --from=build /app/build ./
RUN npm ci --omit=dev
EXPOSE 3333
CMD ["sh", "-c", "node ace migration:run --force && node bin/server.js"]
