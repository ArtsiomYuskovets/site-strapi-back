# Audit Log - Система логирования действий

## Описание

Коллекция AuditLog автоматически записывает все важные действия пользователей в базу данных:
- Создание статей
- Обновление статей
- Удаление статей
- Публикация статей

## Структура данных

Каждая запись в AuditLog содержит:
- `action` - тип действия (create, update, delete, publish, unpublish)
- `entityType` - тип сущности (article, category и т.д.)
- `entityId` - ID сущности
- `entityTitle` - название сущности (для удобства)
- `user` - связь с пользователем
- `userId` - ID пользователя
- `userEmail` - Email пользователя
- `userRole` - Роль пользователя
- `changes` - JSON с изменениями (опционально)
- `ipAddress` - IP адрес пользователя
- `userAgent` - User-Agent браузера
- `createdAt` - дата и время действия

## Автоматическое логирование

Логирование происходит автоматически в следующих местах:

1. **Lifecycles** (`src/api/article/content-types/article/lifecycles.ts`):
   - `afterCreate` - при создании статьи
   - `afterUpdate` - при обновлении статьи
   - `afterDelete` - при удалении статьи

2. **Controllers** (`src/api/article/controllers/article.ts`):
   - `create` - создание статьи через API
   - `update` - обновление статьи через API
   - `delete` - удаление статьи через API
   - `publish` - публикация статьи

## Просмотр логов

### Через Strapi Admin

1. Зайдите в админ-панель Strapi
2. В меню слева найдите "Audit Log"
3. Просматривайте все записи с фильтрацией и поиском

### Через API

**Получить все логи (только для редакторов):**
```bash
GET /api/audit-logs
Authorization: Bearer <editor-jwt-token>
```

**Получить один лог:**
```bash
GET /api/audit-logs/:id
Authorization: Bearer <editor-jwt-token>
```

**Пример с фильтрацией:**
```bash
GET /api/audit-logs?filters[action][$eq]=delete&filters[entityType][$eq]=article&sort=createdAt:desc&pagination[page]=1&pagination[pageSize]=20
```

## Права доступа

- **Просмотр логов**: только редакторы (role: editor)
- **Запись логов**: автоматическая, доступна для всех действий

## Настройка прав в Strapi Admin

1. Settings → Users & Permissions Plugin → Roles → Editor
2. В разделе "Audit Log" включите:
   - ✅ `find` - просмотр списка логов
   - ✅ `findOne` - просмотр отдельного лога

## Примеры использования

### Получить все удаления статей за последний месяц

```bash
GET /api/audit-logs?filters[action][$eq]=delete&filters[entityType][$eq]=article&filters[createdAt][$gte]=2025-01-01&sort=createdAt:desc
```

### Получить все действия конкретного пользователя

```bash
GET /api/audit-logs?filters[userId][$eq]=5&sort=createdAt:desc
```

### Получить все публикации

```bash
GET /api/audit-logs?filters[action][$eq]=publish&sort=createdAt:desc
```

## Расширение функциональности

Для добавления логирования в другие content types:

1. Добавьте вызов сервиса в нужный lifecycle или контроллер:
```typescript
if (strapi.service('api::audit-log.audit-log')) {
  await strapi.service('api::audit-log.audit-log').logAction({
    action: 'create', // или 'update', 'delete', 'publish'
    entityType: 'category', // тип сущности
    entityId: entity.id,
    entityTitle: entity.name,
    user: ctx.state.user,
    ctx,
  });
}
```

2. Перезапустите Strapi - логирование начнет работать автоматически.

