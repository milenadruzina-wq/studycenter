import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Student } from "./Student";

@Entity("grades")
export class Grade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 200 })
  subject: string;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  score: number;

  @Column({ type: "text", nullable: true })
  comment: string;

  @Column({ type: "date" })
  date: Date;

  @ManyToOne(() => Student, (student) => student.grades)
  @JoinColumn({ name: "student_id" })
  student: Student;

  @Column({ name: "student_id" })
  studentId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}















