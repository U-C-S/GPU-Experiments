use bevy::prelude::*;

use crate::{
    INITIAL_ENTITY_COUNT, WORLD_HALF_SIZE,
    camera::{CameraRig, TopDownCamera, camera_transform},
    entities::{GameAssets, SpawnCounter, spawn_autonomous_entity},
    ui::StatusText,
};

pub(crate) fn setup(
    mut commands: Commands,
    rig: Res<CameraRig>,
    mut counter: ResMut<SpawnCounter>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    commands.insert_resource(GlobalAmbientLight {
        color: Color::srgb(0.64, 0.72, 0.86),
        brightness: 350.0,
        ..default()
    });

    let ground_material = materials.add(StandardMaterial {
        base_color: Color::srgb(0.10, 0.13, 0.12),
        perceptual_roughness: 1.0,
        ..default()
    });
    let line_material = materials.add(StandardMaterial {
        base_color: Color::srgb(0.22, 0.30, 0.28),
        emissive: LinearRgba::new(0.01, 0.02, 0.02, 0.0),
        ..default()
    });
    let rail_material = materials.add(StandardMaterial {
        base_color: Color::srgb(0.70, 0.48, 0.20),
        perceptual_roughness: 0.65,
        ..default()
    });

    commands.spawn((
        Name::new("Board"),
        Mesh3d(
            meshes.add(
                Plane3d::default()
                    .mesh()
                    .size(WORLD_HALF_SIZE * 2.0, WORLD_HALF_SIZE * 2.0),
            ),
        ),
        MeshMaterial3d(ground_material),
    ));

    spawn_grid(&mut commands, &mut meshes, line_material);
    spawn_bounds(&mut commands, &mut meshes, rail_material);
    spawn_lighting(&mut commands);

    let entity_assets = GameAssets {
        entity_mesh: meshes.add(Sphere::new(0.45).mesh().ico(3).unwrap()),
        entity_materials: vec![
            materials.add(Color::srgb(0.10, 0.68, 0.95)),
            materials.add(Color::srgb(0.93, 0.55, 0.16)),
            materials.add(Color::srgb(0.73, 0.84, 0.25)),
            materials.add(Color::srgb(0.84, 0.25, 0.47)),
        ],
    };

    for _ in 0..INITIAL_ENTITY_COUNT {
        spawn_autonomous_entity(&mut commands, &entity_assets, counter.next_id, Vec2::ZERO);
        counter.next_id += 1;
    }

    commands.insert_resource(entity_assets);

    commands.spawn((
        Name::new("Camera"),
        Camera3d::default(),
        camera_transform(&rig),
        TopDownCamera,
    ));

    commands.spawn((
        Name::new("Status"),
        Text::new("Entities: 0"),
        Node {
            position_type: PositionType::Absolute,
            top: px(12),
            left: px(12),
            ..default()
        },
        StatusText,
    ));
}

fn spawn_grid(
    commands: &mut Commands,
    meshes: &mut ResMut<Assets<Mesh>>,
    material: Handle<StandardMaterial>,
) {
    let thin_line = 0.035;
    let board_width = WORLD_HALF_SIZE * 2.0;
    let horizontal = meshes.add(Cuboid::new(board_width, 0.025, thin_line));
    let vertical = meshes.add(Cuboid::new(thin_line, 0.025, board_width));

    for index in -9..=9 {
        let offset = index as f32 * 2.0;
        commands.spawn((
            Name::new("Grid line"),
            Mesh3d(horizontal.clone()),
            MeshMaterial3d(material.clone()),
            Transform::from_xyz(0.0, 0.018, offset),
        ));
        commands.spawn((
            Name::new("Grid line"),
            Mesh3d(vertical.clone()),
            MeshMaterial3d(material.clone()),
            Transform::from_xyz(offset, 0.018, 0.0),
        ));
    }
}

fn spawn_bounds(
    commands: &mut Commands,
    meshes: &mut ResMut<Assets<Mesh>>,
    material: Handle<StandardMaterial>,
) {
    let rail_height = 0.30;
    let rail_thickness = 0.18;
    let board_width = WORLD_HALF_SIZE * 2.0 + rail_thickness;
    let horizontal = meshes.add(Cuboid::new(board_width, rail_height, rail_thickness));
    let vertical = meshes.add(Cuboid::new(rail_thickness, rail_height, board_width));

    for z in [-WORLD_HALF_SIZE, WORLD_HALF_SIZE] {
        commands.spawn((
            Name::new("Boundary rail"),
            Mesh3d(horizontal.clone()),
            MeshMaterial3d(material.clone()),
            Transform::from_xyz(0.0, rail_height * 0.5, z),
        ));
    }

    for x in [-WORLD_HALF_SIZE, WORLD_HALF_SIZE] {
        commands.spawn((
            Name::new("Boundary rail"),
            Mesh3d(vertical.clone()),
            MeshMaterial3d(material.clone()),
            Transform::from_xyz(x, rail_height * 0.5, 0.0),
        ));
    }
}

fn spawn_lighting(commands: &mut Commands) {
    commands.spawn((
        Name::new("Sun"),
        DirectionalLight {
            illuminance: 18_000.0,
            shadow_maps_enabled: true,
            ..default()
        },
        Transform::from_xyz(-8.0, 18.0, 8.0).looking_at(Vec3::ZERO, Vec3::Y),
    ));

    commands.spawn((
        Name::new("Beacon"),
        PointLight {
            intensity: 950_000.0,
            range: 42.0,
            color: Color::srgb(0.50, 0.86, 1.0),
            shadow_maps_enabled: false,
            ..default()
        },
        Transform::from_xyz(0.0, 7.0, 0.0),
    ));
}
