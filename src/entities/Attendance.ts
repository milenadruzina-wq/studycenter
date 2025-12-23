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
import { Group } from "./Group";

export enum AttendanceStatus {
  PRESENT = "present",
  ABSENT = "absent",
  LATE = "late",
  EXCUSED = "excused",
}

@Entity("attendances")
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "date" })
  date: Date;

  @Column({
    type: "enum",
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @Column({ type: "text", nullable: true })
  notes: string;

  @ManyToOne(() => Student, (student) => student.attendances)
  @JoinColumn({ name: "student_id" })
  student: Student;

  @Column({ name: "student_id" })
  studentId: number;

  @ManyToOne(() => Group, (group) => group.attendances)
  @JoinColumn({ name: "group_id" })
  group: Group;

  @Column({ name: "group_id" })
  groupId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
