FROM nginx:alpine
ENV PORT=8080
WORKDIR /usr/share/nginx/html
COPY Game ./Game
COPY FingerTracking ./FingerTracking

EXPOSE 8080
CMD sh -c "sed -i 's/listen\s\+80;/listen ${PORT};/; s/listen\s\+\[::\]:80;/listen [::]:${PORT};/' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
