use std::f32::consts::FRAC_PI_2;

use bevy::{
    input::mouse::{AccumulatedMouseMotion, AccumulatedMouseScroll},
    prelude::*,
};

use crate::WORLD_HALF_SIZE;

#[derive(Resource)]
pub(crate) struct CameraRig {
    target: Vec3,
    yaw: f32,
    pitch: f32,
    distance: f32,
    min_pitch: f32,
    max_pitch: f32,
    min_distance: f32,
    max_distance: f32,
}

impl CameraRig {
    pub(crate) fn target_xz(&self) -> Vec2 {
        Vec2::new(self.target.x, self.target.z)
    }
}

impl Default for CameraRig {
    fn default() -> Self {
        Self {
            target: Vec3::ZERO,
            yaw: 0.0,
            pitch: 58.0_f32.to_radians(),
            distance: 24.0,
            min_pitch: 24.0_f32.to_radians(),
            max_pitch: 82.0_f32.to_radians(),
            min_distance: 8.0,
            max_distance: 45.0,
        }
    }
}

#[derive(Component)]
pub(crate) struct TopDownCamera;

pub(crate) fn camera_controls(
    mut rig: ResMut<CameraRig>,
    mut camera: Single<&mut Transform, With<TopDownCamera>>,
    keyboard: Res<ButtonInput<KeyCode>>,
    mouse_buttons: Res<ButtonInput<MouseButton>>,
    mouse_motion: Res<AccumulatedMouseMotion>,
    mouse_scroll: Res<AccumulatedMouseScroll>,
    time: Res<Time>,
) {
    let dt = time.delta_secs();
    let speed_multiplier = if keyboard.any_pressed([KeyCode::ShiftLeft, KeyCode::ShiftRight]) {
        2.6
    } else {
        1.0
    };

    let mut pan = Vec2::ZERO;
    if keyboard.pressed(KeyCode::KeyW) || keyboard.pressed(KeyCode::ArrowUp) {
        pan.y += 1.0;
    }
    if keyboard.pressed(KeyCode::KeyS) || keyboard.pressed(KeyCode::ArrowDown) {
        pan.y -= 1.0;
    }
    if keyboard.pressed(KeyCode::KeyD) || keyboard.pressed(KeyCode::ArrowRight) {
        pan.x += 1.0;
    }
    if keyboard.pressed(KeyCode::KeyA) || keyboard.pressed(KeyCode::ArrowLeft) {
        pan.x -= 1.0;
    }
    if pan.length_squared() > 0.0 {
        let pan_speed = (rig.distance * 0.35).clamp(5.0, 18.0) * speed_multiplier;
        pan_camera_target(&mut rig, pan.normalize() * pan_speed * dt);
    }

    let rotate_speed = 1.45 * dt;
    if keyboard.pressed(KeyCode::KeyQ) {
        rig.yaw += rotate_speed;
    }
    if keyboard.pressed(KeyCode::KeyE) {
        rig.yaw -= rotate_speed;
    }
    if keyboard.pressed(KeyCode::KeyR) {
        rig.pitch = (rig.pitch + rotate_speed * 0.7).clamp(rig.min_pitch, rig.max_pitch);
    }
    if keyboard.pressed(KeyCode::KeyF) {
        rig.pitch = (rig.pitch - rotate_speed * 0.7).clamp(rig.min_pitch, rig.max_pitch);
    }

    let mouse_delta = mouse_motion.delta;
    if mouse_buttons.pressed(MouseButton::Right) && mouse_delta != Vec2::ZERO {
        rig.yaw -= mouse_delta.x * 0.006;
        rig.pitch = (rig.pitch + mouse_delta.y * 0.004).clamp(rig.min_pitch, rig.max_pitch);
    }
    if mouse_buttons.pressed(MouseButton::Middle) && mouse_delta != Vec2::ZERO {
        let drag_scale = rig.distance * 0.0026;
        pan_camera_target(
            &mut rig,
            Vec2::new(-mouse_delta.x, mouse_delta.y) * drag_scale,
        );
    }
    if mouse_scroll.delta.y.abs() > f32::EPSILON {
        let zoom_factor = (1.0 - mouse_scroll.delta.y * 0.08).clamp(0.25, 4.0);
        rig.distance = (rig.distance * zoom_factor).clamp(rig.min_distance, rig.max_distance);
    }

    let transform = camera_transform(&rig);
    camera.translation = transform.translation;
    camera.rotation = transform.rotation;
}

pub(crate) fn camera_transform(rig: &CameraRig) -> Transform {
    let pitch = rig.pitch.clamp(0.01, FRAC_PI_2 - 0.01);
    let horizontal_distance = rig.distance * pitch.cos();
    let height = rig.distance * pitch.sin();
    let eye = rig.target
        + Vec3::new(
            rig.yaw.sin() * horizontal_distance,
            height,
            rig.yaw.cos() * horizontal_distance,
        );

    Transform::from_translation(eye).looking_at(rig.target, Vec3::Y)
}

fn pan_camera_target(rig: &mut CameraRig, local_delta: Vec2) {
    let forward = Vec3::new(-rig.yaw.sin(), 0.0, -rig.yaw.cos());
    let right = Vec3::new(-forward.z, 0.0, forward.x);
    let movement = right * local_delta.x + forward * local_delta.y;

    rig.target.x = (rig.target.x + movement.x).clamp(-WORLD_HALF_SIZE, WORLD_HALF_SIZE);
    rig.target.z = (rig.target.z + movement.z).clamp(-WORLD_HALF_SIZE, WORLD_HALF_SIZE);
}
