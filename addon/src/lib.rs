use neon::prelude::*;

mod everything;

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    everything::export(&mut cx)
}
