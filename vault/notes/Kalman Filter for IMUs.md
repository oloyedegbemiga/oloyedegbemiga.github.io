
---
aliases:
  - Kalman Filter IMU
  - IMU Kalman Filter
  - Extended Kalman Filter IMU
tags:
  - electronics/imu
  - signal-processing/filters
---

# Kalman Filter for IMUs

## Why use a Kalman filter?

A **Kalman filter (KF)** estimates a hidden state from a **process model** and **noisy measurements**, while tracking estimate uncertainty. For a [[6-DoF IMU]] it can combine gyro-based changes with gravity-based tilt measurements and can explicitly estimate gyro bias.

Unlike a fixed-gain [[Complementary Filter]], a KF uses process covariance $Q$ and measurement covariance $R$ to determine the correction gain. Neither technique fixes a missing physical measurement: **yaw is still not absolutely observable from gyro + accelerometer alone**.

## Minimal 1-axis example: angle and gyro bias

Let the state be:

$$
\mathbf x_k=\begin{bmatrix}\theta_k\\ b_k\end{bmatrix}
$$

and assume $b$ changes slowly. Using a measured gyro rate $\omega_{m,k}$ and sample interval $\Delta t$:

$$
\underbrace{\mathbf x_k^-}_{\text{predicted state}} =
\underbrace{\begin{bmatrix}1&-\Delta t\\0&1\end{bmatrix}}_{F}
\mathbf x_{k-1}^+
+
\underbrace{\begin{bmatrix}\Delta t\\0\end{bmatrix}}_{B}\omega_{m,k}
$$

The **prediction covariance** is:

$$
P_k^-=F P_{k-1}^+F^T+Q
$$

The accelerometer, when gravity-dominated, supplies a tilt observation:

$$
z_k=\theta_{acc,k},\qquad H=\begin{bmatrix}1&0\end{bmatrix}
$$

The measurement update is:

$$
\begin{aligned}
\mathbf y_k&=z_k-H\mathbf x_k^- &&\text{innovation}\\
S_k&=H P_k^-H^T+R &&\text{innovation variance}\\
K_k&=P_k^-H^TS_k^{-1} &&\text{Kalman gain}\\
\mathbf x_k^+&=\mathbf x_k^-+K_k\mathbf y_k &&\text{corrected state}\\
P_k^+&=(I-K_kH)P_k^-(I-K_kH)^T+K_kRK_k^T
\end{aligned}
$$

The last line is the numerically stable **Joseph-form covariance update**.

> [!note] How the uncertainty controls fusion
> Larger $R$ indicates that the **accelerometer-derived angle is less trustworthy**, so the update corrects the gyro prediction less. Larger $Q$ indicates more uncertainty in the motion/bias prediction. Selecting $Q$ and $R$ is a modeling and tuning problem, not a universal fixed recipe.

## Practical steps

1. Estimate startup gyro bias using [[Gyroscope#Basic stationary calibration|stationary calibration]].
2. Initialize roll/pitch from a stable [[Accelerometer|gravity-based tilt]] reading.
3. Convert raw BMI088 values to consistent units and use accurate timestamps.
4. Define reasonable initial covariance $P$, process covariance $Q$, and measurement variance $R$.
5. At each sample, **predict** using gyro measurements; when accelerometer tilt is reliable, **update**.
6. During strong vibration/translation, increase $R$ or skip that observation, with care.
7. Validate the estimated gyro bias, residuals, tilt response, and uncertainty against controlled tests.

## KF vs. EKF

The example above is a **linear small-scope angle/bias model**, useful for learning and for mostly independent roll/pitch axes. Full 3D orientation is nonlinear; a practical filter often uses a **quaternion-based extended Kalman filter (EKF)** or **error-state Kalman filter** to model the relationship between rotation and sensed gravity properly.

### Important limitation

An EKF cannot recover absolute heading without an external heading reference. It may track a **relative yaw angle**, but unobservable yaw bias eventually leads to drift. Add an appropriate magnetometer, visual reference, or other heading measurement if needed.

See also: [[Complementary Filter]] · [[Sensor Fusion and Filtering]] · [[6-DoF IMU]] · [[BMI088 - Hardware Connection]]

## Sources

- [MathWorks — Determine Orientation Using Inertial Sensors](https://www.mathworks.com/help/fusion/gs/determine-orientation-through-sensor-fusion.html)
- [MathWorks — Choose Inertial Sensor Fusion Filters](https://www.mathworks.com/help/fusion/ug/introduction-on-choosing-inertial-sensor-fusion-filters.html)
- [NXP — Sensor Fusion Library for Kinetis MCUs](https://www.nxp.com/docs/en/data-sheet/NSFK_DS.pdf)