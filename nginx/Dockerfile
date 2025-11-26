FROM nginx:alpine

# Install openssl for certificate generation
RUN apk add --no-cache openssl gettext

# Copy NGINX configuration template
COPY nginx.conf /etc/nginx/nginx.conf.template

# Copy certificate generation scripts
COPY scripts/ /scripts/
RUN chmod +x /scripts/generate-certs.sh /scripts/entrypoint.sh

EXPOSE 80 443

ENTRYPOINT ["/scripts/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
