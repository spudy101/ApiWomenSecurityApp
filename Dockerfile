# Etapa 1: Construcción de la aplicación
FROM node:18-slim AS builder

# Establecer el directorio de trabajo en el contenedor
WORKDIR /app

# Copiar los archivos de dependencias (package.json y package-lock.json)
COPY package*.json ./

# Instalar las dependencias de Node.js
RUN npm install

# Copiar el resto del código de la aplicación al directorio de trabajo
COPY . .

# Etapa 2: Imagen final para producción
FROM node:18-slim

# Establecer el directorio de trabajo en la carpeta raíz, donde está index.js
WORKDIR /app

# Copiar las dependencias instaladas desde la etapa de builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar el código fuente desde el builder
COPY --from=builder /app ./

# Comando por defecto para iniciar la aplicación
CMD ["node", "index.js"]
