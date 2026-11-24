---
title: Tracking Robot Orientation
cover: "[[ukf_tuner.svg]]"
year: 2026
role: Sole
skills:
  - "[[State Estimation and Sensor Fusion]]"
---
A robot that moves through 3-D space needs to know which way it is facing. This project estimates that orientation (roll, pitch and yaw) from a low-cost inertial sensor, using an [[Unscented Kalman Filter | Unscented Kalman Filter]] built on [[Quaternions]]. An optical motion-capture system serves as ground truth to calibrate and evaluate the result.

## The problem

An **inertial measurement unit (IMU)** combines two sensors:

- A **gyroscope**, which measures how fast the robot is rotating. Integrating it gives orientation that is smooth and responsive, but small errors accumulate, so the estimate drifts over time.
- An **accelerometer**, which measures the pull of gravity. Gravity points "down", which gives a drift-free reference for roll and pitch, but the signal is noisy and gets corrupted whenever the robot accelerates.

The two sensors complement each other: the gyroscope is trustworthy in the short term, the accelerometer in the long term. A Kalman filter blends them according to how uncertain each one currently is.

The accelerometer cannot help with **yaw** (heading). Rotating about the vertical axis does not change the direction of gravity, so yaw is *unobservable* from these sensors alone and slowly drifts. The filter reflects this honestly: its yaw uncertainty grows over time while its roll and pitch uncertainty stays small.

Ground truth comes from **Vicon**, a set of cameras that track the robot's orientation to a fraction of a degree. It is only used offline, to calibrate the sensors and measure how good the filter is, just as a real robot would be calibrated in a lab against an expensive instrument before running on its cheap sensors.

## Concepts

### Quaternions
Orientation is represented as a **unit quaternion**, four numbers `q = (cos θ/2, u·sin θ/2)` describing a rotation by angle θ about the axis **u**. Compared with the alternatives:

| Representation | Numbers | Problem |
|---|---|---|
| Euler angles (roll, pitch, yaw) | 3 | Gimbal lock; order-dependent |
| Rotation matrix | 9 | Redundant; drifts from orthonormal |
| Unit quaternion | 4 | None for rotation; just one constraint (unit length) |

Rotations combine by quaternion multiplication, which is not commutative, just like rotations themselves. A quaternion and its negative describe the same rotation, so comparisons always use the shortest path.

### Exponential and logarithm maps
A Kalman filter assumes its state can be added, subtracted and averaged, but a quaternion cannot: adding two of them leaves the unit sphere. The **exponential map** converts a small 3-D rotation vector into a quaternion, and the **logarithm map** converts back. With them, uncertainty is kept as an ordinary 3-D Gaussian around the current quaternion, and updates are applied as small rotations.

### Quaternion averaging
The filter needs the mean of a cloud of quaternions. Averaging their components does not work (the result is not a rotation, and `q` and `-q` cancel). Instead the mean is found iteratively: average the rotation errors between each quaternion and the current guess, rotate the guess by that average, and repeat until it stops moving.

### The Unscented Kalman Filter
The motion model (integrating rotation) and the sensor model (rotating gravity into the sensor's frame) are both non-linear. Rather than linearising them with Jacobians, as an Extended Kalman Filter does, the UKF pushes a small set of carefully chosen **sigma points** through the true functions and measures how they spread. This captures the mean and covariance to second order without any derivatives.

Here the state has 7 numbers (quaternion plus angular velocity) but only 6 degrees of freedom, so the filter uses 12 sigma points and a 6×6 covariance. Each time step it:

1. generates sigma points around the current estimate, spread according to its uncertainty;
2. predicts forward by rotating each one with the angular velocity;
3. recombines them into a predicted orientation and covariance, using the quaternion mean above;
4. predicts what the accelerometer and gyroscope *should* read for each point;
5. compares that with the actual readings and corrects the estimate in proportion to the Kalman gain.

### Sensor calibration and noise
Real sensors have constant offsets (bias), gain errors (scale) and random noise. Bias and scale are estimated from the robot's resting period and by comparing against Vicon. The remaining knobs are the **process noise** (how much the motion model is trusted) and the **measurement noise** (how much each sensor is trusted); only their ratios matter, so tuning is about balancing how quickly the accelerometer is allowed to correct the gyroscope.

## Results

The filter was evaluated on two recordings, comparing its estimate against Vicon at matching timestamps. Two error measures are used:

- **Tilt error**: the angle between the estimated and true "down" direction. This is the roll and pitch part the accelerometer can observe.
- **Total rotation error**: the full 3-D angle between estimated and true orientation, which also includes yaw drift.

| Dataset | Mean tilt error | Mean total error | Roll RMSE | Pitch RMSE | Yaw RMSE |
|---|---|---|---|---|---|
| 1 | 1.18° | 4.43° | 1.00° | 1.12° | 4.71° |
| 2 | 1.35° | 4.84° | 1.05° | 1.97° | 4.75° |

Euler RMSE values exclude the moments when the true pitch passes beyond 70°, where roll and yaw become ill-defined (gimbal lock).

![Estimated roll, pitch and yaw compared with Vicon on dataset 2](images/orientation_dataset2.png)

![Tilt and total rotation error over time, dataset 2](images/error_dataset2.png)

## Interactive tuning interface

A browser-based interface makes the filter's settings easy to explore. Sliders control the process and measurement noise, and fields control every sensor bias and scale. Each change re-runs the filter in about a second and updates the metrics and plots ( I build this with assistance from Claude).

![The tuning interface](images/tuner_interface.png)

It provides:

- headline metrics (tilt, total, roll, pitch and yaw error) updated live;
- tabs for orientation against Vicon, error over time, raw and filtered IMU signals, and the filter's uncertainty and innovations;
- a way to pin one run and compare another against it;
- one-click calibration from the resting period and from Vicon;
- a log of every run that can be exported, along with the chosen settings.

## Limitations and future work

- Settings were tuned on the same two recordings used to report results, so performance on new data may differ.
- Yaw cannot be corrected without a second reference direction, such as a magnetometer or camera.
- Fast manoeuvres corrupt the accelerometer's gravity reading; adapting its noise to the measured acceleration would help.
- Gyroscope bias is calibrated beforehand rather than estimated by the filter; adding it to the state would let the filter track slow drift.

## Reference

E. Kraft, "A Quaternion-based Unscented Kalman Filter for Orientation Tracking," *Proceedings of the 6th International Conference on Information Fusion*, 2003.
