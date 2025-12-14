# Swagger API Documentation

## Описание

Файл `swagger.yaml` содержит полное описание API для новостного сайта на базе Strapi.

## Как использовать

### 1. Онлайн просмотр (Swagger UI)

1. Откройте [Swagger Editor](https://editor.swagger.io/)
2. Скопируйте содержимое файла `swagger.yaml`
3. Вставьте в редактор
4. Документация отобразится справа

### 2. Локальный просмотр

#### Вариант 1: Встроенный сервер (Рекомендуется)

```bash
# Через npm скрипт
npm run swagger

# Или напрямую
node swagger-server.js
```

Откройте http://localhost:8080

**Важно:** Сервер автоматически проксирует все запросы к `/api/*` на `http://localhost:1337`, что решает проблемы с CORS. Убедитесь, что Strapi backend запущен на порту 1337.

#### Вариант 2: Swagger UI (Docker)

```bash
# Windows PowerShell
docker run -p 8080:8080 -e SWAGGER_JSON=/swagger.yaml -v ${PWD}/swagger.yaml:/swagger.yaml swaggerapi/swagger-ui

# Linux/Mac
docker run -p 8080:8080 -e SWAGGER_JSON=/swagger.yaml -v $(pwd)/swagger.yaml:/swagger.yaml swaggerapi/swagger-ui
```

Откройте http://localhost:8080

#### Вариант 3: Redoc CLI

```bash
npm install -g redoc-cli
redoc-cli serve swagger.yaml --port 8080
```

#### Вариант 4: VS Code расширение

Установите расширение "Swagger Viewer" или "OpenAPI (Swagger) Editor" в VS Code и откройте `swagger.yaml`

### 3. Импорт в Postman

1. Откройте Postman
2. Нажмите Import
3. Выберите файл `swagger.yaml`
4. Все endpoints будут импортированы с примерами

### 4. Генерация клиента

#### TypeScript клиент

```bash
npx @openapitools/openapi-generator-cli generate \
  -i swagger.yaml \
  -g typescript-axios \
  -o ./generated-client
```

#### JavaScript клиент

```bash
npx @openapitools/openapi-generator-cli generate \
  -i swagger.yaml \
  -g javascript \
  -o ./generated-client
```

## Описанные endpoints

### Auth (Аутентификация)
- `POST /api/auth/local` - Вход в систему
- `POST /api/auth/local/register` - Регистрация
- `GET /api/auth/me` - Получить текущего пользователя

### Articles (Статьи)
- `GET /api/articles` - Список статей (с фильтрами и пагинацией)
- `GET /api/articles/{id}` - Получить статью по ID
- `GET /api/articles/featured` - Избранные статьи
- `POST /api/articles` - Создать статью
- `PUT /api/articles/{id}` - Обновить статью
- `DELETE /api/articles/{id}` - Удалить статью
- `POST /api/articles/{id}/publish` - Опубликовать статью

### Categories (Категории)
- `GET /api/categories` - Список категорий

## Авторизация

Большинство endpoints требуют JWT токен. Для авторизации:

1. Выполните `POST /api/auth/local` с credentials
2. Получите `jwt` токен из ответа
3. Используйте токен в заголовке: `Authorization: Bearer <token>`

## Примеры использования

### Вход в систему

```bash
curl -X POST http://localhost:1337/api/auth/local \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "user@example.com",
    "password": "password123"
  }'
```

### Получение статей

**Важно:** Для получения статей с полными данными (категория, автор, изображение) обязательно используйте параметр `populate`:

```bash
curl -X GET "http://localhost:1337/api/articles?populate=category,author,coverImage&pagination[page]=1&pagination[pageSize]=10"
```

**В Swagger UI:**
1. Откройте endpoint `GET /api/articles`
2. В поле `populate` введите: `category,author,coverImage`
3. **Важно:** Не заполняйте все фильтры одновременно! Фильтры применяются через AND - если указать несколько, вернутся только статьи, которые соответствуют ВСЕМ условиям.
   - Для получения всех статей: оставьте фильтры пустыми
   - Для фильтрации по категории: заполните только `filters[category][slug][$eq]`
   - Для избранных статей: заполните только `filters[isFeatured][$eq]=true`
4. Нажмите "Execute"

**Примечание:** 
- Strapi по умолчанию возвращает только опубликованные статьи (с `publishedAt` не null). Если статьи не опубликованы, они не будут возвращены.
- Если вы видите 0 статей, проверьте:
  1. Что статьи опубликованы в Strapi Admin
  2. Что не указаны слишком строгие фильтры одновременно
  3. Что используете параметр `populate=category,author,coverImage`

### Создание статьи (с авторизацией)

```bash
curl -X POST http://localhost:1337/api/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "data": {
      "title": "Новая статья",
      "slug": "novaya-statya",
      "content": "Содержание...",
      "excerpt": "Краткое описание"
    }
  }'
```

## Обновление документации

При изменении API обновите файл `swagger.yaml`:

1. Добавьте новые endpoints в секцию `paths`
2. Обновите схемы в секции `components/schemas`
3. Добавьте новые теги в секцию `tags`

## Полезные ссылки

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger Editor](https://editor.swagger.io/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)

## Решение проблем

### CORS ошибки

Если вы видите ошибку "Failed to fetch" или "CORS", убедитесь, что:
1. Используете сервер `http://localhost:8080` в Swagger UI (выбран по умолчанию)
2. Strapi backend запущен на `http://localhost:1337`
3. Swagger сервер проксирует запросы автоматически

Если проблемы остаются, проверьте настройки CORS в Strapi конфигурации.

### Порт 8080 занят

Если порт 8080 занят, измените `PORT` в файле `swagger-server.js`:

```javascript
const PORT = 8081  // или другой свободный порт
```

### Изменение адреса API

Если Strapi запущен на другом адресе, установите переменную окружения:

```bash
# Windows PowerShell
$env:API_URL="http://localhost:1337"; npm run swagger

# Linux/Mac
API_URL=http://localhost:1337 npm run swagger
```

Или измените `API_URL` в файле `swagger-server.js`.

### Ошибка при запуске

Убедитесь, что файл `swagger.yaml` находится в той же директории, что и `swagger-server.js`.

