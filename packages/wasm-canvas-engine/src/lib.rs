mod gpu_controller;
pub mod perlin_noise;
mod simulation;

use std::cell::RefCell;

use simulation::{AnimationEngine, Frame, Simulation};

use gpu_controller::{GpuFrameController, FRAME_COMMAND_BYTE_LENGTH};

const MAX_PARTICLES: usize = 2_400;
const PARTICLE_BOUNDARY_PADDING: f32 = 4.0;
const VALUES_PER_PARTICLE: usize = 4;
const REFERENCE_FRAMES_PER_SECOND: f32 = 60.0;
const DAMPING_PER_REFERENCE_FRAME: f32 = 0.992;

#[derive(Clone, Copy)]
struct Particle {
    x: f32,
    y: f32,
    velocity_x: f32,
    velocity_y: f32,
    phase: f32,
}

const EMPTY_PARTICLE: Particle = Particle {
    x: 0.0,
    y: 0.0,
    velocity_x: 0.0,
    velocity_y: 0.0,
    phase: 0.0,
};

struct ParticleInput {
    pointer_x: f32,
    pointer_y: f32,
    interaction: f32,
}

struct ParticleSimulation {
    particles: [Particle; MAX_PARTICLES],
    output: [f32; MAX_PARTICLES * VALUES_PER_PARTICLE],
    active_particles: usize,
    width: f32,
    height: f32,
}

impl ParticleSimulation {
    const fn new() -> Self {
        Self {
            particles: [EMPTY_PARTICLE; MAX_PARTICLES],
            output: [0.0; MAX_PARTICLES * VALUES_PER_PARTICLE],
            active_particles: 1_000,
            width: 1.0,
            height: 1.0,
        }
    }

    fn initialize(&mut self, seed: u32, count: u32, width: f32, height: f32) {
        let mut random_state = seed.max(1);
        self.width = width.max(1.0);
        self.height = height.max(1.0);
        self.set_particle_count(count);

        for particle in &mut self.particles {
            *particle = Particle {
                x: random(&mut random_state) * self.width,
                y: random(&mut random_state) * self.height,
                velocity_x: (random(&mut random_state) - 0.5) * 18.0,
                velocity_y: (random(&mut random_state) - 0.5) * 18.0,
                phase: random(&mut random_state) * core::f32::consts::TAU,
            };
        }
    }

    fn resize(&mut self, width: f32, height: f32) {
        let width = width.max(1.0);
        let height = height.max(1.0);
        let scale_x = width / self.width;
        let scale_y = height / self.height;

        for particle in &mut self.particles[..self.active_particles] {
            particle.x *= scale_x;
            particle.y *= scale_y;
        }

        self.width = width;
        self.height = height;
    }

    fn set_particle_count(&mut self, count: u32) {
        self.active_particles = (count as usize).clamp(1, MAX_PARTICLES);
    }

    fn output_ptr(&self) -> *const f32 {
        self.output.as_ptr()
    }
}

impl Simulation for ParticleSimulation {
    type Input = ParticleInput;

    fn update(&mut self, frame: Frame, input: &Self::Input) {
        let damping = velocity_damping(frame.delta_seconds);

        for index in 0..self.active_particles {
            let particle = &mut self.particles[index];
            let flow_x =
                (particle.y * 0.009 + frame.elapsed_seconds * 0.28 * frame.speed + particle.phase)
                    .sin();
            let flow_y = (particle.x * 0.007 - frame.elapsed_seconds * 0.22 * frame.speed
                + particle.phase)
                .cos();

            particle.velocity_x += flow_x * frame.delta_seconds * 24.0;
            particle.velocity_y += flow_y * frame.delta_seconds * 24.0;

            let offset_x = input.pointer_x - particle.x;
            let offset_y = input.pointer_y - particle.y;
            let distance_squared = offset_x * offset_x + offset_y * offset_y;

            if distance_squared < 32_400.0 && distance_squared > 9.0 {
                let force = input.interaction * frame.delta_seconds * 1_900.0 / distance_squared;
                particle.velocity_x += offset_x * force;
                particle.velocity_y += offset_y * force;
            }

            particle.velocity_x *= damping;
            particle.velocity_y *= damping;
            particle.x += particle.velocity_x * frame.delta_seconds;
            particle.y += particle.velocity_y * frame.delta_seconds;

            particle.x = wrap_coordinate(particle.x, self.width);
            particle.y = wrap_coordinate(particle.y, self.height);

            let speed = (particle.velocity_x * particle.velocity_x
                + particle.velocity_y * particle.velocity_y)
                .sqrt();
            let output_index = index * VALUES_PER_PARTICLE;
            self.output[output_index] = particle.x;
            self.output[output_index + 1] = particle.y;
            self.output[output_index + 2] = (0.7 + speed * 0.035).clamp(0.7, 2.6);
            self.output[output_index + 3] = (speed * 0.04).clamp(0.18, 1.0);
        }
    }
}

fn velocity_damping(delta_seconds: f32) -> f32 {
    DAMPING_PER_REFERENCE_FRAME.powf(delta_seconds * REFERENCE_FRAMES_PER_SECOND)
}

fn wrap_coordinate(coordinate: f32, dimension: f32) -> f32 {
    let lower_bound = -PARTICLE_BOUNDARY_PADDING;
    let upper_bound = dimension + PARTICLE_BOUNDARY_PADDING;
    if (lower_bound..=upper_bound).contains(&coordinate) {
        return coordinate;
    }

    let span = upper_bound - lower_bound;
    lower_bound + (coordinate - lower_bound).rem_euclid(span)
}

