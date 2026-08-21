import { Console, Effect, Schedule } from "effect";

/**
 * A schedule is a value that describes the repetition of an effectful operation.
 * The schedule type: `Schedule<Out, In = unknown, Env = never>`
 * Requires an environment `Env`, takes an input `In` and returns an output `Out`
 *
 *
 * Schedules can be used to either: repeat an effect that succeeds, or retry an effect that fails.
 */

/**
 * Schedules have a few basic constructors
 */
Schedule.recurs(1); // once
Schedule.forever;
Schedule.recurs(5);
Schedule.spaced("1 seconds");
Schedule.fixed("1 seconds");
// how might these two schedules differ?
Schedule.exponential("1 seconds", 1.2);
Schedule.fibonacci("1 seconds");
Schedule.during("30 seconds"); // keep recurring for a duration

// using input (most often the result or error of the effect) to determine the next repetition
declare const isRetryable: (n: number) => boolean;
Schedule.recurs(5).pipe(
  Schedule.setInputType<number>(),
  Schedule.while(({ input }) => isRetryable(input))
);
// many more possibilities here

/**
 * specifying output
 */
Schedule.map(Schedule.spaced("1 seconds"), (attempts) => attempts);
// again, many more possibilities here

/**
 * Schedules are composable
 * `min` continues while ANY of the schedules continue (fastest delay wins)
 * `max` continues while ALL of the schedules continue (slowest delay wins)
 */

Schedule.min([
  Schedule.spaced("1 seconds"),
  Schedule.exponential("200 millis", 1.2)
]);

Schedule.max([
  Schedule.spaced("1 seconds"),
  Schedule.exponential("200 millis", 1.2)
]);

Schedule.concat(Schedule.recurs(5), Schedule.spaced("1 seconds"));

/**
 * using output: filtering + tapping
 */
Schedule.spaced("1 seconds").pipe(
  Schedule.while(({ duration }) => duration !== undefined)
);
Schedule.tap(Schedule.spaced("1 seconds"), (meta) =>
  Console.log(meta.duration)
);

/**
 * Using schedules
 */
const schedule = Schedule.spaced("1 seconds");
const effect = Console.log("Hello, world!");
let counter = 0;
const errors =
  counter < 5 ? Effect.failSync(() => counter++) : Effect.succeed("success");

/**
 * repeating an effect
 */
Effect.repeat(effect, schedule);

/**
 * retrying an effect
 */
Effect.retry(errors, schedule);

/**
 * These both have shorthand methods for basic schedules
 */
Effect.repeat(effect, { times: 5 });
Effect.repeat(
  Effect.sync(() => Date.now()),
  { while: (n) => n < Date.now() + 1000 }
);

/**
 * specify a fallback if a effect still hasn't succeeded after the schedule is exhausted
 */
Effect.retryOrElse(Effect.fail(0), Schedule.recurs(5), (error) =>
  Effect.succeed(error)
);
