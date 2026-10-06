FROM php:8.3-cli-alpine AS vendor

RUN apk add --no-cache \
    bash curl git unzip \
    $PHPIZE_DEPS \
    postgresql-dev \
    libpng-dev libjpeg-turbo-dev libwebp-dev freetype-dev \
    libzip-dev icu-dev oniguruma-dev linux-headers \
  && docker-php-ext-configure gd \
       --with-freetype --with-jpeg --with-webp \
  && docker-php-ext-install -j$(nproc) \
       pdo_pgsql pgsql gd zip bcmath intl mbstring exif pcntl opcache \
  && pecl install redis \
  && docker-php-ext-enable redis \
  && apk del $PHPIZE_DEPS

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./

RUN composer install \
      --no-dev --no-interaction --no-progress \
      --prefer-dist --optimize-autoloader --no-scripts

FROM php:8.3-cli-alpine AS builder

RUN apk add --no-cache \
    curl nodejs npm \
    postgresql-libs libpng libjpeg-turbo libwebp freetype \
    libzip icu-libs oniguruma \
  && apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS postgresql-dev libpng-dev libjpeg-turbo-dev libwebp-dev \
    freetype-dev libzip-dev icu-dev oniguruma-dev linux-headers \
  && docker-php-ext-configure gd \
       --with-freetype --with-jpeg --with-webp \
  && docker-php-ext-install -j$(nproc) \
       pdo_pgsql pgsql gd zip bcmath intl mbstring exif pcntl opcache \
  && pecl install redis \
  && docker-php-ext-enable redis \
  && apk del .build-deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
COPY --from=vendor /app/vendor ./vendor

RUN npm run build \
  && composer dump-autoload --optimize \
  && rm -rf node_modules \
  && mkdir -p resources/fonts \
  && wget -q "https://fonts.gstatic.com/s/poppins/v21/pxiEyp8kv8JHgFVrJJfecg.woff2" -O /tmp/poppins.woff2 || true \
  && wget -q "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Regular.ttf" -O resources/fonts/Poppins-Regular.ttf \
  && wget -q "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf" -O resources/fonts/Poppins-Bold.ttf

FROM php:8.3-cli-alpine AS production

RUN apk add --no-cache \
    curl \
    postgresql-libs libpng libjpeg-turbo libwebp freetype \
    libzip icu-libs oniguruma \
  && apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS postgresql-dev libpng-dev libjpeg-turbo-dev libwebp-dev \
    freetype-dev libzip-dev icu-dev oniguruma-dev linux-headers \
  && docker-php-ext-configure gd \
       --with-freetype --with-jpeg --with-webp \
  && docker-php-ext-install -j$(nproc) \
       pdo_pgsql pgsql gd zip bcmath intl mbstring exif pcntl opcache \
  && pecl install redis \
  && docker-php-ext-enable redis \
  && apk del .build-deps

WORKDIR /var/www/html

COPY --from=builder /var/www/html /var/www/html

RUN mkdir -p \
      storage/framework/cache/data \
      storage/framework/sessions \
      storage/framework/views \
      storage/logs \
      bootstrap/cache \
  && chown -R www-data:www-data storage bootstrap/cache \
  && chmod -R 775 storage bootstrap/cache

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
