import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { Student } from "./Student";
import { Course } from "./Course";

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  OVERDUE = "overdue",
  REFUNDED = "refunded",
}

@Entity("payments")
@Index(["studentId", "month"], { unique: true }) // Уникальный индекс: student_id + month (ключ платежа)
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: "enum",
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: "date" })
  paymentDate: Date;

  @Column({ type: "varchar", length: 7, nullable: false })
  month: string; // Формат: YYYY-MM (например, "2025-12") - часть ключа: student_id + month

  @Column({ type: "date", nullable: true })
  dueDate: Date;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  paymentMethod: string;

  @ManyToOne(() => Student, (student) => student.payments)
  @JoinColumn({ name: "student_id" })
  student: Student;

  @Column({ name: "student_id" })
  studentId: number;

  @ManyToOne(() => Course, (course) => course.payments, { nullable: true })
  @JoinColumn({ name: "course_id" })
  course: Course;

  @Column({ name: "course_id", nullable: true })
  courseId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}












