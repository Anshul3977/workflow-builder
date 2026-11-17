/** Character caps enforced by POST /api/workflows. Guests are capped lower than signed-in users. */
export const DEMO_INPUT_MAX = 2_000
export const USER_INPUT_MAX = 8_000

export function inputLimit(isGuest: boolean): number {
  return isGuest ? DEMO_INPUT_MAX : USER_INPUT_MAX
}

/** True when the trimmed input would be rejected by the run route. */
export function inputTooLong(text: string, isGuest: boolean): boolean {
  return text.trim().length > inputLimit(isGuest)
}
