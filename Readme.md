# On-Chain Logger

This is a Solana program in Rust using the Anchor framework as one of my projects to explore on-chain data storage. The idea is to let a leader validator call this program when a new block is created, storing and logging events tied to that specific block number. I like to think of it as a simple blockchain logbook!

## What It Does

My program has two main functions:
1. **Initialize Event Storage**: I can set up a storage account to hold events for a specific block number.
2. **Log Event**: I can add event data (like messages or bytes) to that storage.

It also includes checks to make sure I don’t use the wrong block number or overload the storage.

## How It Works

### Files
- **Program Code**: The Rust code I wrote is the core of the program. I used Anchor because it simplifies Solana development for me.
- **Accounts**: I created an `EventStorage` account to store:
  - The block number (to track which block my events belong to).
  - A list of events (stored as `Vec<Vec<u8>>`, basically a list of byte arrays).
  - A `bump` value (for Solana’s Program-Derived Address, or PDA).
- **Errors**: If I make a mistake, the program throws errors like `InvalidBlockNumber` (if I try to log an event for the wrong block) or `EventStorageFull` (if I add too many events).

### Functions
1. **initialize_event_storage**:
   - I use this to create a new `EventStorage` account.
   - It sets the block number and starts an empty list for events.
   - It requires a signer (that’s me, covering the transaction cost) and the Solana system program.

2. **log_event**:
   - This lets me add a new event (data in bytes) to the `EventStorage` account.
   - It checks that the block number matches the one in the storage.
   - It logs a message to confirm my event was added.

### Key Details
- I tied the `EventStorage` account to a specific block number using a PDA. The account’s address is created with the block number and a seed (`b"logger"`).
- My `events` list can hold up to 100 events, each up to 100 bytes (set with `#[max_len(100, 100)]`).
- I used Anchor’s `msg!` macro to log messages for easier debugging.

## How I Use It

1. **Set Up My Environment**:
   - I’ve got Rust and the Solana CLI installed from my previous projects.
   - I use Anchor (check the [Anchor website](https://www.anchor-lang.com/) if you need setup help).
   - I make sure my Solana wallet has some SOL for testing.

2. **Deploy My Program**:
   - I build it with `anchor build`.
   - Then I deploy it to Solana (usually on devnet) with `anchor deploy`.

3. **Interact with My Program**:
   - I use a client (like a JavaScript/TypeScript script with `@solana/web3.js` and `@project-serum/anchor`) to call the program.
   - First, I call `initialize_event_storage` with a block number to set