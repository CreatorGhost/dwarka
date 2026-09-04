FROM node:22.22.0-slim

ENV NODE_ENV=production
WORKDIR /workspace/game/server

COPY game/server/package.json game/server/package-lock.json ./
RUN npm ci --include=dev --omit=optional && npm cache clean --force

COPY game/server/tsconfig.json ./
COPY game/server/src ./src
# The server imports these from outside its own directory:
#   src/chapter-1/phases.ts, simulation.ts -> ../../../config/chapter-1.json
#   src/chapter-1/collision.ts             -> ../../../client-scripts/world-layout.json
COPY game/config /workspace/game/config
COPY game/client-scripts/world-layout.json /workspace/game/client-scripts/world-layout.json

USER node
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||10000)+'/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["npm", "start"]
