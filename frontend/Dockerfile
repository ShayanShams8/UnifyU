FROM node:20-alpine

WORKDIR /app

RUN npm install -g expo-cli --legacy-peer-deps

COPY package.json .
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 8081 19000 19001 19002

ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0

CMD ["npx", "expo", "start", "--web", "--port", "8081", "--host", "lan"]
