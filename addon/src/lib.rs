use neon::prelude::*;

mod everything;
mod text_preview;

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    everything::export(&mut cx)?;
    text_preview::export(&mut cx)?;
    Ok(())
}
