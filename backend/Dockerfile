FROM nginx:alpine
ENV PORT=3000
WORKDIR /usr/share/nginx/html
COPY . .
EXPOSE 3000
CMD sh -c "sed -i 's/listen\s\+80;/listen ${PORT};/; s/listen\s\+\[::\]:80;/listen [::]:${PORT};/' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"