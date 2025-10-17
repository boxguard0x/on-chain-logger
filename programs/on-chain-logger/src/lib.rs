use anchor_lang::prelude::*;

declare_id!("B5XNLjvDHkacwCASVVpo1EGK9L4AA7c7WdmX5qFrKLGH");

#[program]
pub mod on_chain_logger {
    use super::*;

    pub fn initialize_event_storage(ctx: Context<Initialize>, block_number: u64) -> Result<()> {
        let event_storage = &mut ctx.accounts.event_storage;
        event_storage.block_number = block_number;
        event_storage.events = Vec::new();
        event_storage.bump = ctx.bumps.event_storage;
        msg!("Initialized EventStorage for block: {}", block_number);
        Ok(())
    }

    pub fn log_event(ctx: Context<LogEvent>, event_data: Vec<u8>, block_number: u64) -> Result<()> {
        let event_storage = &mut ctx.accounts.event_storage;
        require!(
            event_storage.block_number == block_number,
            LoggerErrors::InvalidBlockNumber
        );
        event_storage.events.push(event_data);
        msg!("Logged new event for block: {}", block_number);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(block_number: u64)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = signer,
        seeds = [b"logger", block_number.to_le_bytes().as_ref()],
        bump,
        space = 8 + EventStorage::INIT_SPACE
    )]
    pub event_storage: Account<'info, EventStorage>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(block_number: u64)]
pub struct LogEvent<'info> {
    #[account(
        mut,
        seeds = [b"logger", block_number.to_le_bytes().as_ref()],
        bump = event_storage.bump,
    )]
    pub event_storage: Account<'info, EventStorage>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct EventStorage {
    pub block_number: u64,
    #[max_len(100, 100)]
    pub events: Vec<Vec<u8>>,
    pub bump: u8,
    // TODOD: static bytes read up laters
}

#[error_code]
pub enum LoggerErrors {
    #[msg("Invalid Block number")]
    InvalidBlockNumber,

    #[msg("EventStorageFull")]
    EventStorageFull,
}
