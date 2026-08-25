const PERMUTATION: [usize; 256] = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69,
    142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219,
    203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
    74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230,
    220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76,
    132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173,
    186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206,
    59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163,
    70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232,
    178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162,
    241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204,
    176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141,
    128, 195, 78, 66, 215, 61, 156, 180,
];

/// Returns deterministic two-dimensional improved Perlin noise near `[-1, 1]`.
///
/// Integer lattice coordinates always return zero. Non-finite inputs return `NaN`.
#[must_use]
pub fn perlin_noise_2d(x: f64, y: f64) -> f64 {
    if !x.is_finite() || !y.is_finite() {
        return f64::NAN;
    }

    let x_floor = x.floor();
    let y_floor = y.floor();
    let lattice_x = lattice_index(x_floor);
    let lattice_y = lattice_index(y_floor);
    let offset_x = x - x_floor;
    let offset_y = y - y_floor;
    let fade_x = fade(offset_x);
    let fade_y = fade(offset_y);

    let left = PERMUTATION[lattice_x];
    let right = PERMUTATION[(lattice_x + 1) % 256];
    let bottom_left = PERMUTATION[(left + lattice_y) % 256];
    let top_left = PERMUTATION[(left + lattice_y + 1) % 256];
    let bottom_right = PERMUTATION[(right + lattice_y) % 256];
    let top_right = PERMUTATION[(right + lattice_y + 1) % 256];

    let bottom = lerp(
        gradient_dot(bottom_left, offset_x, offset_y),
        gradient_dot(bottom_right, offset_x - 1.0, offset_y),
        fade_x,
    );
    let top = lerp(
        gradient_dot(top_left, offset_x, offset_y - 1.0),
        gradient_dot(top_right, offset_x - 1.0, offset_y - 1.0),
        fade_x,
    );

    let noise = lerp(bottom, top, fade_y);
    if noise == 0.0 {
        0.0
    } else {
        noise
    }
}

/// Returns deterministic three-dimensional improved Perlin noise near `[-1, 1]`.
///
/// Integer lattice coordinates always return zero. Non-finite inputs return `NaN`.
#[must_use]
pub fn perlin_noise_3d(x: f64, y: f64, z: f64) -> f64 {
    if !x.is_finite() || !y.is_finite() || !z.is_finite() {
        return f64::NAN;
    }

    let x_floor = x.floor();
    let y_floor = y.floor();
    let z_floor = z.floor();
    let lattice_x = lattice_index(x_floor);
    let lattice_y = lattice_index(y_floor);
    let lattice_z = lattice_index(z_floor);
    let offset_x = x - x_floor;
    let offset_y = y - y_floor;
    let offset_z = z - z_floor;
    let fade_x = fade(offset_x);
    let fade_y = fade(offset_y);
    let fade_z = fade(offset_z);

    let left = PERMUTATION[lattice_x];
    let right = PERMUTATION[(lattice_x + 1) % 256];
    let bottom_left = PERMUTATION[(left + lattice_y) % 256];
    let top_left = PERMUTATION[(left + lattice_y + 1) % 256];
    let bottom_right = PERMUTATION[(right + lattice_y) % 256];
    let top_right = PERMUTATION[(right + lattice_y + 1) % 256];

    let near_bottom = lerp(
        gradient_dot_3d(
            PERMUTATION[(bottom_left + lattice_z) % 256],
            offset_x,
            offset_y,
            offset_z,
        ),
        gradient_dot_3d(
            PERMUTATION[(bottom_right + lattice_z) % 256],
            offset_x - 1.0,
            offset_y,
            offset_z,
        ),
        fade_x,
    );
    let near_top = lerp(
        gradient_dot_3d(
            PERMUTATION[(top_left + lattice_z) % 256],
            offset_x,
            offset_y - 1.0,
            offset_z,
        ),
        gradient_dot_3d(
            PERMUTATION[(top_right + lattice_z) % 256],
            offset_x - 1.0,
            offset_y - 1.0,
            offset_z,
        ),
        fade_x,
    );
    let far_bottom = lerp(
        gradient_dot_3d(
            PERMUTATION[(bottom_left + lattice_z + 1) % 256],
            offset_x,
            offset_y,
            offset_z - 1.0,
        ),
        gradient_dot_3d(
            PERMUTATION[(bottom_right + lattice_z + 1) % 256],
            offset_x - 1.0,
            offset_y,
            offset_z - 1.0,
        ),
        fade_x,
    );
    let far_top = lerp(
        gradient_dot_3d(
            PERMUTATION[(top_left + lattice_z + 1) % 256],
            offset_x,
            offset_y - 1.0,
            offset_z - 1.0,
        ),
        gradient_dot_3d(
            PERMUTATION[(top_right + lattice_z + 1) % 256],
            offset_x - 1.0,
            offset_y - 1.0,
            offset_z - 1.0,
        ),
        fade_x,
    );

    let near = lerp(near_bottom, near_top, fade_y);
    let far = lerp(far_bottom, far_top, fade_y);
    let noise = lerp(near, far, fade_z);
    if noise == 0.0 {
        0.0
    } else {
        noise
    }
}

