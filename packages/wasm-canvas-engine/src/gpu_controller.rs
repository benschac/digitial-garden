const COMMAND_WORDS: usize = 16;
const DEFAULT_DELTA_SECONDS: f32 = 1.0 / 60.0;
const MIN_DELTA_SECONDS: f32 = 1.0 / 240.0;
const MAX_DELTA_SECONDS: f32 = 1.0 / 24.0;
const MIN_SPEED: f32 = 0.1;
const MAX_SPEED: f32 = 8.0;
const REFERENCE_FRAMES_PER_SECOND: f32 = 60.0;
const REFERENCE_TRAIL_ALPHA: f32 = 0.2;

const DIMENSION_X: usize = 0;
const DIMENSION_Y: usize = 1;
const PREVIOUS_DIMENSION_X: usize = 2;
const PREVIOUS_DIMENSION_Y: usize = 3;
const POINTER_X: usize = 4;
const POINTER_Y: usize = 5;
const FLOW_PHASE_X: usize = 6;
const FLOW_PHASE_Y: usize = 7;
const SIMULATION_DELTA_SECONDS: usize = 8;
const INTERACTION: usize = 9;
const ACTIVE_PARTICLE_COUNT: usize = 10;
const UPDATE_PARTICLE_COUNT: usize = 11;
const TRAIL_ALPHA: usize = 12;
const COMMAND_FLAGS: usize = 13;
const UPDATE_PARTICLE_STRIDE: usize = 14;
const UPDATE_PARTICLE_OFFSET: usize = 15;

const TWO_WAY_INTERLEAVE_THRESHOLD: u32 = 450_000;
const FOUR_WAY_INTERLEAVE_THRESHOLD: u32 = 1_200_000;
const EIGHT_WAY_INTERLEAVE_THRESHOLD: u32 = 2_400_000;

pub(crate) const FRAME_COMMAND_BYTE_LENGTH: u32 = (COMMAND_WORDS * size_of::<u32>()) as u32;
pub(crate) const MAX_GPU_PARTICLES: u32 = 4_200_000;
pub(crate) const COMMAND_FLAG_INITIALIZE: u32 = 1;
pub(crate) const COMMAND_FLAG_RESIZE: u32 = 1 << 1;

pub(crate) struct GpuFrameController {
    command: [u32; COMMAND_WORDS],
    max_particles: u32,
    active_particles: u32,
    width: f32,
    height: f32,
    previous_width: f32,
    previous_height: f32,
    update_phase: u32,
    needs_initialization: bool,
    needs_resize: bool,
}

impl GpuFrameController {
    pub(crate) const fn new() -> Self {
        Self {
            command: [0; COMMAND_WORDS],
            max_particles: 1,
            active_particles: 1,
            width: 1.0,
            height: 1.0,
            previous_width: 1.0,
            previous_height: 1.0,
            update_phase: 0,
            needs_initialization: true,
            needs_resize: false,
        }
    }

    pub(crate) fn initialize(
        &mut self,
        capacity: u32,
        active_particles: u32,
        width: f32,
        height: f32,
    ) -> u32 {
        self.max_particles = capacity.clamp(1, MAX_GPU_PARTICLES);
        self.active_particles = active_particles.clamp(1, self.max_particles);
        self.width = normalized_dimension(width);
        self.height = normalized_dimension(height);
        self.previous_width = self.width;
        self.previous_height = self.height;
        self.update_phase = 0;
        self.needs_initialization = true;
        self.needs_resize = false;
        self.active_particles
    }

    pub(crate) fn resize(&mut self, width: f32, height: f32) {
        let width = normalized_dimension(width);
        let height = normalized_dimension(height);
        if width == self.width && height == self.height {
            return;
        }

        self.width = width;
        self.height = height;
        self.needs_resize = true;
    }

    pub(crate) fn set_particle_count(&mut self, count: u32) -> u32 {
        self.active_particles = count.clamp(1, self.max_particles);
        self.update_phase = 0;
        self.active_particles
    }

