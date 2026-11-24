
---
aliases:
  - IMU Complementary Filter
  - Complementary Orientation Filter
tags:
  - electronics/imu
  - signal-processing/filters
---

# Complementary Filter

## Idea

A **complementary filter** combines the **fast, smooth changes** from a [[Gyroscope]] with the **long-term gravity reference** from an [[Accelerometer]]. Conceptually, it trusts:

- Gyro integration more over **short timescales** (high-frequency orientation changes).
- Accelerometer tilt more over **long timescales** (low-frequency gravity reference).

It is a common first choice for [[Sensor Fusion and Filtering|sensor fusion]] on a [[6-DoF IMU]].

## One-axis roll/pitch equation

$$
\hat\theta_k = \alpha\left(\hat\theta_{k-1} + (\omega_{m,k}-\hat b)\Delta t\right) + (1-\alpha)\theta_{acc,k}
$$

where:

- $\hat\theta_k$ is the updated angle estimate.
- $\omega_{m,k}$ is the measured angular rate (same angular units per second as $\theta$).
- $\hat b$ is the estimated gyro bias.
- $\theta_{acc,k}$ is the tilt estimated from acceleration when it is gravity-dominated.
- $\Delta t$ is the **measured time interval** in seconds.
- $0\le\alpha\le1$ sets the relative reliance on the predicted gyro angle.

For a simple first-order filter, a practical choice is:

$$
\alpha=\frac{\tau}{\tau+\Delta t}, \qquad \tau=\frac{1}{2\pi f_c}
$$

where $f_c$ is the approximate blending cutoff and $\tau$ is a time constant. Larger $\alpha$ means **slower accelerometer correction**.

> [!example] At 100 Hz
> With $\Delta t=0.01\,s$ and $\alpha=0.98$, each update uses about **98%** of the gyro-predicted estimate and **2%** of the measured accelerometer tilt. This does **not** mean the gyro always contributes 98% to orientation; the filter's effective contribution varies by frequency and through repeated updates.

## Simple pseudocode (one roll or pitch axis)

```python
# Angles/rates must use consistent units (e.g., radians and rad/s).
# axis_rate must correspond to the chosen tilt coordinate,
# a small-angle simplification for one-axis motion.

dt = sample_time_seconds
alpha = tau / (tau + dt)
gyro_prediction = angle_estimate + (axis_rate - gyro_bias) * dt
angle_estimate = alpha * gyro_prediction + (1 - alpha) * accel_tilt
```

A full 3D implementation should propagate a **quaternion** with gyro rates and correct it toward the measured gravity vector. Applying separate Euler-angle filters can become inaccurate during coupled or large-angle rotations.

## Tuning and limitations

1. Correct [[Gyroscope#Basic stationary calibration|gyro bias]] before integration.
2. Choose an output data rate and accurately measure $\Delta t$.
3. Begin with a relatively high gyro prediction weight, then tune for the application's motion and noise.
4. When vibration or linear acceleration is high, **reduce accelerometer correction**; otherwise the filter can interpret acceleration as tilt.
5. Test static, slow tilt, fast rotation, temperature transitions, and sustained translational acceleration.

**Limitation:** A 6-axis complementary filter can stabilize roll and pitch but **cannot anchor yaw** without additional heading information.

## When to move beyond it

Consider a [[Kalman Filter for IMUs]] when you need an explicit time-varying gyro bias estimate, covariance/uncertainty, variable measurement quality, or additional sensor inputs. A simple complementary filter is not necessarily worse for every application; correct calibration and timing often matter more than algorithm complexity.

See also: [[Sensor Fusion and Filtering]] · [[Accelerometer]] · [[BMI088 - Hardware Connection]]

## Sources

- [MathWorks — Determine Orientation Using Inertial Sensors](https://www.mathworks.com/help/fusion/gs/determine-orientation-through-sensor-fusion.html)
- [MathWorks — Choose Inertial Sensor Fusion Filters](https://www.mathworks.com/help/fusion/ug/introduction-on-choosing-inertial-sensor-fusion-filters.html)