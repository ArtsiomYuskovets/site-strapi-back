# Быстрый старт - Backend

## 1. Установка зависимостей

```bash
npm install
```

## 2. Настройка базы данных

### Создание базы данных MySQL

```sql
CREATE DATABASE newsdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'strapi'@'localhost' IDENTIFIED BY 'strapi';
GRANT ALL PRIVILEGES ON newsdb.* TO 'strapi'@'localhost';
FLUSH PRIVILEGES;
```

### Настройка .env

Создайте файл `.env` в корне проекта:

```env
HOST=0.0.0.0
PORT=1337
APP_KEYS=your-app-keys-here
API_TOKEN_SALT=your-api-token-salt
ADMIN_JWT_SECRET=your-admin-jwt-secret
TRANSFER_TOKEN_SALT=your-transfer-token-salt
JWT_SECRET=your-jwt-secret

DATABASE_CLIENT=mysql
DATABASE_HOST=127.0.0.1
DATABASE_PORT=3306
DATABASE_NAME=newsdb
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=strapi
DATABASE_SSL=false

CORS_ORIGIN=http://localhost:3000
```

**Важно:** Замените все `toBeModified` и `your-*-here` на случайные строки!

## 3. Запуск

```bash
npm run develop
```

При первом запуске:
1. Откройте http://localhost:1337/admin
2. Создайте администратора
3. Настройте роли в Settings > Users & Permissions Plugin > Roles

## 4. Настройка ролей

### Editor (Редактор)

В админ-панели:
1. Settings > Users & Permissions Plugin > Roles > Editor
2. Разрешите все права для Article (find, findOne, create, update, delete)
3. Разрешите доступ к кастомным endpoints

### Authenticated (Авторизованный)

1. Settings > Users & Permissions Plugin > Roles > Authenticated
2. Разрешите:
   - Article: find, findOne, create, update (только свои)
   - Article: delete (только свои)

### Public (Гость)

1. Settings > Users & Permissions Plugin > Roles > Public
2. Разрешите:
   - Article: find, findOne (только опубликованные)

## 5. Проверка работы

### Тест API

```bash
# Список статей
curl http://localhost:1337/api/articles

# Избранные статьи
curl http://localhost:1337/api/articles/featured

# Категории
curl http://localhost:1337/api/categories
```

## 6. Seed данные (опционально)

После настройки ролей можно создать тестовые данные через админ-панель или использовать seed скрипт.

## Возможные проблемы

### Ошибка подключения к БД

- Проверьте, что MySQL запущен
- Проверьте credentials в .env
- Убедитесь, что база данных создана

### Ошибка CORS

- Проверьте CORS_ORIGIN в .env
- Убедитесь, что frontend запущен на правильном порту

### Ошибка при создании моделей

- Убедитесь, что все файлы schema.json на месте
- Проверьте синтаксис JSON в схемах






