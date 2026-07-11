FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci

COPY . .

ARG DATABASE_URL=postgresql://postgres:postgres@postgres:5432/kibtask?schema=public
ENV DATABASE_URL=$DATABASE_URL

RUN npm exec prisma generate
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm exec prisma migrate deploy && node dist/src/main.js"]