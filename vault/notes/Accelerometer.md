---
aliases:
  - MEMS Accelerometer
  - Accelerometer Tilt
tags:
  - electronics/imu
  - sensors/accelerometer
---

# Accelerometer

## What does it measure?

An **accelerometer** measures **specific force** along its three axes, in units of $\mathrm{m/s^2}$ or multiples of $g$ ($1g\approx9.81\,\mathrm{m/s^2}$).

A useful model in the sensor/body frame is:

$$
\mathbf f_m \approx \mathbf R^T(\mathbf a_{world}-\mathbf g_{world})+\mathbf b_a+\mathbf n_a
$$

where $\mathbf R$ rotates body coordinates into world coordinates. **At rest**, the accelerometer still registers approximately **1 g in magnitude** because it senses the supporting force opposing gravity. The measured sign depends on the axis orientation.

> [!note] Gravity-based tilt
> When linear acceleration is negligible, the measured specific-force vector is a gravity-direction reference. It can estimate **roll and pitch**, but it contains **no information about yaw** (rotation around the gravity vector).

## Estimating roll and pitch

For the common body-axis convention in which a level, stationary sensor reads approximately $(a_x,a_y,a_z)=(0,0,+g)$:

$$
\phi_{acc}=\operatorname{atan2}(a_y,a_z)
$$

$$
\theta_{acc}=\operatorname{atan2}\left(-a_x,\sqrt{a_y^2+a_z^2}\right)
$$

Here $\phi$ denotes roll and $\theta$ pitch. Results are in **radians** unless converted. These formulas depend on the coordinate/sign convention and assume that non-gravitational linear acceleration is small.

## What goes wrong?

| Issue | Why it matters |
|---|---|
| **Linear acceleration** | Acceleration from a vehicle, robot, or human motion is mixed with the gravity signal, causing false tilt |
| **Vibration** | High-frequency oscillations make readings noisy and can alias into the sampled signal |
| **Bias / zero-g offset** | Adds systematic error to measured acceleration and tilt |
| **Scale-factor / axis misalignment** | Changes magnitude and direction of the measured vector |
| **Temperature changes** | Bias and sensitivity can vary with temperature |
| **Saturation** | Accelerations beyond the selected ±g range are clipped |
| **Integration** | Estimating velocity/position requires integration, magnifying small bias and gravity-removal errors |

### Why not use acceleration alone for position?

For a constant acceleration error $b_a$, the approximate position error from double integration is:

$$
\Delta p(t)\approx\tfrac12 b_a t^2
$$

A $0.1\,\mathrm{m/s^2}$ constant error therefore becomes about **5 m of position error after 10 s**, even before considering attitude error. Reliable inertial navigation typically needs more information (e.g. GNSS, vision, wheel odometry, or motion constraints).

## Calibration basics

1. **Check units and axis orientation.** At rest, the magnitude should be near $g$, not zero.
2. **Collect several static orientations** (commonly $+X,-X,+Y,-Y,+Z,-Z$ aligned with gravity).
3. Use known $+g/-g$ values to estimate each axis' **offset and scale factor**; more advanced routines fit cross-axis misalignment as well.
4. Repeat or model calibration over temperature if accuracy requirements justify it.
5. Apply corrections before passing accelerometer readings to [[Sensor Fusion and Filtering|sensor fusion]].

For example, with one axis held at $+g$ and then $-g$, the raw mean measurements $a_+$ and $a_-$ give an approximate bias $(a_++a_-)/2$; their difference gives scale information.

## Handling bad gravity measurements

- Apply appropriate **low-pass/anti-alias filtering** and sample at a suitable rate.
- Down-weight accelerometer tilt updates during likely linear acceleration or high vibration.
- Use $\lVert\mathbf a\rVert\approx g$ as a *sanity check*, but remember that matching the magnitude of $g$ does **not** prove there is no linear acceleration.
- Record the timing of the accelerometer sample relative to the gyro sample.

## Relation to the gyroscope

The accelerometer offers a **long-term gravity reference** for roll/pitch but is unreliable as a tilt sensor during certain motions. The [[Gyroscope]] accurately captures brief rotations but drifts if integrated indefinitely. Their strengths motivate a [[Complementary Filter]] or [[Kalman Filter for IMUs]].

See also: [[6-DoF IMU]] · [[BMI088 - Hardware Connection]]

## Sources

- [NXP — What is Sensor Fusion?](https://www.nxp.com/company/about-nxp/smarter-world-blog/BL-SENSOR-FUSION)
- [Sensor calibration study — six-position static test](https://pmc.ncbi.nlm.nih.gov/articles/PMC10490716/)
- [Bosch Sensortec — BMI088 datasheet](https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmi088-ds001.pdf)