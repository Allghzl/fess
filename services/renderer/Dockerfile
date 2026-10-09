FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
# Download Poppins fonts
RUN apk add --no-cache wget \
  && mkdir -p fonts \
  && wget -q "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Regular.ttf" -O fonts/Poppins-Regular.ttf \
  && wget -q "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf" -O fonts/Poppins-Bold.ttf
COPY src/ ./src/
EXPOSE 8766
CMD ["node", "src/server.js"]
