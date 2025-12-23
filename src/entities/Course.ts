import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Teacher } from "./Teacher";
import { Group } from "./Group";
import { Payment } from "./Payment";

@Entity("courses")
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 200 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  price: number;

  @ManyToOne(() => Teacher, (teacher) => teacher.courses)
  @JoinColumn({ name: "teacher_id" })
  teacher: Teacher;

  @Column({ name: "teacher_id", nullable: true })
  teacherId: number | null;

  @OneToMany(() => Group, (group) => group.course)
  groups: Group[];

  @OneToMany(() => Payment, (payment) => payment.course)
  payments: Payment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}




