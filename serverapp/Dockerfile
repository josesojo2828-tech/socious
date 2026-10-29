FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN npm install -g @nestjs/cli

RUN mkdir -p /app/dist/i18n && chown -R node:node /app

USER node

COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma/

RUN npm install

COPY --chown=node:node . .

RUN npx prisma generate

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

CMD ["npm", "run", "dev"]

# ###################
# # ETAPA 1: BUILD
# ###################
# FROM node:20-alpine As builder

# WORKDIR /usr/src/app

# COPY package*.json ./

# COPY prisma ./prisma/
# COPY views ./views/
# COPY public ./public/
# COPY src/i18n ./src/i18n

# RUN npm install
# RUN npm install -g @nestjs/cli
# RUN npx prisma generate

# COPY . .

# RUN npm run build

# ###################
# # ETAPA 2: PRODUCTION
# ###################
# FROM node:20-alpine As production

# WORKDIR /usr/src/app

# COPY package*.json ./

# RUN npm install --only=production
# RUN npm install -g @nestjs/cli

# COPY prisma ./prisma/
# RUN npx prisma generate

# COPY --from=builder /usr/src/app/dist ./dist
# COPY --from=builder /usr/src/app/views ./views
# COPY --from=builder /usr/src/app/public ./public
# COPY --from=builder /usr/src/app/src/i18n ./src/i18n

# COPY docker-entrypoint.sh /usr/local/bin/
# RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# ENTRYPOINT ["docker-entrypoint.sh"]