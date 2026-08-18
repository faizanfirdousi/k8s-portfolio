---
title: "Verifying Database ACID Guarantees with Go"
date: "2025-03-30"
excerpt: "How to programmatically test Atomicity, Consistency, Isolation, and Durability in PostgreSQL using concurrency and real transactions in Go."
tags: ["go", "databases", "postgres", "concurrency"]
---

# Verifying Database ACID Guarantees with Go

ACID is one of the most fundamental concepts in relational database systems, representing **Atomicity, Consistency, Isolation, and Durability**.

Instead of treating ACID as theoretical definitions in textbooks, writing automated stress tests and transaction runners in Go helps uncover how databases handle real-world edge cases like concurrent writes and uncommitted states.

## 1. Atomicity: All or Nothing

Atomicity guarantees that all operations within a transaction either succeed completely or get fully rolled back upon failure.

In Go, we test this by initiating a transaction that inserts a valid record followed by a deliberate syntax error or duplicate key violation:

```go
tx, err := db.BeginTx(ctx, nil)
if err != nil {
    log.Fatal(err)
}

_, err = tx.ExecContext(ctx, "INSERT INTO accounts (id, balance) VALUES ($1, $2)", 1, 500)
if err != nil {
    tx.Rollback()
    return
}

// Deliberate failure (violating check constraint or syntax)
_, err = tx.ExecContext(ctx, "INSERT INTO accounts (id, balance) VALUES ($1, $2)", 1, -999)
if err != nil {
    // Expected error: rollback entire transaction
    tx.Rollback()
} else {
    tx.Commit()
}

// Verify that id=1 was NOT inserted
```

## 2. Consistency: Invariants & Constraints

Consistency ensures that a database transitions from one valid state to another, satisfying all schema constraints (foreign keys, check constraints, unique indexes).

When executing concurrent operations that decrement balances or update inventory, constraints act as safety nets preventing invalid database states.

## 3. Isolation: Concurrent Transaction Execution

Isolation levels (such as `Read Committed`, `Repeatable Read`, and `Serializable`) dictate how concurrently executing transactions interact and whether anomalies like dirty reads, non-repeatable reads, or phantom reads can occur.

By spinning up multiple goroutines that execute interleaved transactions simultaneously, we can measure how PostgreSQL handles row-level locking and transaction serialization conflicts:

```go
var wg sync.WaitGroup
for i := 0; i < 10; i++ {
    wg.Add(1)
    go func(workerID int) {
        defer wg.Done()
        // Execute concurrent transfer transaction
    }(i)
}
wg.Wait()
```

## 4. Durability: Committed Data Remains Safe

Durability ensures that once a transaction commits, its changes survive power loss or crashes, typically backed by write-ahead logs (WAL).

## Conclusion

Testing database properties with real Go code reinforces system architecture understanding far better than reading specifications alone.
