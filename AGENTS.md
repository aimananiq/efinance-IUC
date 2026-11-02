# Architecture
- Non-student payments use a separate owner-scoped table and validated authenticated submission RPC, so they never alter student balances or receipts.
- Outside payers use email authentication without a profile or role; payment details belong to each submission.