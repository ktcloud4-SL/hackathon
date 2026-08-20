FROM nginx:alpine

# Copy custom frontend nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static frontend assets
COPY index.html /usr/share/nginx/html/

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
