mod camera;
mod entities;
mod scene;
mod ui;

use bevy::{prelude::*, window::PresentMode};
use camera::{CameraRig, camera_controls};
use entities::{SpawnCounter, add_entity_at_camera_target, animate_entities};
use scene::setup;
use ui::update_status_text;

pub(crate) const WORLD_HALF_SIZE: f32 = 18.0;
pub(crate) const INITIAL_ENTITY_COUNT: u32 = 8;

fn main() {
    App::new()
        .insert_resource(ClearColor(Color::srgb(0.035, 0.045, 0.055)))
        .insert_resource(CameraRig::default())
        .insert_resource(SpawnCounter::default())
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "Zero-Player Orbit Garden".into(),
                resolution: (1280, 720).into(),
                present_mode: PresentMode::AutoVsync,
                ..default()
            }),
            ..default()
        }))
        .add_systems(Startup, setup)
        .add_systems(
            Update,
            (
                camera_controls,
                add_entity_at_camera_target,
                animate_entities,
                update_status_text,
            ),
        )
        .run();
}
