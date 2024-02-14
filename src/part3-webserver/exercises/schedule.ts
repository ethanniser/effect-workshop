// cron something

// schedule that repeats 3 times, on a 25ms linear backoff,
// then goes to a on a 100ms exponential backoff with factor 2
// then a fixed 1s delay until the repeated effect returns a number that is divisible by 27
// AND: for that final stage, each time the number is not divisible by 27, it should log the number
