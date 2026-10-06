#!/bin/sh
set -e

php artisan config:cache
php artisan view:cache
php artisan migrate --force

exec "$@"
