import { Console, Effect, TxRef, pipe } from "effect";

/**
 * Many times we want to share state between different parts of our application.
 * and its crucial that updates to this state are *atomic* and *consistent*.
 *
 * Effect v4 replaced the old `STM` module with transactional Effects.
 * You write plain effects, but read and write `TxRef` (transactional references)
 * inside them. Wrapping such an effect with `Effect.tx` makes the whole block
 * run as a single atomic transaction: if it fails, all TxRef updates are rolled back.
 *
 * The core of these is `TxRef` which is a transactional reference to a value.
 *
 * just like how get/set/update operations on a Ref return an Effect,
 * the same operations on a TxRef return Effects too - but they participate
 * in the current transaction (if any).
 */

const program = Effect.gen(function* () {
  const ref: TxRef.TxRef<number> = yield* TxRef.make(0);

  const transaction = pipe(
    TxRef.get(ref),
    Effect.flatMap((i) => TxRef.set(ref, i + 1))
  );

  const value: number = yield* TxRef.get(ref);
  console.log(value); // 0

  yield* Effect.tx(transaction); // Commits this transaction atomically.
  const value2: number = yield* TxRef.get(ref);
  console.log(value2); // 1
});

/**
 * Running an effect that touches TxRefs outside of `Effect.tx` still works -
 * each operation is then committed on its own.
 *
 * ---
 *
 * Let's take a look at a more complex example
 *
 * First out data model, an account with a balance that is stored in a TxRef
 */

interface Account {
  id: number;
  balance: TxRef.TxRef<number>;
}

class InsufficientFundsError {
  readonly _tag = "InsufficientFundsError";
}

const createAccount = (
  id: number,
  initialBalance: number
): Effect.Effect<Account> =>
  TxRef.make(initialBalance).pipe(Effect.map((balance) => ({ id, balance })));

const transfer = (
  from: Account,
  to: Account,
  amount: number
): Effect.Effect<void, InsufficientFundsError> =>
  Effect.gen(function* () {
    const fromBalance: number = yield* TxRef.get(from.balance);
    const toBalance: number = yield* TxRef.get(to.balance);

    if (fromBalance < amount) {
      return yield* Effect.fail(new InsufficientFundsError());
    }

    /**
     * From a domain perspective, changing the balance of the accounts (from and to) should be an atomic and consistent Transaction.
     * if one of the two operations fails, both should fail and the state should be rolled back.
     */
    yield* TxRef.set(from.balance, fromBalance - amount);
    yield* TxRef.set(to.balance, toBalance + amount);
  });

const main = Effect.gen(function* () {
  const account1 = yield* createAccount(1, 1000);
  const account2 = yield* createAccount(2, 500);
  const account3 = yield* createAccount(3, 200);

  /**
   * Concurrent transfers
   */
  const transfer1: Effect.Effect<void, InsufficientFundsError, never> =
    Effect.tx(transfer(account1, account2, 200));

  const transfer2: Effect.Effect<void, InsufficientFundsError, never> =
    Effect.tx(transfer(account2, account1, 300));

  /**
   * Execute transfers concurrently
   */
  yield* Effect.all([transfer1, transfer2], { concurrency: "unbounded" });

  /**
   * Check final balances
   */
  const finalBalance1: number = yield* TxRef.get(account1.balance);
  const finalBalance2: number = yield* TxRef.get(account2.balance);

  yield* Effect.log(`Final Balance Account 1: ${finalBalance1}`);
  yield* Effect.log(`Final Balance Account 2: ${finalBalance2}`);

  const badTransaction = Effect.all([
    transfer(account1, account2, 1000), // this also won't go through because the next one fails
    transfer(account3, account1, 300),
    transfer(account1, account3, 400), // this won't go through because the first one will fail
  ]);

  yield* pipe(
    Effect.tx(badTransaction),
    Effect.catch((error) => Console.error(error._tag))
  );

  const finalBalance3: number = yield* TxRef.get(account3.balance);
  yield* Effect.log(`Final Balance Account 3: ${finalBalance3}`); // this is the original amount
});

// Effect.runPromise(main);

/**
 * STM transactions Shouldn't be very big:
 * They should only be as large as you need them to be to ensure atomicity and consistency.
 *
 * Like this example, the 'badTransaction' should really be separate transactions
 * because they are not related to each other, so there's no reason to make them atomic together.
 *
 * ---
 *
 * An example where multiple transactions are related is maybe we have an account
 * with a minimum balance and some unknown transactions.
 * We want to apply the process, but at no point can the account go under the minimum balance.
 */

const example = Effect.gen(function* () {
  const account1 = yield* createAccount(1, 1000);
  const account2 = yield* createAccount(2, 500);
  const account3 = yield* createAccount(3, 200);

  const transfers = Effect.all([
    transfer(account1, account2, 1000),
    transfer(account2, account3, 500),
    transfer(account3, account1, 400),
  ]);

  // we want to ensure that account1 never goes under 700

  const ensuringMinimumBalance = Effect.gen(function* () {
    yield* transfers; // run the transfers
    const balance = yield* TxRef.get(account1.balance);
    if (balance < 700) {
      return yield* Effect.fail(new InsufficientFundsError());
    }
  });

  yield* pipe(
    Effect.tx(ensuringMinimumBalance),
    Effect.catch((error) => Console.error(error._tag))
  );
});

// Effect.runPromise(example); // all transactions roll back because our final check fails

/**
 * Q: What guarantees does STM give us?
 *
 * 1. Atomicity: Each transfer operation is atomic.
 * 		If any part of the transfer fails (e.g., due to insufficient funds),
 * 		the whole transaction is rolled back, ensuring account balances are never
 * 		left in an inconsistent state.
 * 2. Consistency:
 * 		The STM ensures the consistency of the bank system by making sure all
 * 		operations either complete fully or have no effect, maintaining the
 * 		invariant that the total amount of money in the system remains constant.
 * 3. Isolation: Each transfer operation is isolated from others.
 * 		Intermediate states during a transfer are not visible to other
 * 		transactions, preventing any inconsistent reads.
 *
 * Transactions are a powerful tool for managing shared state in a concurrent environment.
 * They enabled these benefits without locks.
 * Because js is single threaded, we can be 100% sure when we commit a
 * transaction, it will run to completion without any other transactions running
 * in between.
 *
 * One final note about immutability and transactions.
 * Immutability is what enables them to work, because rolling back to a previous state
 * is only possible when those previous states have not been modified.
 */

const mutabilityBad = Effect.gen(function* () {
  const ref: TxRef.TxRef<Date> = yield* TxRef.make(new Date());

  const transaction = pipe(
    // DONT DO THIS !!!
    TxRef.update(ref, (date) => {
      date.setMonth(date.getMonth() + 1);
      return date;
    }),
    Effect.andThen(Effect.fail(new Error("Boom!")))
  );

  const before: Date = yield* TxRef.get(ref);
  yield* pipe(
    Effect.tx(transaction),
    Effect.catch((error) => Console.error(error.message))
  );
  const after: Date = yield* TxRef.get(ref);

  console.log(before.toUTCString(), after.toUTCString());
});

Effect.runPromise(mutabilityBad);

/**
 * This is a contrived example, but it shows that if you have a mutable reference,
 * you basically lose all the guarantees of transactions, so be careful with your data model.
 */
