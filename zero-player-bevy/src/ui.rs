use bevy::prelude::*;

use crate::entities::AutonomousEntity;

#[derive(Component)]
pub(crate) struct StatusText;

pub(crate) fn update_status_text(
    mut text: Single<&mut Text, With<StatusText>>,
    entities: Query<(), With<AutonomousEntity>>,
) {
    text.0 = format!("Entities: {}", entities.iter().count());
}
