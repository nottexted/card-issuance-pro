FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install && chmod -R u+x node_modules/.bin
COPY . .
EXPOSE 5175
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5175"]
