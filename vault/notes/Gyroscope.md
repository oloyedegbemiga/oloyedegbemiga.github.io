---
aliases:
  - MEMS Gyroscope
  - Gyroscope Drift
tags:
  - electronics/imu
  - sensors/gyroscope
---

# Gyroscope

## What does it measure?

A **gyroscope** reports **angular velocity** around its three measurement axes:

$$
\boldsymbol\omega_m =
\begin{bmatrix}\omega_x & \omega_y & \omega_z\end{bmatrix}^{T}
$$

Values are usually expressed in **degrees per second (°/s)** or **radians per second (rad/s)**. A gyro does **not** directly output angle: estimating orientation requires **integrating** angular velocity over time.

For one axis, approximately:

$$
\theta_k = \theta_{k-1}+(\omega_{m,k}-\hat b_k)\Delta t
$$

where $\hat b$ is the estimated zero-rate offset (bias), and $\Delta t$ is the elapsed time. For arbitrary 3D motion, orientation should be integrated using **rotation matrices or quaternions** rather than treating Euler-angle rates as independent gyro axes.

## Why does a gyroscope drift?

A useful measurement model is:

$$
\boldsymbol\omega_m = \mathbf S\boldsymbol\omega_{true}+\mathbf b(T,t)+\mathbf n
$$

- $\mathbf S$: scale-factor and axis-alignment errors (identity for an ideal sensor).
- $\mathbf b(T,t)$: **bias**, which can vary with temperature and time.
- $\mathbf n$: noise.

Because the rate is integrated, even a small constant bias accumulates into an ever-growing angle error:

$$
\theta_{error}(t)\approx b\,t
$$

**Example:** If the true rate is zero but the measured rate contains a constant offset of $0.5^\circ/\mathrm{s}$, the estimate drifts by roughly **30° after one minute**. Random rate noise also produces orientation uncertainty that increases with time.

> [!warning] Calibration helps, but does not eliminate drift
> A one-time startup bias estimate removes the offset present **at that temperature and time**. The offset may change as the device heats, ages, or experiences different conditions.

## Basic stationary calibration

1. Mount the IMU rigidly and allow startup/settling time.
2. Keep the sensor **completely still**; rotation during this step corrupts the estimate.
3. Read $N$ samples for all three axes.
4. Compute the mean for each axis:

$$
\hat{\mathbf b}=\frac{1}{N}\sum_{i=1}^{N}\boldsymbol\omega_{m,i}
$$

5. Subtract that mean from future samples:

$$
\boldsymbol\omega_{corrected}=\boldsymbol\omega_m-\hat{\mathbf b}
$$

This estimates **zero-rate bias**, not scale factor, cross-axis alignment, or temperature variation. These require known rotation rates / multiple calibration conditions or a more detailed model.

### More rigorous calibration

- Measure zero-rate bias at several temperatures; store a temperature compensation model.
- Apply known rates with a rotation-rate fixture to estimate scale factors.
- Estimate sensor-to-body axis alignment if the IMU is mounted at an angle.
- Re-estimate bias during confidently detected stationary periods; use care not to mistake slow rotation for zero motion.

## Typical issues

| Error source | Effect on estimated orientation |
|---|---|
| Constant bias | Approximately linear growth of angle error |
| Temperature-dependent bias | Drift changes as the IMU warms or cools |
| Measurement noise | Accumulated orientation uncertainty |
| Scale-factor error | Under- or overestimated rotation angle |
| Sampling/time-stamp error | Integration error, particularly during fast movement |
| Saturation | Lost rotation information when rate exceeds selected range |

## Why fusion is needed

Gyros are excellent at detecting **short-term changes**. They do not provide a long-term absolute roll/pitch reference on their own. The gravity direction estimated by an [[Accelerometer]] can correct low-frequency tilt drift through a [[Complementary Filter]] or [[Kalman Filter for IMUs]]. However, gravity alone cannot correct **yaw** about the gravity axis.

See also: [[6-DoF IMU]] · [[Sensor Fusion and Filtering]] · [[BMI088 - Hardware Connection]]

## Sources

- [Analog Devices — AN-1049: Calibrating iMEMS Gyroscopes](https://www.analog.com/en/resources/app-notes/an-1049.html)
- [Bosch Sensortec — BMI088 datasheet](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmi088-ds001.pdf)