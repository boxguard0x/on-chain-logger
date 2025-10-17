import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OnChainLogger } from "../target/types/on_chain_logger";
import { assert, expect } from "chai";
import {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Connection,
  clusterApiUrl,
} from "@solana/web3.js";

describe("on-chain-logger", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const wallet = provider.wallet.publicKey;
  console.log(wallet.toString());

  const program = anchor.workspace.onChainLogger as Program<OnChainLogger>;

  const getLoggerPda = async (blockNumber: number) => {
    const blockNumberBigInt = BigInt(blockNumber);
    const blockNumberSeed = Buffer.alloc(8); // Allocate 8 bytes for u64
    blockNumberSeed.writeBigUInt64LE(blockNumberBigInt); // Write as little-endian
    const [pda, bump] = await PublicKey.findProgramAddressSync(
      [Buffer.from("logger"), blockNumberSeed],
      program.programId
    );

    return { pda, bump };
  };

  it("Does not initialize without sufficient gas", async () => {
    const blockNumber = 234;
    const newWallet = anchor.web3.Keypair.generate();

    // Check balance on the local cluster
    const balance = await provider.connection.getBalance(newWallet.publicKey);
    // console.log("New wallet balance:", balance);
    assert.equal(balance, 0, "New wallet should have zero balance");

    const { pda, bump } = await getLoggerPda(blockNumber);
    console.log("Does not initialize PDA", pda.toString());

    try {
      await program.methods
        .initializeEventStorage(new anchor.BN(blockNumber))
        .accounts({
          // @ts-ignore
          eventStorage: pda,
          signer: newWallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([newWallet])
        .rpc();
      assert.fail("Transaction should have failed due to insufficient funds");
    } catch (error) {
      console.error("Error:", error);
      if (error.logs) {
        // console.log("Transaction logs:", error.logs);
      }
      assert(
        error.logs &&
          error.logs.some((log) => log.includes("insufficient lamports")),
        "Expected error due to insufficient lamports"
      );
    }
  });

  it("Is initialized!", async () => {
    const signer = wallet;
    const blockNumber = 234;
    const { pda, bump } = await getLoggerPda(blockNumber);
    console.log("Is initialized PDA", pda.toString());
    const tx = await program.methods
      .initializeEventStorage(new anchor.BN(blockNumber))
      .accounts({
        //@ts-ignore
        eventStorage: pda,
        signer,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const eventStorage = await program.account.eventStorage.fetch(pda);
    // console.log(eventStorage);
    assert.equal(
      eventStorage.blockNumber.toNumber(),
      blockNumber,
      "Value should be the same"
    );
    assert.equal(
      eventStorage.signers.length,
      0,
      "Signers vector should be empty"
    );
  });

  it("Fails to intitialize for the same block number", async () => {
    const signer = wallet;
    const blockNumber = 234;
    const { pda, bump } = await getLoggerPda(blockNumber);
    console.log(
      "fail to initialize for the same block number PDA",
      pda.toString()
    );

    try {
      const tx = await program.methods
        .initializeEventStorage(new anchor.BN(blockNumber))
        .accounts({
          //@ts-ignore
          eventStorage: pda,
          signer,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      assert.fail("Fails to intitialize for the same block number");
    } catch (error) {
      console.error("Error:", error);
      if (error.logs) {
        // console.log("Transaction logs:", error.logs);
      }
    }
  });

  it("Successfully logs an event", async () => {
    const signer = wallet;
    const blockNumber = 234;
    const { pda, bump } = await getLoggerPda(blockNumber);
    console.log("Successfully logs event PDA", pda.toString());
    const jsonData = {
      data: "someShii",
      anotherData: "someOtherShii",
    };
    const tx = await program.methods
      .logEvent(
        Buffer.from(JSON.stringify(jsonData)),
        new anchor.BN(blockNumber)
      )
      .accounts({
        //@ts-ignore
        eventStorage: pda,
        signer,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const eventStorage = await program.account.eventStorage.fetch(pda);
    const events = JSON.parse(eventStorage.events.toString());

    expect(events).to.deep.equal(jsonData, "They should be equal");
  });

  it("Fails to log event with invalid block number", async () => {
    const signer = wallet;
    const blockNumber = 234;
    const wrongBlockNumber = 999; // Different from initialized block number
    const { pda, bump } = await getLoggerPda(blockNumber);
    console.log(
      "Fails to log event with invalid block number PDA",
      pda.toString()
    );

    try {
      const jsonData = { data: "testEvent" };
      await program.methods
        .logEvent(
          Buffer.from(JSON.stringify(jsonData)),
          new anchor.BN(wrongBlockNumber) // Use wrong block number
        )
        .accounts({
          //@ts-ignore
          eventStorage: pda,
          signer,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have failed due to invalid block number");
    } catch (error) {
      console.error("Error:", error);
      if (error.logs) {
        console.log("Transaction logs:", error.logs);
      }
      assert(
        error.logs &&
          error.logs.some((log) =>
            log.includes("A seeds constraint was violated.")
          ),
        "Expected error due to InvalidBlockNumber"
      );
    }
  });

  it("Successfully logs an empty event", async () => {
    const signer = wallet;
    const blockNumber = 235; // Use a new block number to avoid conflicts
    const { pda, bump } = await getLoggerPda(blockNumber);
    console.log("Successfully logs empty event PDA", pda.toString());

    // Initialize EventStorage
    await program.methods
      .initializeEventStorage(new anchor.BN(blockNumber))
      .accounts({
        //@ts-ignore
        eventStorage: pda,
        signer,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Log an empty event
    const emptyEvent = Buffer.from([]); // Empty byte array
    await program.methods
      .logEvent(emptyEvent, new anchor.BN(blockNumber))
      .accounts({
        //@ts-ignore
        eventStorage: pda,
        signer,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Verify the empty event was added
    const eventStorage = await program.account.eventStorage.fetch(pda);
    assert.equal(
      eventStorage.events.length,
      1,
      "One event should have been added"
    );
    assert.equal(
      eventStorage.events[0].length,
      0,
      "Event data should be empty"
    );
  });
});
