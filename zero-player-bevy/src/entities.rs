use std::f32::consts::PI;

use bevy::prelude::*;

use crate::{WORLD_HALF_SIZE, camera::CameraRig};

#[derive(Resource, Default)]
pub(crate) struct SpawnCounter {
    pub(crate) next_id: u32,
}

#[derive(Resource)]
pub(crate) struct GameAssets {
    pub(crate) entity_mesh: Handle<Mesh>,
    pub(crate) entity_materials: Vec<Handle<StandardMaterial>>,
}

#[derive(Component)]
pub(crate) struct AutonomousEntity {
    id: u32,
    home: Vec2,
    radius: f32,
    angular_speed: f32,
    bob_speed: f32,
    bob_height: f32,
    phase: f32,
}

pub(crate) fn spawn_autonomous_entity(
    commands: &mut Commands,
    assets: &GameAssets,
    id: u32,
    home: Vec2,
) {
    let lane = id as f32 + 1.0;
    let phase = lane * 1.731;
    let radius = 2.0 + (id % 5) as f32 * 1.15;
    let angular_speed = if id % 2 == 0 { 0.35 } else { -0.28 } + (id % 3) as f32 * 0.035;
    let material = assets.entity_materials[id as usize % assets.entity_materials.len()].clone();

    commands.spawn((
        Name::new(format!("Autonomous entity {id}")),
        Mesh3d(assets.entity_mesh.clone()),
        MeshMaterial3d(material),
        Transform::from_xyz(home.x + radius, 0.55, home.y),
        AutonomousEntity {
            id,
            home,
            radius,
            angular_speed,
            bob_speed: 1.8 + (id % 4) as f32 * 0.18,
            bob_height: 0.12 + (id % 3) as f32 * 0.035,
            phase,
        },
    ));
}

pub(crate) fn add_entity_at_camera_target(
    mut commands: Commands,
    keyboard: Res<ButtonInput<KeyCode>>,
    assets: Res<GameAssets>,
    mut counter: ResMut<SpawnCounter>,
    rig: Res<CameraRig>,
) {
    if keyboard.just_pressed(KeyCode::KeyN) {
        spawn_autonomous_entity(&mut commands, &assets, counter.next_id, rig.target_xz());
        counter.next_id += 1;
    }
}

pub(crate) fn animate_entities(
    time: Res<Time>,
    mut query: Query<(&AutonomousEntity, &mut Transform)>,
) {
    let elapsed = time.elapsed_secs();

    for (entity, mut transform) in &mut query {
        let angle = entity.phase + elapsed * entity.angular_speed;
        let drift = entity.phase * 0.31 + elapsed * 0.22;
        let x = entity.home.x + angle.cos() * entity.radius + drift.sin() * 0.55;
        let z = entity.home.y + angle.sin() * entity.radius * 0.72 + drift.cos() * 0.45;
        let y = 0.58 + (elapsed * entity.bob_speed + entity.phase).sin() * entity.bob_height;
        let tilt = (elapsed * 1.4 + entity.phase).sin() * 0.18;

        transform.translation = Vec3::new(
            x.clamp(-WORLD_HALF_SIZE + 0.8, WORLD_HALF_SIZE - 0.8),
            y,
            z.clamp(-WORLD_HALF_SIZE + 0.8, WORLD_HALF_SIZE - 0.8),
        );
        transform.rotation = Quat::from_rotation_y(-angle + entity.id as f32 * PI * 0.05)
            * Quat::from_rotation_x(tilt);
    }
}
