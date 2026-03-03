FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Exponer el puerto de Vite (5173 por defecto)
EXPOSE 5177

# Importante: --host para que Docker pueda recibir peticiones
CMD ["npm", "run", "dev", "--", "--host"]