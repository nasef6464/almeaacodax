import type { Group, User } from '../../../types';
import type { SaveVerificationState } from './contracts';
import { getErrorMessage } from './errorMessageService';

type RosterAssignmentActionsInput = {
    selectedSchool: Group;
    schoolScopeGroups: Group[];
    schoolStudents: User[];
    schoolClasses: Group[];
    supervisors: User[];
    teachers: User[];
    assignSupervisorToGroupAsync: (userId: string, groupId: string) => Promise<void>;
    removeSupervisorFromGroupAsync: (userId: string, groupId: string) => Promise<void>;
    assignTeacherToGroupAsync: (userId: string, groupId: string) => Promise<void>;
    removeTeacherFromGroupAsync: (userId: string, groupId: string) => Promise<void>;
    assignStudentToGroupAsync: (userId: string, groupId: string) => Promise<void>;
    removeStudentFromGroupAsync: (userId: string, groupId: string) => Promise<void>;
    refreshSchoolWorkspace: (schoolId: string) => Promise<unknown>;
    setRosterActionPending: (value: string | null) => void;
    setManagementError: (value: string | null) => void;
    setManagementNotice: (value: string | null) => void;
    setSaveVerificationState: (value: SaveVerificationState) => void;
    setSaveVerificationMessage: (value: string) => void;
};

