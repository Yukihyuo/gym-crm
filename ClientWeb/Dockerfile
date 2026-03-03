FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .


EXPOSE 5177

# Importante: --host para que Docker pueda recibir peticiones
CMD ["npm", "run", "dev", "--", "--host"]