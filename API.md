# Study Center API Documentation

REST API для системы управления учебным центром.

## Базовый URL

```
http://localhost:3000/api
```

## Endpoints

### Students (Студенты)

#### GET /api/students
Получить всех студентов

**Response:**
```json
[
  {
    "id": 1,
    "firstName": "Иван",
    "lastName": "Иванов",
    "email": "ivan@example.com",
    "phone": "+7 999 123 45 67",
    "dateOfBirth": "2000-01-01",
    "address": "Москва, ул. Примерная, 1",
    "groupId": 1,
    "group": { ... },
    "grades": [ ... ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET /api/students/:id
Получить студента по ID

#### POST /api/students
Создать нового студента

**Request Body:**
```json
{
  "firstName": "Иван",
  "lastName": "Иванов",
  "email": "ivan@example.com",
  "phone": "+7 999 123 45 67",
  "dateOfBirth": "2000-01-01",
  "address": "Москва, ул. Примерная, 1",
  "groupId": 1
}
```

#### PUT /api/students/:id
Обновить студента

#### DELETE /api/students/:id
Удалить студента

---

### Teachers (Преподаватели)

#### GET /api/teachers
Получить всех преподавателей

#### GET /api/teachers/:id
Получить преподавателя по ID

#### POST /api/teachers
Создать нового преподавателя

**Request Body:**
```json
{
  "firstName": "Петр",
  "lastName": "Петров",
  "email": "petr@example.com",
  "phone": "+7 999 234 56 78",
  "specialization": "Программирование",
  "bio": "Опытный разработчик с 10-летним стажем"
}
```

#### PUT /api/teachers/:id
Обновить преподавателя

#### DELETE /api/teachers/:id
Удалить преподавателя

---

### Courses (Курсы)

#### GET /api/courses
Получить все курсы

**Response:**
```json
[
  {
    "id": 1,
    "name": "Основы программирования",
    "description": "Изучение основ программирования",
    "durationHours": 120,
    "price": 25000,
    "teacherId": 1,
    "teacher": { ... },
    "groups": [ ... ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET /api/courses/:id
Получить курс по ID (с полной информацией о группах, расписании и студентах)

#### POST /api/courses
Создать новый курс

**Request Body:**
```json
{
  "name": "Основы программирования",
  "description": "Изучение основ программирования",
  "durationHours": 120,
  "price": 25000,
  "teacherId": 1
}
```

#### PUT /api/courses/:id
Обновить курс

#### DELETE /api/courses/:id
Удалить курс

---

### Groups (Группы)

#### GET /api/groups
Получить все группы

#### GET /api/groups/:id
Получить группу по ID

#### POST /api/groups
Создать новую группу

**Request Body:**
```json
{
  "name": "Группа A",
  "maxStudents": 20,
  "startDate": "2024-02-01",
  "endDate": "2024-06-01",
  "courseId": 1
}
```

#### PUT /api/groups/:id
Обновить группу

#### DELETE /api/groups/:id
Удалить группу

---

### Schedules (Расписание)

#### GET /api/schedules
Получить все расписания

#### GET /api/schedules/:id
Получить расписание по ID

#### GET /api/schedules/group/:groupId
Получить расписание для конкретной группы

**Response:**
```json
[
  {
    "id": 1,
    "dayOfWeek": "Понедельник",
    "startTime": "18:00",
    "endTime": "20:00",
    "classroom": "Аудитория 101",
    "groupId": 1,
    "group": { ... },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### POST /api/schedules
Создать новое расписание

**Request Body:**
```json
{
  "dayOfWeek": "Понедельник",
  "startTime": "18:00",
  "endTime": "20:00",
  "classroom": "Аудитория 101",
  "groupId": 1
}
```

#### PUT /api/schedules/:id
Обновить расписание

#### DELETE /api/schedules/:id
Удалить расписание

---

### Grades (Оценки)

#### GET /api/grades
Получить все оценки

#### GET /api/grades/:id
Получить оценку по ID

#### GET /api/grades/student/:studentId
Получить все оценки студента

**Response:**
```json
[
  {
    "id": 1,
    "subject": "Программирование",
    "score": 5.0,
    "comment": "Отлично выполненная работа",
    "date": "2024-01-15",
    "studentId": 1,
    "student": { ... },
    "createdAt": "2024-01-15T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z"
  }
]
```

#### POST /api/grades
Создать новую оценку

**Request Body:**
```json
{
  "subject": "Программирование",
  "score": 5.0,
  "comment": "Отлично выполненная работа",
  "date": "2024-01-15",
  "studentId": 1
}
```

#### PUT /api/grades/:id
Обновить оценку

#### DELETE /api/grades/:id
Удалить оценку

---

## Health Check

#### GET /health
Проверка работоспособности API

**Response:**
```json
{
  "status": "ok",
  "message": "Study Center API is running"
}
```

---

## Обработка ошибок

Все ошибки возвращаются в следующем формате:

```json
{
  "status": "error",
  "message": "Описание ошибки"
}
```

**Коды статусов:**
- `200` - Успешный запрос
- `201` - Ресурс создан
- `204` - Ресурс удален
- `404` - Ресурс не найден
- `500` - Внутренняя ошибка сервера

---

## Примеры использования

### Создание курса с преподавателем

```bash
# 1. Создать преподавателя
POST /api/teachers
{
  "firstName": "Иван",
  "lastName": "Петров",
  "email": "ivan@example.com",
  "specialization": "Программирование"
}

# 2. Создать курс
POST /api/courses
{
  "name": "Основы программирования",
  "description": "Изучение основ",
  "durationHours": 120,
  "price": 25000,
  "teacherId": 1
}

# 3. Создать группу
POST /api/groups
{
  "name": "Группа A",
  "maxStudents": 20,
  "startDate": "2024-02-01",
  "endDate": "2024-06-01",
  "courseId": 1
}

# 4. Добавить расписание
POST /api/schedules
{
  "dayOfWeek": "Понедельник",
  "startTime": "18:00",
  "endTime": "20:00",
  "classroom": "Аудитория 101",
  "groupId": 1
}
```

### Запись студента на курс

```bash
# 1. Создать студента
POST /api/students
{
  "firstName": "Анна",
  "lastName": "Смирнова",
  "email": "anna@example.com",
  "phone": "+7 999 345 67 89",
  "groupId": 1
}

# 2. Добавить оценку
POST /api/grades
{
  "subject": "Программирование",
  "score": 5.0,
  "comment": "Отлично",
  "date": "2024-01-15",
  "studentId": 1
}
```

---

## Технологии

- **Express.js** - веб-фреймворк
- **TypeORM** - ORM для работы с БД
- **PostgreSQL** - база данных
- **TypeScript** - типизация
- **CORS** - поддержка кросс-доменных запросов
- **Helmet** - безопасность HTTP заголовков
- **Morgan** - логирование запросов