export const createSchoolRosterAssignmentActions = ({
    selectedSchool,
    schoolScopeGroups,
    schoolStudents,
    schoolClasses,
    supervisors,
    teachers,
    assignSupervisorToGroupAsync,
    removeSupervisorFromGroupAsync,
    assignTeacherToGroupAsync,
    removeTeacherFromGroupAsync,
    assignStudentToGroupAsync,
    removeStudentFromGroupAsync,
    refreshSchoolWorkspace,
    setRosterActionPending,
    setManagementError,
    setManagementNotice,
    setSaveVerificationState,
    setSaveVerificationMessage,
}: RosterAssignmentActionsInput) => {
    const handleAssignSchoolSupervisor = async (supervisorId: string, groupId: string) => {
        const targetGroup = schoolScopeGroups.find((group) => group.id === groupId);
        const targetSupervisor = supervisors.find((currentUser) => currentUser.id === supervisorId);
        setRosterActionPending(`supervisor-assign-${groupId}-${supervisorId}`);
        setManagementError(null);
        setManagementNotice(null);
        setSaveVerificationState('saving');
        setSaveVerificationMessage('جاري ربط المشرف وحفظ النطاق...');
        try {
            await assignSupervisorToGroupAsync(supervisorId, groupId);
            await refreshSchoolWorkspace(selectedSchool.id);
            setSaveVerificationState('success');
            setSaveVerificationMessage('تم ربط المشرف والتأكد من حفظ النطاق.');
            setManagementNotice(`تم حفظ ربط ${targetSupervisor?.name || 'المشرف'} على ${targetGroup?.name || 'النطاق المحدد'}.`);
        } catch (error) {
            const message = getErrorMessage(error, 'تعذر ربط المشرف الآن.');
            setSaveVerificationState('error');
            setSaveVerificationMessage(message);
            setManagementError(message);
        } finally {
            setRosterActionPending(null);
        }
    };

    const handleRemoveSchoolSupervisor = async (supervisorId: string, groupId: string) => {
        const targetGroup = schoolScopeGroups.find((group) => group.id === groupId);
        const targetSupervisor = supervisors.find((currentUser) => currentUser.id === supervisorId);
        setRosterActionPending(`supervisor-remove-${groupId}-${supervisorId}`);
        setManagementError(null);
        setManagementNotice(null);
        setSaveVerificationState('saving');
        setSaveVerificationMessage('جاري إزالة ربط المشرف وحفظ النطاق...');
        try {
            await removeSupervisorFromGroupAsync(supervisorId, groupId);
            await refreshSchoolWorkspace(selectedSchool.id);
            setSaveVerificationState('success');
            setSaveVerificationMessage('تم إزالة ربط المشرف والتأكد من حفظ النطاق.');
            setManagementNotice(`تم حفظ إزالة ${targetSupervisor?.name || 'المشرف'} من ${targetGroup?.name || 'النطاق المحدد'}.`);
        } catch (error) {
            const message = getErrorMessage(error, 'تعذر إزالة المشرف الآن.');
            setSaveVerificationState('error');
            setSaveVerificationMessage(message);
            setManagementError(message);
        } finally {
            setRosterActionPending(null);
        }
    };

    const handleAssignStudentToClass = async (studentId: string, classId: string) => {
        const targetStudent = schoolStudents.find((student) => student.id === studentId);
        const targetClass = schoolClasses.find((classroom) => classroom.id === classId);
        setRosterActionPending(`student-assign-${classId}-${studentId}`);
        setManagementError(null);
        setManagementNotice(null);
        try {
            await assignStudentToGroupAsync(studentId, classId);
            await refreshSchoolWorkspace(selectedSchool.id);
            setManagementNotice(`تم حفظ نقل ${targetStudent?.name || 'الطالب'} إلى ${targetClass?.name || 'الفصل المحدد'}.`);
        } catch (error) {
            setManagementError(getErrorMessage(error, 'تعذر نقل الطالب الآن.'));
        } finally {
            setRosterActionPending(null);
        }
    };

    const handleRemoveStudentScope = async (studentId: string, groupId: string) => {
        const targetStudent = schoolStudents.find((student) => student.id === studentId);
        const targetGroup = schoolScopeGroups.find((group) => group.id === groupId);
        setRosterActionPending(`student-remove-${groupId}-${studentId}`);
        setManagementError(null);
        setManagementNotice(null);
        try {
            await removeStudentFromGroupAsync(studentId, groupId);
            await refreshSchoolWorkspace(selectedSchool.id);
            setManagementNotice(`تم حفظ إخراج ${targetStudent?.name || 'الطالب'} من ${targetGroup?.name || 'النطاق المحدد'}.`);
        } catch (error) {
            setManagementError(getErrorMessage(error, 'تعذر إخراج الطالب الآن.'));
        } finally {
            setRosterActionPending(null);
        }
    };

    const handleAssignTeacherToClass = async (teacherId: string, classId: string) => {
        const targetTeacher = teachers.find((teacher) => teacher.id === teacherId);
        const targetClass = schoolClasses.find((classroom) => classroom.id === classId);
        setRosterActionPending(`teacher-assign-${classId}-${teacherId}`);
        setManagementError(null);
        setManagementNotice(null);
        setSaveVerificationState('saving');
        setSaveVerificationMessage('جاري ربط المعلم وحفظ نطاق الفصل...');
        try {
            await assignTeacherToGroupAsync(teacherId, classId);
            await refreshSchoolWorkspace(selectedSchool.id);
            setSaveVerificationState('success');
            setSaveVerificationMessage('تم ربط المعلم والتأكد من حفظ نطاق الفصل.');
            setManagementNotice(`تم حفظ ربط ${targetTeacher?.name || 'المعلم'} على ${targetClass?.name || 'الفصل المحدد'}.`);
        } catch (error) {
            const message = getErrorMessage(error, 'تعذر ربط المعلم الآن.');
            setSaveVerificationState('error');
            setSaveVerificationMessage(message);
            setManagementError(message);
        } finally {
            setRosterActionPending(null);
        }
    };

    const handleRemoveTeacherFromClass = async (classroom: Group, teacher: User) => {
        if (!window.confirm(`هل تريد إزالة ${teacher.name} من تدريس فصل ${classroom.name}؟`)) return;
        setRosterActionPending(`teacher-remove-${classroom.id}-${teacher.id}`);
        setManagementError(null);
        setManagementNotice(null);
        setSaveVerificationState('saving');
        setSaveVerificationMessage('جاري إزالة ربط المعلم وحفظ النطاق...');
        try {
            await removeTeacherFromGroupAsync(teacher.id, classroom.id);
            await refreshSchoolWorkspace(selectedSchool.id);
            setSaveVerificationState('success');
            setSaveVerificationMessage('تم إزالة ربط المعلم والتأكد من حفظ النطاق.');
            setManagementNotice(`تم حفظ إزالة ${teacher.name} من ${classroom.name}.`);
        } catch (error) {
            const message = getErrorMessage(error, 'تعذر إزالة المعلم الآن.');
            setSaveVerificationState('error');
            setSaveVerificationMessage(message);
            setManagementError(message);
        } finally {
            setRosterActionPending(null);
        }
    };

    const confirmRemoveSchoolWideSupervisor = (currentUser: User) => {
        if (!window.confirm(`هل تريد إزالة ${currentUser.name} من إشراف ${selectedSchool.name}؟`)) return;
        void handleRemoveSchoolSupervisor(currentUser.id, selectedSchool.id);
    };

    const confirmRemoveClassSupervisor = (classroom: Group, currentUser: User) => {
        if (!window.confirm(`هل تريد إزالة ${currentUser.name} من إشراف فصل ${classroom.name}؟`)) return;
        void handleRemoveSchoolSupervisor(currentUser.id, classroom.id);
    };

    return {
        handleAssignSchoolSupervisor,
        handleRemoveSchoolSupervisor,
        handleAssignStudentToClass,
        handleRemoveStudentScope,
        confirmRemoveSchoolWideSupervisor,
        confirmRemoveClassSupervisor,
        handleAssignTeacherToClass,
        handleRemoveTeacherFromClass,
    };
};
