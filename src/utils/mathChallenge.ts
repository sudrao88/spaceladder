import { secureRandom } from './random';

export type MathOperator = '+' | '-';

export interface MathOperation {
  operandA: number;
  operandB: number;
  operator: MathOperator;
  correctAnswer: number;
}

/**
 * Build a math question tied to a turn's actual numbers. The answer is
 * either the destination tile or the number of spaces moved (a 50/50 coin
 * flip), and the operator is the natural one for that question.
 *
 *   Up   + dest  : `currentTile + spaces = destination`   (addition)
 *   Up   + space : `destination - currentTile = spaces`   (subtraction)
 *   Down + dest  : `currentTile - spaces = destination`   (subtraction)
 *   Down + space : `currentTile - destination = spaces`   (subtraction)
 */
export function generateMathChallenge(currentTile: number, destination: number): MathOperation {
  const goingUp = destination > currentTile;
  const spaces = Math.abs(destination - currentTile);
  const askForDestination = secureRandom() < 0.5;

  if (goingUp) {
    if (askForDestination) {
      return { operandA: currentTile, operandB: spaces, operator: '+', correctAnswer: destination };
    }
    return { operandA: destination, operandB: currentTile, operator: '-', correctAnswer: spaces };
  }

  if (askForDestination) {
    return { operandA: currentTile, operandB: spaces, operator: '-', correctAnswer: destination };
  }
  return { operandA: currentTile, operandB: destination, operator: '-', correctAnswer: spaces };
}
