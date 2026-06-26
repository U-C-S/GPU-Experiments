# Zero-Player Bevy

A tiny top-down 3D zero-player sandbox built with Bevy.

The scene contains autonomous orbiting entities. There is no player-controlled
character; input only moves the camera or inserts another autonomous entity.

## Graphics backend

This uses Bevy's default renderer, wgpu. That is the portable choice here:
wgpu selects Metal on macOS and DirectX 12 or Vulkan on Windows depending on
the machine, so the same Rust code can be developed and playtested on both.

## Run

```sh
cd zero-player-bevy
cargo run
```

Bevy 0.19 requires Rust 1.95 or newer.

## Controls

- `WASD` or arrow keys: pan the camera target across the board.
- Hold right mouse and drag: rotate yaw and pitch.
- Hold middle mouse and drag: pan.
- Mouse wheel: zoom.
- `Q` / `E`: rotate the camera.
- `R` / `F`: pitch the camera within the top-down limits.
- Hold `Shift`: faster keyboard camera movement.
- `N`: add one autonomous entity at the current camera target.
