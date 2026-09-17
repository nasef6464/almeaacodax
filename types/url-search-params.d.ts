export {};

declare global {
  interface URLSearchParams {
    get(name: 'quizView'): 'quizzes' | 'assignments' | 'mock-exams' | null;
  }
}
