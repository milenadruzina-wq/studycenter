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
import { Course } from "./Course";
import { Student } from "./Student";
import { Schedule } from "./Schedule";
import { Attendance } from "./Attendance";

@Entity("groups")
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "integer", default: 0 })
  maxStudents: number;

  @Column({ type: "date", nullable: true })
  startDate: Date;

  @Column({ type: "date", nullable: true })
  endDate: Date;

  @Column({ type: "time", nullable: true })
  startTime: string;

  @Column({ type: "time", nullable: true })
  endTime: string;

  @ManyToOne(() => Course, (course) => course.groups)
  @JoinColumn({ name: "course_id" })
  course: Course;

  @Column({ name: "course_id" })
  courseId: number;

  @OneToMany(() => Student, (student) => student.group)
  students: Student[];

  @OneToMany(() => Schedule, (schedule) => schedule.group)
  schedules: Schedule[];

  @OneToMany(() => Attendance, (attendance) => attendance.group)
  attendances: Attendance[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}




