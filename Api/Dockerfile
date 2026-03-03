FROM node:22-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto configurado
EXPOSE 3010

CMD ["npm", "run", "dev"]