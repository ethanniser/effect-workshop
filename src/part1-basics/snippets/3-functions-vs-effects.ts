// # 1. ERROR HANDLING

type Function<Args extends any[], T> = (...args: Args) => T;
type SaferFunction<Args extends any[], T, E> = (...args: Args) => T | E;

// discriminating types must be done manually

declare function Foo(): "baz" | "bar" | Error;
const result = Foo();
const error = result instanceof Error;

declare function Foo2(): "baz" | "bar";
const result2 = Foo2();
const error2 = result2 !== "baz";

// composing functions that error is not straightforward
// can't just code the 'happy path' and then handle the error later

type Effect<Value, Error = never> = /* unimportant */ undefined;

declare const foo: Effect<number, never>;
// also the same as Effect<number>

declare const bar: Effect<number, Error>;

// # 2. DEPENDENCIES
type User = any;
type DataBase = any;
type Logger = any;
type Telemetry = any;
declare const db: DataBase;

// import { db } from "./db";
function getUser(id: number): User {
  return db.users.getById(id);
}

// passing in by a parameter is better
function getUser2(db: DataBase, id: number): User {
  return db.users.getById(id);
}

// but usually functions end up looking like this:
function updateEmail(
  db: DataBase,
  logger: Logger,
  telemetry: Telemetry,
  id: number,
  newEmail: string
): User {
  const user = db.users.getById(id);
  db.users.updateEmail(id, newEmail);
  logger.info(`Updated email for user ${id}`);
  telemetry.record("email-updated", { id });
  return user;
}

// effects, like with errors, track requirements on a type level

namespace RequirementsExample {
  type NotFoundError = any;
  declare const db: DataBase;
  declare const mockDb: DataBase;
  declare function provideDependencies<A, E, R, Eff extends Effect<A, E, R>>(
    e: Eff,
    db: DataBase
  ): Effect<A, E, Exclude<R, DataBase>>;

  type Effect<
    Value,
    Error = never,
    Requirement = never
  > = /* unimportant */ undefined;

  declare const getUser: Effect<User, NotFoundError, DataBase>;
  declare const updateEmail: Effect<
    User,
    NotFoundError,
    DataBase | Logger | Telemetry
  >;
  const runnable: Effect<User, NotFoundError, never> = provideDependencies(
    getUser,
    db
  );
  const testable: Effect<User, NotFoundError, never> = provideDependencies(
    getUser,
    mockDb
  );
}

// # 3. SYNC VS ASYNC

type SyncFunction<Args extends any[], T> = (...args: Args) => T;
type AsyncFunction<Args extends any[], T> = (...args: Args) => Promise<T>;

/*
promises kinda suck...
no error type, eager, no way to cancel, no way to combine, no way to retry
*/

declare const baz: Effect<number, Error>;
// not sync, or async, just an effect
// may be async internally, but we no longer have to think about it
// it either is not running, running, or finished with either a value or an error

// # 4. EXECUTION

import { Effect } from "effect";
{
  const foo = () => Date.now();
  console.log(foo); // [Function: foo]
  console.log(foo()); // 1707076796922
  const effectFoo = Effect.sync(() => Date.now());
  console.log(effectFoo);
  // { _id: 'Effect', _op: 'Sync', i0: [Function: foo] }
  console.log(Effect.runSync(effectFoo)); // 1707076796922
}
