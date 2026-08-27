import type { Group } from '../../../types';

type BuildSchoolGroupInput = {
    name: string;
    ownerId: string;
};

type BuildClassGroupInput = {
    name: string;
    parentId: string;
    ownerId: string;
    now?: number;
    index?: number;
};

export const buildNewSchoolGroup = ({ name, ownerId }: BuildSchoolGroupInput): Group => ({
    id: `school_${Date.now()}`,
    name,
    type: 'SCHOOL',
    ownerId,
    supervisorIds: [],
    studentIds: [],
    courseIds: [],
    createdAt: Date.now(),
    totalStudents: 0,
    totalSupervisors: 0,
    totalCourses: 0,
});

export const buildNewClassGroup = ({
    name,
    parentId,
    ownerId,
    now = Date.now(),
    index,
}: BuildClassGroupInput): Group => ({
    id: index == null ? `class_${now}` : `class_${now}_${index}`,
    name,
    type: 'CLASS',
    parentId,
    ownerId,
    supervisorIds: [],
    studentIds: [],
    courseIds: [],
    createdAt: index == null ? now : now + index,
    totalStudents: 0,
    totalSupervisors: 0,
    totalCourses: 0,
});
