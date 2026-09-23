# Etapa 1: Build de Angular
FROM node:22-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias e instalarlas
COPY package*.json ./
RUN npm ci

# Copiar el resto del código fuente y compilar para producción
COPY . .
RUN npm run build -- --configuration=production

# Etapa 2: Servidor Nginx para servir los archivos estáticos
FROM nginx:alpine
# Copiar los archivos compilados a la carpeta pública de Nginx
COPY --from=build /app/dist/iscgb-frontend/browser /usr/share/nginx/html

# Exponer el puerto estándar de Nginx
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]