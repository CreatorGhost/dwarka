FROM node:22.22.0-slim

ENV NODE_ENV=production
WORKDIR /workspace/game/server

COPY game/server/package.json game/server/package-lock.json ./
RUN npm ci --include=dev --omit=optional && npm cache clean --force

COPY game/server/tsconfig.json ./
COPY game/server/src ./src
COPY site/public/playcanvas/chapter-1/world-layout.json /workspace/site/public/playcanvas/chapter-1/world-layout.json

USER node
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||10000)+'/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["npm", "start"]
