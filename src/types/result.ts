import type { AppError } from "../types";

/**
 * Discriminated union representing a successful outcome `Ok<T>`.
 */
export type Ok<T> = {
  readonly ok: true;
  readonly value: T;
};

/**
 * Discriminated union representing a failed outcome `Err<E>`.
 */
export type Err<E> = {
  readonly ok: false;
  readonly error: E;
};

/**
 * Type-safe functional Result type for operations that may fail.
 */
export type Result<T, E = AppError> = Ok<T> | Err<E>;

/**
 * Construct an Ok result containing `value`.
 */
export const Ok = <T>(value: T): Ok<T> => ({
  ok: true,
  value
});

/**
 * Construct an Err result containing `error`.
 */
export const Err = <E>(error: E): Err<E> => ({
  ok: false,
  error
});

/**
 * Type Guard checking if a Result is Ok<T>.
 */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok;

/**
 * Type Guard checking if a Result is Err<E>.
 */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok;

/**
 * Unwraps a Result value or returns a default fallback value.
 */
export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

/**
 * Maps a successful Result value using mapper function `fn`.
 */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (val: T) => U): Result<U, E> {
  return result.ok ? Ok(fn(result.value)) : result;
}
