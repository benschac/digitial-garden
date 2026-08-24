const DEFAULT_DELTA_SECONDS: f32 = 1.0 / 60.0;
const MIN_DELTA_SECONDS: f32 = 1.0 / 240.0;
const MAX_DELTA_SECONDS: f32 = 1.0 / 24.0;
const MIN_SPEED: f32 = 0.1;
const MAX_SPEED: f32 = 8.0;

/// Timing information shared with one simulation update.
#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Frame {
    /// Unscaled time reported by the animation source.
    pub(crate) elapsed_seconds: f32,
    /// Clamped frame delta after applying playback speed.
    pub(crate) delta_seconds: f32,
    /// Playback speed normalized to the engine's supported range.
    pub(crate) speed: f32,
}

/// Defines state-specific behavior while leaving frame mechanics to [`AnimationEngine`].
pub(crate) trait Simulation {
    type Input;

    fn update(&mut self, frame: Frame, input: &Self::Input);
}

/// Advances any simulation with normalized frame timing and playback speed.
pub(crate) struct AnimationEngine<S> {
    simulation: S,
    last_time: Option<f32>,
}

impl<S> AnimationEngine<S> {
    pub(crate) const fn new(simulation: S) -> Self {
        Self {
            simulation,
            last_time: None,
        }
    }

    pub(crate) fn reset_clock(&mut self) {
        self.last_time = None;
    }

    pub(crate) fn simulation(&self) -> &S {
        &self.simulation
    }

    pub(crate) fn simulation_mut(&mut self) -> &mut S {
        &mut self.simulation
    }
}

impl<S: Simulation> AnimationEngine<S> {
    pub(crate) fn step(&mut self, elapsed_seconds: f32, speed: f32, input: &S::Input) {
        let delta_seconds = self.last_time.map_or(DEFAULT_DELTA_SECONDS, |last_time| {
            (elapsed_seconds - last_time).clamp(MIN_DELTA_SECONDS, MAX_DELTA_SECONDS)
        });
        let speed = speed.clamp(MIN_SPEED, MAX_SPEED);
        self.last_time = Some(elapsed_seconds);

        self.simulation.update(
            Frame {
                elapsed_seconds,
                delta_seconds: delta_seconds * speed,
                speed,
            },
            input,
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Default)]
    struct RecordingSimulation {
        frame: Option<Frame>,
    }

    impl Simulation for RecordingSimulation {
        type Input = ();

        fn update(&mut self, frame: Frame, _input: &Self::Input) {
            self.frame = Some(frame);
        }
    }

    #[test]
    fn step_should_use_default_delta_for_first_frame() {
        let mut engine = AnimationEngine::new(RecordingSimulation::default());

        engine.step(10.0, 1.0, &());

        assert_eq!(
            engine.simulation().frame,
            Some(Frame {
                elapsed_seconds: 10.0,
                delta_seconds: DEFAULT_DELTA_SECONDS,
                speed: 1.0,
            })
        );
    }

    #[test]
    fn step_should_clamp_long_frame_before_scaling_delta() {
        let mut engine = AnimationEngine::new(RecordingSimulation::default());
        engine.step(1.0, 1.0, &());

        engine.step(2.0, 2.0, &());

        assert_eq!(
            engine.simulation().frame,
            Some(Frame {
                elapsed_seconds: 2.0,
                delta_seconds: MAX_DELTA_SECONDS * 2.0,
                speed: 2.0,
            })
        );
    }

    #[test]
    fn reset_clock_should_restore_first_frame_delta() {
        let mut engine = AnimationEngine::new(RecordingSimulation::default());
        engine.step(1.0, 1.0, &());
        engine.reset_clock();

        engine.step(20.0, 1.0, &());

        assert_eq!(
            engine.simulation().frame.map(|frame| frame.delta_seconds),
            Some(DEFAULT_DELTA_SECONDS)
        );
    }
}
