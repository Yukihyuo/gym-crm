FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Exponer el puerto de Vite (5173 por defecto)
EXPOSE 5176

# Importante: --host para que Docker pueda recibir peticiones
CMD ["npm", "run", "dev", "--", "--host"]