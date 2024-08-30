import { logger } from "./logger";
import readline from "node:readline/promises";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

interface UserInput {
  id: string;
  question: string;
  answer: string;
}

const USER_INPUT_FILE = "ts-debug.json";
const QUESTIONS_FILE = "questions.txt";

export async function promptUser(
  question: string,
  id: string,
): Promise<string> {
  const savedAnswer = await loadUserInput(id);
  if (savedAnswer) {
    logger.info(`Using saved answer for "${question}": ${savedAnswer}`);
    return savedAnswer;
  }

  const answer = await rl.question(`${question} `);
  await saveUserInput(id, question, answer);
  return answer;
}

async function saveUserInput(
  id: string,
  question: string,
  answer: string,
): Promise<void> {
  const userInput: UserInput = { id, question, answer };
  let existingInputs: UserInput[] = [];

  try {
    const content = await fs.readFile(USER_INPUT_FILE, "utf-8");
    existingInputs = JSON.parse(content);
  } catch (error) {
    // File doesn't exist or is empty, start with an empty array
  }

  const index = existingInputs.findIndex((input) => input.id === id);
  if (index !== -1) {
    existingInputs[index] = userInput;
  } else {
    existingInputs.push(userInput);
  }

  await fs.writeFile(USER_INPUT_FILE, JSON.stringify(existingInputs, null, 2));
  logger.info(`Saved user input for "${question}"`);

  await updateQuestionsFile(id, question);
}

async function loadUserInput(id: string): Promise<string | null> {
  try {
    const content = await fs.readFile(USER_INPUT_FILE, "utf-8");
    const inputs: UserInput[] = JSON.parse(content);
    const input = inputs.find((i) => i.id === id);
    return input ? input.answer : null;
  } catch (error) {
    return null;
  }
}

async function updateQuestionsFile(
  id: string,
  question: string,
): Promise<void> {
  let questions: string[] = [];

  try {
    const content = await fs.readFile(QUESTIONS_FILE, "utf-8");
    questions = content.split("\n").filter((q) => q.trim() !== "");
  } catch (error) {
    // File doesn't exist or is empty, start with an empty array
  }

  const questionEntry = `${id}: ${question}`;
  if (!questions.includes(questionEntry)) {
    questions.push(questionEntry);
    await fs.writeFile(QUESTIONS_FILE, questions.join("\n"));
    logger.info(`Updated ${QUESTIONS_FILE} with new question`);
  }
}

export async function clearUserInputs(): Promise<void> {
  try {
    await fs.unlink(USER_INPUT_FILE);
    logger.info(`Cleared user inputs from ${USER_INPUT_FILE}`);
  } catch (error) {
    // File doesn't exist, ignore
  }

  try {
    await fs.unlink(QUESTIONS_FILE);
    logger.info(`Cleared questions from ${QUESTIONS_FILE}`);
  } catch (error) {
    // File doesn't exist, ignore
  }
}

// Example usage
async function main() {
  const answer1 = await promptUser("What is your name?", "user_name");
  logger.info(`Hello, ${answer1}!`);

  const answer2 = await promptUser(
    "What is your favorite color?",
    "favorite_color",
  );
  logger.info(`Your favorite color is ${answer2}.`);

  await clearUserInputs();

  rl.close();
}

const __filename = fileURLToPath(import.meta.url);
if (__filename === process.argv[1]) {
  main();
}
