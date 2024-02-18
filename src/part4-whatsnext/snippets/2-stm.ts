import { Console, Effect, STM, TRef, pipe } from "effect";

// Many times we want to share state between different parts of our application.
// and its crucial that updates to this state are atomic and consistent.
// The STM module provides a way to do this. Its a port of the Haskell STM
// and features a api that is very similar to the one your used to in effect.
// instead of a Effect<A, E, R> to represent a program with side effects,
// we have a STM<A, E, R> to represent a transaction.
// No side effects are allowed in a transaction, only pure computations and updates to state.

// just like how creating an effect does not run it, creating a transaction does not run it.
// only when we `commit` the transaction does it run
// if any of the computations in the transaction fail, the transaction is rolled back and retried.

// Think of STM like a completely seperate world from the rest of your program.
// When you commit a transaction, even if it is made up of many different computations,
// To the rest of your program it looks like a single atomic operation.

// You can think of this like how the function passed to `Effect.sync` gets run
// It is guaranteed to run until it completes or fails, in one single synchronous step.
// STM is like writing in the effect style, with tracked errors and dependencies but with this same guarantee.
// But now with the additional guarantee that if there is a failure, the whole transaction is rolled back.

// Technically 'rolled back' is not the right term, because the transaction is not actually run until it is committed
// so its more like all of the queued up operations are just thrown away.

// STM doesnt work on any state, but effect provides `T_` variants of many of its data types
// the core of these is `TRef` which is a transactional reference to a value.

// just like how get/set/update operations on a Ref return an Effect
// the same operations on a TRef return an STM

const program = Effect.gen(function* (_) {
  const ref = yield* _(TRef.make(0));

  const transaction = pipe(
    TRef.get(ref),
    STM.flatMap((i) => TRef.set(ref, i + 1))
  );

  const value = yield* _(STM.commit(TRef.get(ref)));
  console.log(value); // 0

  yield* _(STM.commit(transaction));
  const value2 = yield* _(STM.commit(TRef.get(ref)));
  console.log(value2); // 1
});

// Also the `commit` is actually optional,
// STMs are a subtype of Effect and commit is basically used internally if you omit it

// lets take a look at a more complex example

// First out data model, an account with a balance that is stored in a TRef

interface Account {
  id: number;
  balance: TRef.TRef<number>;
}

class InsufficientFundsError {
  readonly _tag = "InsufficientFundsError";
}

const createAccount = (id: number, initialBalance: number): STM.STM<Account> =>
  TRef.make(initialBalance).pipe(STM.map((balance) => ({ id, balance })));

const transfer = (
  from: Account,
  to: Account,
  amount: number
): STM.STM<void, InsufficientFundsError> =>
  STM.gen(function* (_) {
    const fromBalance = yield* _(TRef.get(from.balance));
    const toBalance = yield* _(TRef.get(to.balance));

    if (fromBalance < amount) {
      yield* _(STM.fail(new InsufficientFundsError()));
    }

    yield* _(TRef.set(from.balance, fromBalance - amount));
    yield* _(TRef.set(to.balance, toBalance + amount));
  });

const main = Effect.gen(function* (_) {
  const account1 = yield* _(createAccount(1, 1000));
  const account2 = yield* _(createAccount(2, 500));
  const account3 = yield* _(createAccount(3, 200));

  // Concurrent transfers
  const transfer1 = STM.commit(transfer(account1, account2, 200));
  const transfer2 = STM.commit(transfer(account2, account1, 300));

  // Execute transfers concurrently
  yield* _(Effect.all([transfer1, transfer2], { concurrency: "unbounded" }));

  // Check final balances
  const finalBalance1 = yield* _(STM.commit(TRef.get(account1.balance)));
  const finalBalance2 = yield* _(STM.commit(TRef.get(account2.balance)));

  yield* _(Effect.log(`Final Balance Account 1: ${finalBalance1}`));
  yield* _(Effect.log(`Final Balance Account 2: ${finalBalance2}`));

  const badTransaction = STM.all([
    transfer(account1, account2, 1000), // this also wont go through because the next one fails
    transfer(account3, account1, 300),
    transfer(account1, account3, 400), // this wont go through because the first one will fail
  ]);

  yield* _(
    STM.commit(badTransaction),
    Effect.catchAll((error) => Console.error(error._tag))
  );

  const finalBalance3 = yield* _(STM.commit(TRef.get(account3.balance)));
  yield* _(Effect.log(`Final Balance Account 3: ${finalBalance3}`)); // this is the original amount
});

// Effect.runPromise(main);

// STM transactions usually aren't very big
// They only need to be as large, as you need to ensure atomicity and consistency
// Like is this example the 'badTransaction' should really be seperate transactions
// because they are not related to each other, so theres no reason to make them atomic together

// an example where multiple transactions are related is maybe we have an account with a minimum balance
// and some unknown transactions. We want to apply the process but at no point can the account go under the minimum balance

const example = Effect.gen(function* (_) {
  const account1 = yield* _(createAccount(1, 1000));
  const account2 = yield* _(createAccount(2, 500));
  const account3 = yield* _(createAccount(3, 200));

  const transfers = STM.all([
    transfer(account1, account2, 1000),
    transfer(account2, account3, 500),
    transfer(account3, account1, 400),
  ]);

  // we want to ensure that account1 never goes under 700

  const ensuringMinimumBalance = STM.gen(function* (_) {
    yield* _(transfers); // run the transfers
    const balance = yield* _(TRef.get(account1.balance));
    if (balance < 700) {
      return yield* _(STM.fail(new InsufficientFundsError()));
    }
  });

  yield* _(
    STM.commit(ensuringMinimumBalance),
    Effect.catchAll((error) => Console.error(error._tag))
  );
});

// Effect.runPromise(example); // all transactions roll back because our final check fails

// what guarantees does STM give us?
// 1. Atomicity: Each transfer operation is atomic. If any part of the transfer fails (e.g., due to insufficient funds),
// the whole transaction is rolled back, ensuring account balances are never left in an inconsistent state.
// 2. Consistency: The STM ensures the consistency of the bank system by making sure all operations either
// complete fully or have no effect, maintaining the invariant that the total amount of money in the system remains constant.
// 3. Isolation: Each transfer operation is isolated from others.
// Intermediate states during a transfer are not visible to other transactions, preventing any inconsistent reads.

// STM is a powerful tool for managing shared state in a concurrent environment.
// It enabled these benefits without locks, and is a powerful tool for managing shared state in a concurrent environment.
// Because js is single threaded, we can be 100% sure when we commit a transaction,
// it will run to completion without any other transactions running in between.

// one final note about immutablity and STM
// immutability is what enables STM to work, because it roles back to a previous state
// because it can be sure that those previous states have not been modified

const mutabilityBad = Effect.gen(function* (_) {
  const ref = yield* _(TRef.make(new Date()));

  const transaction = pipe(
    // DONT DO THIS !!!
    TRef.update(ref, (date) => {
      date.setMonth(date.getMonth() + 1);
      return date;
    }),
    STM.zipRight(STM.fail(new Error("Boom!")))
  );

  const before = yield* _(STM.commit(TRef.get(ref)));
  yield* _(
    STM.commit(transaction),
    Effect.catchAll((error) => Console.error(error.message))
  );
  const after = yield* _(STM.commit(TRef.get(ref)));

  console.log(before.toUTCString(), after.toUTCString());
});

Effect.runPromise(mutabilityBad);

// This is a contrived example, but it shows that if you have a mutable reference
// you basically lose all the guarantees of STM, so be careful with your data model
