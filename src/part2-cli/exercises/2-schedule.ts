import { Duration, Schedule, Effect, pipe } from "effect";

// Exercise 1
// Write a function to create a schedule from this simplified cron syntax:
type Cron = {
  minutes: number;
  hours: number;
  days: number;
};

function cronToSchedule({
  minutes,
  hours,
  days,
}: Cron): Schedule.Schedule<unknown> {
  return Schedule.forever;
}

// Not really sure how to write a test for this one, but good luck!

// Exercise 2
// Write a schedule that repeats 3 times, on a 25ms linear backoff,
// then goes to a on a 100ms exponential backoff with factor 2, until the delay is greater than 1s,
// then a fixed 1s delay until the repeated effect returns a number that is divisible by 27
// AND: for that final stage it should log "IM DIVISBLE BY 27 - <number>" for each iteration

const finalSchedule = Schedule.forever;

const effect = Effect.succeed(1);
Effect.repeat(effect, finalSchedule);

// Again, not really sure how to write a test for this one, but good luck!
