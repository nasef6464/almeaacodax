import fs from "node:fs";

const source = fs.readFileSync("server/src/routes/quizResults.routes.ts", "utf8");

const myRouteIndex = source.indexOf('"/quiz-results/my"');
const idRouteIndex = source.indexOf('"/quiz-results/:id"');

if (myRouteIndex === -1) {
  throw new Error("Missing /quiz-results/my route.");
}

if (idRouteIndex === -1) {
  throw new Error("Missing /quiz-results/:id route.");
}

if (myRouteIndex > idRouteIndex) {
  throw new Error("/quiz-results/my must be declared before /quiz-results/:id to avoid treating 'my' as an id.");
}

console.log("Quiz results route order contract passed.");
