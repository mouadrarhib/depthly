type SupabaseErrorLike = { message: string }

const FRIENDLY_RPC_ERRORS: Record<string, string> = {
  PROJECT_LIMIT_REACHED: 'Free accounts can have up to 3 active projects.',
  SESSION_LIMIT_REACHED: 'You have reached the Free plan limit of 50 focus sessions this month.',
  PLAN_REQUIRED: 'This feature requires a Pro plan.',
  PROFILE_FIELD_NOT_ALLOWED: 'That profile field cannot be changed from the app.',
  PROFILE_SLUG_TAKEN: 'That profile URL is already taken.',
  PROFILE_SLUG_INVALID: 'Use 3–50 lowercase letters, numbers, or hyphens.',
  ACTIVE_TIMER_EXISTS: 'An active timer already exists.',
}

export function toAppError(error: SupabaseErrorLike): Error {
  return new Error(FRIENDLY_RPC_ERRORS[error.message] ?? error.message)
}
