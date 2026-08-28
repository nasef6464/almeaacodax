export type PathsManagerSubjectTab = 'courses' | 'skills' | 'questions' | 'exams' | 'library' | 'settings';

type PathsManagerUrlState = {
  selectedPathId: string | null;
  selectedSubjectId: string | null;
  subjectTab: PathsManagerSubjectTab;
};

const subjectTabs: PathsManagerSubjectTab[] = ['courses', 'skills', 'questions', 'exams', 'library', 'settings'];

const getInitialQuery = () => new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.search);

export const resolvePathsManagerUrlState = (): PathsManagerUrlState => {
  const initialQuery = getInitialQuery();
  const requestedSubjectTab = initialQuery.get('subjectTab') || initialQuery.get('courseTab') || initialQuery.get('workspace');

  return {
    selectedPathId: initialQuery.get('path') || null,
    selectedSubjectId: initialQuery.get('subject') || null,
    subjectTab: subjectTabs.includes(requestedSubjectTab as PathsManagerSubjectTab)
      ? (requestedSubjectTab as PathsManagerSubjectTab)
      : 'courses',
  };
};
