use anchor_lang::prelude::*;

declare_id!("B5XNLjvDHkacwCASVVpo1EGK9L4AA7c7WdmX5qFrKLGH");

#[program]
pub mod on_chain_logger {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
