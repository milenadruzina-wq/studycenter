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
import { Group } from "./Group";
import { Grade } from "./Grade";
import { Attendance } from "./Attendance";
import { Payment } from "./Payment";

@Entity("students")
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 100 })
  firstName: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  lastName: string | null;

  @Column({ type: "varchar", length: 100, unique: true, nullable: true })
  email: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string;

  @Column({ type: "date", nullable: true })
  dateOfBirth: Date;

  @Column({ type: "varchar", length: 200, nullable: true })
  address: string;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "date", nullable: true })
  dateLeft: Date | null;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "varchar", length: 200, nullable: true })
  parentName: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  parentPhone: string | null;

  @ManyToOne(() => Group, (group) => group.students, { nullable: true })
  @JoinColumn({ name: "group_id" })
  group: Group;

  @Column({ name: "group_id", nullable: true })
  groupId: number | null;

  @OneToMany(() => Grade, (grade) => grade.student)
  grades: Grade[];

  @OneToMany(() => Attendance, (attendance) => attendance.student)
  attendances: Attendance[];

  @OneToMany(() => Payment, (payment) => payment.student)
  payments: Payment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}




