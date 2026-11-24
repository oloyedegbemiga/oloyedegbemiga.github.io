---
tags: [theory, kalman]
aliases: [Kalman filter, KF, EKF]
---
# Kalman Filter Basics

> [!abstract] TL;DR
> Keep a Gaussian belief $\mathcal N(\hat x, P)$. **Predict**: push it through the motion model and add process noise $Q$ (uncertainty grows). **Update**: blend in a measurement with noise $R$, weighting by the gain $K$ (uncertainty shrinks).

## Linear model
$$x_k = F x_{k-1} + w_k,\quad w_k\sim\mathcal N(0,Q) \qquad\qquad z_k = H x_k + v_k,\quad v_k\sim\mathcal N(0,R)$$

## The two steps
**Predict**
$$\bar x_k = F\hat x_{k-1}\qquad \bar P_k = F P_{k-1}F^T + Q$$
**Update**
$$\nu = z_k - H\bar x_k \quad\text{(innovation)}$$
$$S = H\bar P_kH^T + R \quad\text{(innovation covariance, } P_{vv}\text{ in the UKF)}$$
$$K = \bar P_kH^T S^{-1}$$
$$\hat x_k = \bar x_k + K\nu \qquad P_k = \bar P_k - K S K^T$$

## Intuition for the gain
1-D, measuring the state directly ($F=H=1$):
$$K = \frac{\bar P}{\bar P + R}$$
- $R \to 0$ (perfect sensor): $K\to1$, take the measurement.
- $\bar P\to0$ (perfect prediction): $K\to0$, ignore the measurement.

Only the **ratio** of prediction uncertainty to measurement uncertainty matters — which is why tuning is about Q/R ratios. → [[Tuning Guide#What each knob does]]

## Q and R in plain words
| | Q (process noise) | R (measurement noise) |
|---|---|---|
| Represents | how wrong the motion model can be per step | how noisy / wrong the sensor is |
| Increase it when | the system moves in ways the model misses | the sensor is noisy or its model is violated (e.g. linear acceleration hitting the accelerometer) |
| Effect | faster response, noisier | smoother, slower to correct |

## Health checks
- **Innovations** should be zero-mean and white. A persistent offset means a bias or model error (e.g. the legacy ‖a‖ = 10.48 vs 9.8). → [[Sensor Calibration]]
- **Consistency:** the actual error should match $\sqrt{\operatorname{diag}P}$. Error ≫ σ → over-confident (raise Q). Error ≪ σ → too timid.
- **NEES / NIS** are the formal versions: $\nu^TS^{-1}\nu$ should average to the measurement dimension.

## Non-linear models
Here, both the process model (quaternion integration) and the measurement model (rotating gravity) are non-linear.
- **EKF** — linearise with Jacobians $F = \partial f/\partial x$, $H = \partial h/\partial x$. Needs derivatives; first-order accurate.
- **UKF** — push a few well-chosen sample points (sigma points) through the real functions and measure the spread. No Jacobians; second-order accurate. → [[Unscented Transform]]

Next: [[Unscented Transform]]
