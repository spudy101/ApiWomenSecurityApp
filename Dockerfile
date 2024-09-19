# Etapa 1: Construcción de la aplicación
FROM node:18-slim AS builder

# Establecer el directorio de trabajo en el contenedor
WORKDIR /app

# Copiar los archivos de dependencias (package.json y package-lock.json)
COPY package*.json ./

# Instalar las dependencias de Node.js
RUN npm install

# Copiar todo el código de la aplicación
COPY . .

# Etapa 2: Imagen final para producción
FROM node:18-slim

# Establecer el directorio de trabajo en la carpeta src
WORKDIR /app/src

# Copiar las dependencias instaladas desde la etapa de builder
COPY --from=builder /app/node_modules /app/node_modules

# Copiar el código fuente desde el builder a la carpeta src
COPY --from=builder /app/src /app/src

# Exponer el puerto 8080 para que Cloud Run pueda acceder
EXPOSE 3000

# Comando por defecto para iniciar la aplicación
CMD ["node", "index.js"]
