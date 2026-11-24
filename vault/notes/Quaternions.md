---
tags: [theory, quaternion, rotation]
aliases: [Quaternion, Unit quaternion, Hamilton product]
---
# Quaternions

> [!abstract] TL;DR
> A **unit quaternion** $q = (\cos\frac\theta2,\ \mathbf u\sin\frac\theta2)$ encodes a rotation of angle θ about unit axis **u**. Rotations compose by quaternion multiplication, there is no gimbal lock, and only 4 numbers + 1 constraint are needed. $q$ and $-q$ are the same rotation.

## Definition
$$q = q_0 + q_1 i + q_2 j + q_3 k, \qquad i^2 = j^2 = k^2 = ijk = -1$$
From that rule: $ij = k,\ jk = i,\ ki = j$ but $ji = -k,\ kj=-i,\ ik=-j$ — **multiplication is not commutative**.

Scalar–vector form (used in this project, scalar first): $q = (s,\ \mathbf v) = [q_0, q_1, q_2, q_3]$.

## Operations
| Operation | Formula | Code |
|---|---|---|
| Product | $(s_1,\mathbf v_1)\otimes(s_2,\mathbf v_2) = (s_1 s_2 - \mathbf v_1\!\cdot\!\mathbf v_2,\ \ s_1\mathbf v_2 + s_2\mathbf v_1 + \mathbf v_1\times\mathbf v_2)$ | `Quaternion.__mul__`, `qmul` |
| Conjugate | $q^* = (s, -\mathbf v)$ | `qconj` |
| Norm | $\lVert q\rVert = \sqrt{s^2 + \lVert\mathbf v\rVert^2}$ | `np.linalg.norm` |
| Inverse | $q^{-1} = q^*/\lVert q\rVert^2$ ( $= q^*$ for unit $q$ ) | `Quaternion.inv` |
| Identity | $(1, \mathbf 0)$ | `Quaternion()` |

The cross product term $\mathbf v_1\times\mathbf v_2$ is what makes $\otimes$ non-commutative — just like rotations.

## Unit quaternions are rotations
Rotation by angle θ about unit axis **u**:
$$q = \left(\cos\tfrac\theta2,\ \mathbf u\sin\tfrac\theta2\right)$$
Rotate a vector **v** by embedding it as a pure quaternion $(0,\mathbf v)$:
$$(0,\ \mathbf v') = q \otimes (0,\ \mathbf v) \otimes q^{-1}$$
The inverse rotation (world → body in this project) is $q^{-1}\otimes(0,\mathbf v)\otimes q$ — exactly the accelerometer model in `gen_z_set` / `qrotate_inv`.

> [!example] Worked example — 90° about z
> $q = (\cos 45°,\ 0,\ 0,\ \sin 45°) = (0.7071,\ 0,\ 0,\ 0.7071)$.
> Rotating $\mathbf x = (1,0,0)$ gives $(0,1,0)$: x turns into y, as expected for a positive yaw.

### Why half the angle?
The sandwich $q\,v\,q^{-1}$ applies $q$ twice (once from each side), so each side carries θ/2.

### Double cover
$q$ and $-q$ give the same rotation (the signs cancel in the sandwich). The unit quaternions (the 3-sphere $S^3$) cover the rotations $SO(3)$ twice. Consequence: when you compare or average quaternions, **pick the sign with $q_0 \ge 0$** first, otherwise two identical rotations look 360° apart. → [[Code Review - Bugs and Fixes#4. `axis_angle()` — no shortest path, no clipping|bug #4]]

## Composition and frames
In this project $q$ rotates **body → world**.
- A **body-frame** increment (e.g. gyro rotation $\omega\Delta t$) multiplies on the **right**: $q_{k+1} = q_k \otimes \exp(\omega\Delta t)$.
- A **world-frame** increment multiplies on the **left**: $q' = \exp(\delta) \otimes q$.

Mixing the two by accident is exactly [[Code Review - Bugs and Fixes#1. Sigma points and error vectors in different frames|bug #1]].

## Kinematics
For body angular velocity $\boldsymbol\omega$:
$$\dot q = \tfrac12\, q \otimes (0,\ \boldsymbol\omega)$$
With ω constant over Δt the exact solution is $q(t+\Delta t) = q(t)\otimes\exp(\boldsymbol\omega\Delta t)$, using the [[Exponential and Log Maps|exponential map]]. That's the UKF process model.

## Quaternion → rotation matrix
For unit $q = (w, x, y, z)$:
$$R(q) = \begin{bmatrix}
1-2(y^2+z^2) & 2(xy - wz) & 2(xz + wy)\\
2(xy + wz) & 1-2(x^2+z^2) & 2(yz - wx)\\
2(xz - wy) & 2(yz + wx) & 1-2(x^2+y^2)
\end{bmatrix}$$
Composition matches: $R(q_1\otimes q_2) = R(q_1)\,R(q_2)$.

## Why quaternions for a filter?
| | Euler angles | Rotation matrix | Quaternion |
|---|---|---|---|
| Numbers | 3 | 9 | 4 |
| Constraints | none | 6 (orthonormal, det 1) | 1 (unit norm) |
| Singularities | gimbal lock | none | none |
| Composition | messy trig | matrix product | quaternion product |
| Renormalising | — | SVD / Gram-Schmidt | divide by norm |

The catch: a quaternion has 4 numbers but only 3 DOF, so you can't put it straight into a Gaussian. The UKF keeps a 3-D error covariance and moves between spaces with exp/log → [[Quaternion UKF (Kraft)]].

## Self-check
- [ ] What quaternion rotates 180° about x? *(0, 1, 0, 0)*
- [ ] Is $q_1\otimes q_2 = q_2\otimes q_1$? *(only if the vector parts are parallel)*
- [ ] Why must you flip $q$ to $q_0\ge0$ before taking a log? *(double cover → shortest rotation)*

Next: [[Rotation Representations]] · [[Exponential and Log Maps]]