fn lattice_index(value: f64) -> usize {
    value.rem_euclid(256.0) as usize
}

fn fade(value: f64) -> f64 {
    value * value * value * (value * (value * 6.0 - 15.0) + 10.0)
}

fn lerp(start: f64, end: f64, amount: f64) -> f64 {
    start + amount * (end - start)
}

fn gradient_dot(hash: usize, x: f64, y: f64) -> f64 {
    match hash & 7 {
        0 => x + y,
        1 => -x + y,
        2 => x - y,
        3 => -x - y,
        4 => x,
        5 => -x,
        6 => y,
        _ => -y,
    }
}

fn gradient_dot_3d(hash: usize, x: f64, y: f64, z: f64) -> f64 {
    let direction = hash & 15;
    let first = if direction < 8 { x } else { y };
    let second = if direction < 4 {
        y
    } else if direction == 12 || direction == 14 {
        x
    } else {
        z
    };
    let signed_first = if direction & 1 == 0 { first } else { -first };
    let signed_second = if direction & 2 == 0 { second } else { -second };
    signed_first + signed_second
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn perlin_noise_2d_should_return_zero_at_integer_lattice_coordinates() {
        assert_eq!(perlin_noise_2d(-3.0, 7.0), 0.0);
    }

    #[test]
    fn perlin_noise_2d_should_match_shared_typescript_and_rust_reference_vector() {
        let noise = perlin_noise_2d(0.25, 0.75);

        assert!((noise - -0.255_357_742_309_570_3).abs() < 1e-14);
    }

    #[test]
    fn perlin_noise_2d_should_wrap_gradients_every_256_lattice_cells() {
        let noise = perlin_noise_2d(12.125, -4.5);
        let wrapped_noise = perlin_noise_2d(268.125, 251.5);

        assert!((noise - wrapped_noise).abs() < 1e-14);
    }

    #[test]
    fn perlin_noise_2d_should_return_nan_for_non_finite_coordinate() {
        assert!(perlin_noise_2d(f64::INFINITY, 0.0).is_nan());
    }

    #[test]
    fn perlin_noise_3d_should_return_zero_at_integer_lattice_coordinates() {
        assert_eq!(perlin_noise_3d(-3.0, 7.0, 11.0), 0.0);
    }

    #[test]
    fn perlin_noise_3d_should_wrap_gradients_every_256_lattice_cells() {
        let noise = perlin_noise_3d(12.125, -4.5, 9.75);
        let wrapped_noise = perlin_noise_3d(268.125, 251.5, 265.75);

        assert!((noise - wrapped_noise).abs() < 1e-14);
    }
}
