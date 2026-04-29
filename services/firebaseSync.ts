import { useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { useStore } from '../store/useStore';
import { courses as mockCourses, currentUser } from './mockData';
import { Role } from '../types';

export const startFirebaseSync = () => {
    const useRealApi =
      (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_USE_REAL_API !== 'false';

    // When the platform is running against the real backend, Firebase listeners
    // become a second source of truth and can overwrite newer Mongo-backed data.
    if (useRealApi) {
      return () => undefined;
    }

    let unsubCourses: () => void;
    let unsubQuestions: () => void;
    let unsubQuizzes: () => void;
    let unsubUsers: () => void;
    let unsubCurrentUser: () => void;
    let unsubPaths: () => void;
    let unsubLevels: () => void;
    let unsubSubjects: () => void;
    let unsubSections: () => void;
    let unsubNestedSkills: () => void;
    let unsubTopics: () => void;
    let unsubLessons: () => void;
    let unsubLibrary: () => void;
    let unsubGroups: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch current user first to get role
        unsubCurrentUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as any;
            // Ensure Nasef is an admin
            if (userData.email && userData.email.toLowerCase() === "nasef64@gmail.com".toLowerCase()) {
              userData.role = Role.ADMIN;
              // Also update it in Firestore seamlessly if it's not admin
              setDoc(doc(db, 'users', user.uid), { role: Role.ADMIN }, { merge: true }).catch(console.error);
            }

            useStore.setState({ user: userData });
            
            // Now set up other listeners based on role
            const isTeacherOrAdmin = userData.role === Role.TEACHER || userData.role === Role.ADMIN || userData.role === Role.SUPERVISOR;
            const isAdmin = userData.role === Role.ADMIN;

            // Sync Courses
            const coursesQuery = isTeacherOrAdmin ? collection(db, 'courses') : query(collection(db, 'courses'), where('isPublished', '==', true));
            unsubCourses = onSnapshot(coursesQuery, (snapshot) => {
              const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
              if (courses.length > 0) {
                useStore.setState({ courses });
              }
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'courses'));

            // Sync Questions
            unsubQuestions = onSnapshot(collection(db, 'questions'), (snapshot) => {
              const questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
              if (questions.length > 0) {
                useStore.setState({ questions });
              }
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'questions'));

            // Sync Quizzes
            unsubQuizzes = onSnapshot(collection(db, 'quizzes'), (snapshot) => {
              const quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
              if (quizzes.length > 0) {
                useStore.setState({ quizzes });
              }
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'quizzes'));

            // Sync Taxonomy
            unsubPaths = onSnapshot(collection(db, 'paths'), (snapshot) => {
              const pathsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
              if (pathsData.length > 0) {
                // Merge with existing default paths to avoid overwriting them if DB is empty
                useStore.setState(state => {
                  const newPaths = [...state.paths];
                  pathsData.forEach(p => {
                    if (!newPaths.find(exist => exist.id === p.id)) newPaths.push(p);
                  });
                  return { paths: newPaths };
                });
              }
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'paths'));

            unsubLevels = onSnapshot(collection(db, 'levels'), (snapshot) => {
              const levelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
              if (levelsData.length > 0) {
                useStore.setState(state => {
                  const newLevels = [...state.levels];
                  levelsData.forEach(l => {
                    if (!newLevels.find(exist => exist.id === l.id)) newLevels.push(l);
                  });
                  return { levels: newLevels };
                });
              }
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'levels'));

            unsubSubjects = onSnapshot(collection(db, 'subjects'), (snapshot) => {
              const subjectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
              if (subjectsData.length > 0) {
                useStore.setState(state => {
                  const newSubjects = [...state.subjects];
                  subjectsData.forEach(s => {
                    if (!newSubjects.find(exist => exist.id === s.id)) newSubjects.push(s);
                  });
                  return { subjects: newSubjects };
                });
              }
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'subjects'));

            unsubSections = onSnapshot(collection(db, 'sections'), (snapshot) => {
              const sectionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
              if (sectionsData.length > 0) {
                useStore.setState(state => {
                   const newSections = [...state.sections];
                   sectionsData.forEach(s => {
                     if (!newSections.find(exist => exist.id === s.id)) newSections.push(s);
                   });
                   return { sections: newSections };
                });
              }
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'sections'));

            unsubNestedSkills = onSnapshot(collection(db, 'nestedSkills'), (snapshot) => {
              const nestedSkills = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
              if (nestedSkills.length > 0) {
                useStore.setState({ nestedSkills });
              }
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'nestedSkills'));

            unsubTopics = onSnapshot(collection(db, 'topics'), (snapshot) => {
              const topics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
              if (topics.length > 0) {
                useStore.setState({ topics });
              }
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'topics'));

            unsubLessons = onSnapshot(collection(db, 'lessons'), (snapshot) => {
              const lessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
              if (lessons.length > 0) {
                useStore.setState({ lessons });
              }
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'lessons'));

            unsubLibrary = onSnapshot(collection(db, 'libraryItems'), (snapshot) => {
              const libraryItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
              if (libraryItems.length > 0) {
                useStore.setState({ libraryItems });
              }
            }, (error) => handleFirestoreError(error, OperationType.LIST, 'libraryItems'));

            if (isTeacherOrAdmin) {
              unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
                const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
                if (groups.length > 0) {
                  useStore.setState({ groups });
                }
              }, (error) => handleFirestoreError(error, OperationType.LIST, 'groups'));
            } else {
              const studentGroupsQuery = query(collection(db, 'groups'), where('studentIds', 'array-contains', user.uid));
              unsubGroups = onSnapshot(studentGroupsQuery, (snapshot) => {
                const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
                if (groups.length > 0) {
                  useStore.setState({ groups });
                }
              }, (error) => handleFirestoreError(error, OperationType.LIST, 'groups'));
            }

            // Sync Users (only if admin)
            if (isAdmin) {
              unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
                const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
                if (users.length > 0) {
                  useStore.setState({ users });
                }
              }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
            }

            // Seed data if empty (only if admin)
            if (isAdmin) {
              const seedData = async () => {
                try {
                  const coursesSnap = await getDocs(collection(db, 'courses'));
                  if (coursesSnap.empty) {
                    console.log('Seeding courses...');
                    for (const course of mockCourses) {
                      await setDoc(doc(db, 'courses', course.id), course);
                    }
                  }
                } catch (error) {
                  handleFirestoreError(error, OperationType.GET, 'courses');
                }
              };
              seedData();
            }
          } else {
            // If user document doesn't exist, create it (initial login)
            const initialUser = {
              ...currentUser,
              id: user.uid,
              email: user.email,
              name: user.displayName || currentUser.name,
              avatar: user.photoURL || currentUser.avatar,
              role: Role.STUDENT, // Default role
              subscription: {
                  plan: 'free',
                  purchasedCourses: [],
                  purchasedPackages: []
              },
              groupIds: []
            };
            setDoc(doc(db, 'users', user.uid), initialUser).catch(e => handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}`));
          }
        }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}`));

      } else {
        // Unsubscribe from everything when logged out
        if (unsubCourses) unsubCourses();
        if (unsubQuestions) unsubQuestions();
        if (unsubQuizzes) unsubQuizzes();
        if (unsubUsers) unsubUsers();
        if (unsubCurrentUser) unsubCurrentUser();
        if (unsubPaths) unsubPaths();
        if (unsubLevels) unsubLevels();
        if (unsubSubjects) unsubSubjects();
        if (unsubSections) unsubSections();
        if (unsubNestedSkills) unsubNestedSkills();
        if (unsubTopics) unsubTopics();
        if (unsubLessons) unsubLessons();
        if (unsubLibrary) unsubLibrary();
        if (unsubGroups) unsubGroups();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubCourses) unsubCourses();
      if (unsubQuestions) unsubQuestions();
      if (unsubQuizzes) unsubQuizzes();
      if (unsubUsers) unsubUsers();
      if (unsubCurrentUser) unsubCurrentUser();
      if (unsubPaths) unsubPaths();
      if (unsubLevels) unsubLevels();
      if (unsubSubjects) unsubSubjects();
      if (unsubSections) unsubSections();
      if (unsubNestedSkills) unsubNestedSkills();
      if (unsubTopics) unsubTopics();
      if (unsubLessons) unsubLessons();
      if (unsubLibrary) unsubLibrary();
      if (unsubGroups) unsubGroups();
    };
};

export const useFirebaseSync = () => {
  useEffect(() => startFirebaseSync(), []);
};
