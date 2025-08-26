FROM php:8.2-cli

# Install sockets extension
RUN docker-php-ext-install sockets

# Set working directory
WORKDIR /app

# Copy your backend code
COPY . /app/

# Expose the WebSocket port
EXPOSE 4242

# Start the server
CMD ["php", "src/server.php"]