thread_local! {
    static ENGINE: RefCell<AnimationEngine<ParticleSimulation>> =
        const { RefCell::new(AnimationEngine::new(ParticleSimulation::new())) };
    static GPU_CONTROLLER: RefCell<GpuFrameController> =
        const { RefCell::new(GpuFrameController::new()) };
}

fn with_engine<R>(operation: impl FnOnce(&mut AnimationEngine<ParticleSimulation>) -> R) -> R {
    ENGINE.with_borrow_mut(operation)
}

fn with_gpu_controller<R>(operation: impl FnOnce(&mut GpuFrameController) -> R) -> R {
    GPU_CONTROLLER.with_borrow_mut(operation)
}

fn random(seed: &mut u32) -> f32 {
    *seed ^= *seed << 13;
    *seed ^= *seed >> 17;
    *seed ^= *seed << 5;
    (*seed as f32) / (u32::MAX as f32)
}

#[no_mangle]
pub extern "C" fn initialize(seed: u32, count: u32, width: f32, height: f32) {
    with_engine(|engine| {
        engine
            .simulation_mut()
            .initialize(seed, count, width, height);
        engine.reset_clock();
    });
}

#[no_mangle]
pub extern "C" fn resize(width: f32, height: f32) {
    with_engine(|engine| engine.simulation_mut().resize(width, height));
}

#[no_mangle]
pub extern "C" fn set_particle_count(count: u32) {
    with_engine(|engine| engine.simulation_mut().set_particle_count(count));
}

#[no_mangle]
pub extern "C" fn particle_count() -> u32 {
    with_engine(|engine| engine.simulation().active_particles as u32)
}

#[no_mangle]
pub extern "C" fn perlin_noise_2d(x: f64, y: f64) -> f64 {
    perlin_noise::perlin_noise_2d(x, y)
}

#[no_mangle]
pub extern "C" fn perlin_noise_3d(x: f64, y: f64, z: f64) -> f64 {
    perlin_noise::perlin_noise_3d(x, y, z)
}

#[no_mangle]
pub extern "C" fn step(
    time: f32,
    pointer_x: f32,
    pointer_y: f32,
    interaction: f32,
    simulation_speed: f32,
) -> *const f32 {
    with_engine(|engine| {
        engine.step(
            time,
            simulation_speed,
            &ParticleInput {
                pointer_x,
                pointer_y,
                interaction,
            },
        );
        engine.simulation().output_ptr()
    })
}

#[no_mangle]
pub extern "C" fn gpu_frame_command_byte_length() -> u32 {
    FRAME_COMMAND_BYTE_LENGTH
}

#[no_mangle]
pub extern "C" fn initialize_gpu_controller(
    capacity: u32,
    active_particles: u32,
    width: f32,
    height: f32,
) -> u32 {
    with_gpu_controller(|controller| {
        controller.initialize(capacity, active_particles, width, height)
    })
}

#[no_mangle]
pub extern "C" fn resize_gpu_controller(width: f32, height: f32) {
    with_gpu_controller(|controller| controller.resize(width, height));
}

#[no_mangle]
pub extern "C" fn set_gpu_particle_count(count: u32) -> u32 {
    with_gpu_controller(|controller| controller.set_particle_count(count))
}

#[no_mangle]
pub extern "C" fn prepare_gpu_frame(
    elapsed_seconds: f32,
    delta_seconds: f32,
    pointer_x: f32,
    pointer_y: f32,
    interaction: f32,
    simulation_speed: f32,
) -> *const u32 {
    with_gpu_controller(|controller| {
        controller.prepare_frame(
            elapsed_seconds,
            delta_seconds,
            pointer_x,
            pointer_y,
            interaction,
            simulation_speed,
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn simulation_produces_finite_particle_data() {
        let mut engine = AnimationEngine::new(ParticleSimulation::new());
        engine.simulation_mut().initialize(42, 16, 800.0, 600.0);
        engine.step(
            1.0,
            2.5,
            &ParticleInput {
                pointer_x: 400.0,
                pointer_y: 300.0,
                interaction: 0.8,
            },
        );
        let simulation = engine.simulation();
        let values = &simulation.output[..simulation.active_particles * VALUES_PER_PARTICLE];

        assert!(values.iter().all(|value| value.is_finite()));
    }

    #[test]
    fn set_particle_count_should_clamp_to_capacity() {
        let mut simulation = ParticleSimulation::new();

        simulation.set_particle_count((MAX_PARTICLES + 1) as u32);

        assert_eq!(simulation.active_particles, MAX_PARTICLES);
    }

    #[test]
    fn velocity_damping_should_be_equivalent_at_60_and_120_fps() {
        let damping_at_60_fps = velocity_damping(1.0 / 60.0);
        let damping_at_120_fps = velocity_damping(1.0 / 120.0);

        assert!((damping_at_60_fps - damping_at_120_fps.powi(2)).abs() < f32::EPSILON);
    }

    #[test]
    fn wrap_coordinate_should_preserve_overshoot_past_upper_boundary() {
        assert_eq!(wrap_coordinate(805.25, 800.0), -2.75);
    }

    #[test]
    fn wrap_coordinate_should_preserve_overshoot_past_lower_boundary() {
        assert_eq!(wrap_coordinate(-6.5, 800.0), 801.5);
    }
}
