import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { Student } from "./entities/Student";
import { Teacher } from "./entities/Teacher";
import { Course } from "./entities/Course";
import { Group } from "./entities/Group";
import { Schedule } from "./entities/Schedule";
import { Grade } from "./entities/Grade";
import { User } from "./entities/User";
import { Attendance } from "./entities/Attendance";
import { Payment } from "./entities/Payment";
import { Branch } from "./entities/Branch";
import { CourseRequest } from "./entities/CourseRequest";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "12345678",
  database: process.env.DB_DATABASE || "studycenter",
  synchronize: true, // Автосинхронизация схемы БД
  logging: true, // Логирование SQL запросов
  entities: [Student, Teacher, Course, Group, Schedule, Grade, User, Attendance, Payment, Branch, CourseRequest],
  migrations: ["src/migrations/**/*"],
  subscribers: ["src/subscribers/**/*"],
});