    pub(crate) fn prepare_frame(
        &mut self,
        elapsed_seconds: f32,
        delta_seconds: f32,
        pointer_x: f32,
        pointer_y: f32,
        interaction: f32,
        simulation_speed: f32,
    ) -> *const u32 {
        let elapsed_seconds = finite_or(elapsed_seconds, 0.0);
        let delta_seconds = finite_or(delta_seconds, DEFAULT_DELTA_SECONDS)
            .clamp(MIN_DELTA_SECONDS, MAX_DELTA_SECONDS);
        let simulation_speed = finite_or(simulation_speed, 1.0).clamp(MIN_SPEED, MAX_SPEED);
        let mut command_flags = 0;
        if self.needs_initialization {
            command_flags |= COMMAND_FLAG_INITIALIZE;
        } else if self.needs_resize {
            command_flags |= COMMAND_FLAG_RESIZE;
        }
        let (update_particle_count, update_particle_stride, update_particle_offset) =
            if command_flags == 0 {
                let stride = simulation_update_stride(self.active_particles);
                let offset = self.update_phase % stride;
                self.update_phase = self.update_phase.wrapping_add(1);
                (
                    self.active_particles
                        .saturating_sub(offset)
                        .div_ceil(stride),
                    stride,
                    offset,
                )
            } else {
                (self.max_particles, 1, 0)
            };

        self.write_f32(DIMENSION_X, self.width);
        self.write_f32(DIMENSION_Y, self.height);
        self.write_f32(PREVIOUS_DIMENSION_X, self.previous_width);
        self.write_f32(PREVIOUS_DIMENSION_Y, self.previous_height);
        self.write_f32(POINTER_X, finite_or(pointer_x, -10_000.0));
        self.write_f32(POINTER_Y, finite_or(pointer_y, -10_000.0));
        self.write_f32(FLOW_PHASE_X, elapsed_seconds * 0.28 * simulation_speed);
        self.write_f32(FLOW_PHASE_Y, elapsed_seconds * 0.22 * simulation_speed);
        self.write_f32(SIMULATION_DELTA_SECONDS, delta_seconds * simulation_speed);
        self.write_f32(INTERACTION, finite_or(interaction, 0.0));
        self.command[ACTIVE_PARTICLE_COUNT] = self.active_particles;
        self.command[UPDATE_PARTICLE_COUNT] = update_particle_count;
        self.write_f32(TRAIL_ALPHA, trail_alpha(delta_seconds));
        self.command[COMMAND_FLAGS] = command_flags;
        self.command[UPDATE_PARTICLE_STRIDE] = update_particle_stride;
        self.command[UPDATE_PARTICLE_OFFSET] = update_particle_offset;

        self.previous_width = self.width;
        self.previous_height = self.height;
        self.needs_initialization = false;
        self.needs_resize = false;
        self.command.as_ptr()
    }

    fn write_f32(&mut self, index: usize, value: f32) {
        self.command[index] = value.to_bits();
    }
}

fn finite_or(value: f32, fallback: f32) -> f32 {
    if value.is_finite() {
        value
    } else {
        fallback
    }
}

fn normalized_dimension(value: f32) -> f32 {
    finite_or(value, 1.0).max(1.0)
}

fn trail_alpha(delta_seconds: f32) -> f32 {
    1.0 - (1.0 - REFERENCE_TRAIL_ALPHA).powf(delta_seconds * REFERENCE_FRAMES_PER_SECOND)
}

