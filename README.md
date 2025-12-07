# Новостной сайт - Backend (Strapi)

Backend приложение для новостного сайта на Strapi v5.

## Технологии

- Strapi v5.31.3
- Node.js 20+
- MySQL 8.0
- TypeScript

## Структура проекта

```
src/
  ├── api/
  │   ├── article/          # API для статей
  │   │   ├── content-types/
  │   │   │   └── article/
  │   │   │       ├── schema.json      # Схема модели
  │   │   │       └── lifecycles.ts    # Lifecycle hooks
  │   │   ├── controllers/
  │   │   │   └── article.ts           # Кастомные контроллеры
  │   │   ├── routes/
  │   │   │   └── article.ts           # Кастомные роуты
  │   │   └── policies/                # Политики доступа
  │   └── category/         # API для категорий
  │       └── content-types/
  │           └── category/
  │               ├── schema.json
  │               └── lifecycles.ts
  ├── config/               # Конфигурация
  └── extensions/           # Расширения
```

## Установка и запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Создайте файл `.env` на основе `.env.example`:

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

### 3. Создание базы данных

Создайте базу данных MySQL:

```sql
CREATE DATABASE newsdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'strapi'@'localhost' IDENTIFIED BY 'strapi';
GRANT ALL PRIVILEGES ON newsdb.* TO 'strapi'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Запуск в режиме разработки

```bash
npm run develop
```

Админ-панель будет доступна на `http://localhost:1337/admin`

### 5. Создание первого администратора

При первом запуске создайте администратора через веб-интерфейс.

## Seed данные

Для заполнения базы данных тестовыми данными:

1. Создайте файл `database/seeds/seed.js` (уже создан)
2. Запустите через Strapi CLI или создайте скрипт

Или используйте админ-панель для создания данных вручную.

## API Endpoints

### Статьи

- `GET /api/articles` - Список статей (с фильтрами, пагинацией, сортировкой)
- `GET /api/articles/:id` - Детали статьи
- `GET /api/articles/featured` - Избранные статьи (кастомный endpoint)
- `POST /api/articles` - Создание статьи
- `PUT /api/articles/:id` - Обновление статьи
- `DELETE /api/articles/:id` - Удаление статьи (с проверкой прав)
- `POST /api/articles/:id/publish` - Публикация статьи (только для редакторов)
- `POST /api/articles/:id/view` - Увеличение счетчика просмотров

### Категории

- `GET /api/categories` - Список категорий
- `GET /api/categories/:id` - Детали категории
- `POST /api/categories` - Создание категории
- `PUT /api/categories/:id` - Обновление категории
- `DELETE /api/categories/:id` - Удаление категории

### Аутентификация

- `POST /api/auth/local` - Вход
- `POST /api/auth/local/register` - Регистрация
- `GET /api/users/me` - Текущий пользователь

## Модели данных

### Article (Статья)

- `title` (string, required) - Заголовок
- `slug` (string, required, unique) - URL-слаг (автогенерация)
- `content` (richtext, required) - Содержание
- `excerpt` (text, required) - Краткое описание
- `coverImage` (media, optional) - Обложка
- `publishedAt` (datetime) - Дата публикации
- `views` (integer, default: 0) - Количество просмотров
- `isFeatured` (boolean, default: false) - Избранная статья
- `readingTime` (integer, default: 0) - Время чтения в минутах (автоподсчет)
- `tags` (json) - Теги
- `author` (relation to User) - Автор
- `category` (relation to Category) - Категория

### Category (Категория)

- `name` (string, required, unique) - Название
- `slug` (string, required, unique) - URL-слаг (автогенерация)
- `articles` (relation to Article) - Статьи

## Lifecycle Hooks

### Article

- **beforeCreate**: Автогенерация slug из title, подсчет readingTime
- **beforeUpdate**: Обновление slug при изменении title, пересчет readingTime
- **afterCreate/afterUpdate/afterDelete**: Логирование действий

### Category

- **beforeCreate**: Автогенерация slug из name
- **beforeUpdate**: Обновление slug при изменении name

## RBAC (Роли и права доступа)

### Роли

1. **Public** - Гости
   - Чтение опубликованных статей

2. **Authenticated** - Авторизованные пользователи
   - Чтение опубликованных статей
   - Создание своих статей
   - Редактирование своих статей
   - Удаление своих статей

3. **Editor** - Редакторы
   - Все права Authenticated
   - Создание, редактирование, удаление любых статей
   - Публикация статей
   - Просмотр черновиков

### Политики доступа

- `can-delete`: Проверка прав на удаление (только свои статьи или роль editor)
- `can-publish`: Проверка прав на публикацию (только editor)

## Кастомные Endpoints

### GET /api/articles/featured

Возвращает список избранных опубликованных статей.

**Пример запроса:**
```bash
GET /api/articles/featured?populate=category,author,coverImage&sort=publishedAt:desc
```

### POST /api/articles/:id/publish

Публикует статью (устанавливает publishedAt). Доступно только для редакторов.

**Пример запроса:**
```bash
POST /api/articles/1/publish
Authorization: Bearer <editor-jwt-token>
```

### POST /api/articles/:id/view

Увеличивает счетчик просмотров статьи.

**Пример запроса:**
```bash
POST /api/articles/1/view
```

## Фильтрация и пагинация

### Примеры запросов

```bash
# Список статей с пагинацией
GET /api/articles?pagination[page]=1&pagination[pageSize]=10

# Фильтр по категории
GET /api/articles?filters[category][slug][$eq]=technology

# Фильтр избранных
GET /api/articles?filters[isFeatured][$eq]=true

# Сортировка
GET /api/articles?sort=publishedAt:desc

# Populate связанных данных
GET /api/articles?populate=category,author,coverImage

# Комбинированный запрос
GET /api/articles?filters[category][slug][$eq]=technology&filters[isFeatured][$eq]=true&sort=publishedAt:desc&pagination[page]=1&pagination[pageSize]=10&populate=category,author,coverImage
```

## Docker

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 1337

CMD ["npm", "start"]
```

### docker-compose.yml

См. общий docker-compose.yml в корне проекта.

## Логирование

Действия с статьями (создание, обновление, удаление, публикация) логируются в консоль Strapi.

## Разработка

```bash
# Режим разработки
npm run develop

# Сборка
npm run build

# Production запуск
npm run start

# Strapi консоль
npm run console
```

## Безопасность

- JWT токены для аутентификации
- CORS настроен для frontend домена
- Политики доступа для защиты endpoints
- Валидация входных данных через схемы

## Документация

Полная документация Strapi: https://docs.strapi.io