fn simulation_update_stride(particle_count: u32) -> u32 {
    if particle_count > EIGHT_WAY_INTERLEAVE_THRESHOLD {
        8
    } else if particle_count > FOUR_WAY_INTERLEAVE_THRESHOLD {
        4
    } else if particle_count > TWO_WAY_INTERLEAVE_THRESHOLD {
        2
    } else {
        1
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn f32_word(command: &[u32; COMMAND_WORDS], index: usize) -> f32 {
        f32::from_bits(command[index])
    }

    #[test]
    fn first_frame_should_initialize_the_full_device_capacity() {
        let mut controller = GpuFrameController::new();
        controller.initialize(5_000_000, 5_000_000, 800.0, 600.0);

        controller.prepare_frame(1.0, 1.0 / 60.0, 0.0, 0.0, 0.0, 1.0);

        assert_eq!(
            (
                controller.active_particles,
                controller.command[UPDATE_PARTICLE_COUNT],
                controller.command[UPDATE_PARTICLE_STRIDE],
                controller.command[UPDATE_PARTICLE_OFFSET],
                controller.command[COMMAND_FLAGS],
            ),
            (
                MAX_GPU_PARTICLES,
                MAX_GPU_PARTICLES,
                1,
                0,
                COMMAND_FLAG_INITIALIZE,
            )
        );
    }

    #[test]
    fn resize_frame_should_scale_the_full_capacity_from_previous_dimensions() {
        let mut controller = GpuFrameController::new();
        controller.initialize(100_000, 25_000, 800.0, 600.0);
        controller.prepare_frame(1.0, 1.0 / 60.0, 0.0, 0.0, 0.0, 1.0);
        controller.resize(1_200.0, 900.0);

        controller.prepare_frame(2.0, 1.0 / 60.0, 0.0, 0.0, 0.0, 1.0);

        assert_eq!(
            (
                f32_word(&controller.command, PREVIOUS_DIMENSION_X),
                f32_word(&controller.command, DIMENSION_X),
                controller.command[UPDATE_PARTICLE_COUNT],
                controller.command[UPDATE_PARTICLE_STRIDE],
                controller.command[UPDATE_PARTICLE_OFFSET],
                controller.command[COMMAND_FLAGS],
            ),
            (800.0, 1_200.0, 100_000, 1, 0, COMMAND_FLAG_RESIZE)
        );
    }

    #[test]
    fn ordinary_frame_should_only_update_active_particles() {
        let mut controller = GpuFrameController::new();
        controller.initialize(100_000, 25_000, 800.0, 600.0);
        controller.prepare_frame(1.0, 1.0 / 60.0, 0.0, 0.0, 0.0, 1.0);

        controller.prepare_frame(2.0, 1.0 / 60.0, 0.0, 0.0, 0.0, 1.0);

        assert_eq!(
            (
                controller.command[UPDATE_PARTICLE_COUNT],
                controller.command[UPDATE_PARTICLE_STRIDE],
                controller.command[UPDATE_PARTICLE_OFFSET],
                controller.command[COMMAND_FLAGS],
            ),
            (25_000, 1, 0, 0)
        );
    }

    #[test]
    fn dense_frames_should_rotate_through_smaller_update_cohorts() {
        let mut controller = GpuFrameController::new();
        controller.initialize(2_100_000, 2_100_000, 800.0, 600.0);
        controller.prepare_frame(1.0, 1.0 / 60.0, 0.0, 0.0, 0.0, 1.0);

        for expected_offset in 0..4 {
            controller.prepare_frame(2.0, 1.0 / 60.0, 0.0, 0.0, 0.0, 1.0);
            assert_eq!(
                (
                    controller.command[UPDATE_PARTICLE_COUNT],
                    controller.command[UPDATE_PARTICLE_STRIDE],
                    controller.command[UPDATE_PARTICLE_OFFSET],
                ),
                (525_000, 4, expected_offset),
            );
        }
    }

    #[test]
    fn maximum_density_frames_should_rotate_through_eight_update_cohorts() {
        let mut controller = GpuFrameController::new();
        controller.initialize(4_200_000, 4_200_000, 800.0, 600.0);
        controller.prepare_frame(1.0, 1.0 / 60.0, 0.0, 0.0, 0.0, 1.0);

        for expected_offset in 0..8 {
            controller.prepare_frame(2.0, 1.0 / 60.0, 0.0, 0.0, 0.0, 1.0);
            assert_eq!(
                (
                    controller.command[UPDATE_PARTICLE_COUNT],
                    controller.command[UPDATE_PARTICLE_STRIDE],
                    controller.command[UPDATE_PARTICLE_OFFSET],
                ),
                (525_000, 8, expected_offset),
            );
        }
    }

    #[test]
    fn simulation_update_stride_should_scale_at_density_boundaries() {
        assert_eq!(simulation_update_stride(450_000), 1);
        assert_eq!(simulation_update_stride(450_001), 2);
        assert_eq!(simulation_update_stride(1_200_000), 2);
        assert_eq!(simulation_update_stride(1_200_001), 4);
        assert_eq!(simulation_update_stride(2_400_000), 4);
        assert_eq!(simulation_update_stride(2_400_001), 8);
    }

    #[test]
    fn frame_policy_should_scale_simulation_with_playback_speed() {
        let mut controller = GpuFrameController::new();
        controller.initialize(100_000, 25_000, 800.0, 600.0);

        controller.prepare_frame(10.0, 1.0 / 60.0, 0.0, 0.0, 0.0, 2.0);

        assert_eq!(
            (
                f32_word(&controller.command, FLOW_PHASE_X),
                f32_word(&controller.command, SIMULATION_DELTA_SECONDS),
            ),
            (5.6, 1.0 / 30.0)
        );
    }

    #[test]
    fn frame_policy_should_not_scale_trail_decay_with_playback_speed() {
        let mut controller = GpuFrameController::new();
        controller.initialize(100_000, 25_000, 800.0, 600.0);

        controller.prepare_frame(10.0, 1.0 / 60.0, 0.0, 0.0, 0.0, 2.0);

        let actual = f32_word(&controller.command, TRAIL_ALPHA);
        assert!((actual - REFERENCE_TRAIL_ALPHA).abs() < f32::EPSILON);
    }
}
