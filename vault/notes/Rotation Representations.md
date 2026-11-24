---
tags: [theory, rotation]
aliases: [Euler angles, Gimbal lock, Axis-angle, Rotation matrix]
---
# Rotation Representations

| Representation | Params | Pros | Cons | In this project |
|---|---|---|---|---|
| Rotation matrix $R\in SO(3)$ | 9 | unique, easy to apply | redundant, drifts from orthonormal | Vicon ground truth `rots` |
| Axis-angle / rotation vector $\boldsymbol\phi = \theta\mathbf u$ | 3 | minimal, great for small errors | singular-ish at θ = 2π, not composable by addition | UKF error state, sigma offsets |
| Unit [[Quaternions\|quaternion]] | 4 | no singularity, cheap composition | double cover, 1 constraint | UKF state |
| Euler angles (ZYX) | 3 | human-readable | gimbal lock, order-dependent | output roll / pitch / yaw |

## Rotation matrix
Columns are the body axes expressed in the world frame. $R^TR = I$, $\det R = 1$. Inverse = transpose. Body → world: $\mathbf v_w = R\,\mathbf v_b$.

## Axis-angle
Rodrigues' formula, with $[\mathbf u]_\times$ the skew matrix of **u**:
$$R = I + \sin\theta\,[\mathbf u]_\times + (1-\cos\theta)[\mathbf u]_\times^2$$
Going back: $\theta = \arccos\frac{\operatorname{tr}R - 1}{2}$, $[\mathbf u]_\times = \frac{R-R^T}{2\sin\theta}$ — **undefined at θ = 0 and π**, the issue in `from_rotm` ([[Code Review - Bugs and Fixes#6. `from_rotm()` divides by sin θ|bug #6]]).

## Matrix → quaternion
Robust (Shepperd) method: pick the largest of $\operatorname{tr}R,\ R_{00},\ R_{11},\ R_{22}$ and divide by the square root of that, so you never divide by ~0. If $\operatorname{tr}R > 0$:
$$w = \tfrac12\sqrt{1+\operatorname{tr}R},\quad x = \frac{R_{21}-R_{12}}{4w},\quad y = \frac{R_{02}-R_{20}}{4w},\quad z = \frac{R_{10}-R_{01}}{4w}$$
(`ukf_core.rotm_to_quat` implements all four branches.)

## Euler angles (ZYX)
Yaw ψ about z, then pitch θ about the new y, then roll φ about the new x:
$$R = R_z(\psi)\,R_y(\theta)\,R_x(\phi)$$
From a quaternion (same as `Quaternion.euler_angles` and `quat_to_euler`):
$$\phi = \operatorname{atan2}\big(2(wx+yz),\ 1-2(x^2+y^2)\big)$$
$$\theta = \arcsin\big(2(wy-zx)\big)$$
$$\psi = \operatorname{atan2}\big(2(wz+xy),\ 1-2(y^2+z^2)\big)$$
Clip the arcsin argument to [−1, 1].

## Gimbal lock
At θ = ±90° the first and last rotation axes line up: roll and yaw rotate about the same physical axis. Only their difference (θ = +90°) or sum (θ = −90°) is defined:
$$R\big|_{\theta=+90°} = \begin{bmatrix}0 & \sin(\phi-\psi) & \cos(\phi-\psi)\\ 0 & \cos(\phi-\psi) & -\sin(\phi-\psi)\\ -1 & 0 & 0\end{bmatrix}$$

> [!warning] What this means for evaluation
> Both datasets pass through pitch ≈ ±89°. There Vicon's own roll and yaw swing by ±180° within a few samples, so **any** estimate gets a huge Euler error even when the actual rotation error is 2°. That's why the project reports:
> - **Tilt error** — angle between the true and estimated gravity direction
> - **Total (geodesic) error** — $\lVert\log(q_{true}^{-1}\otimes q_{est})\rVert$
> - Euler RMSE only where |pitch| < 70°
>
> See the grey bands in [[Results#Dataset 1]].

## Distance between rotations
The geodesic distance — the angle of the rotation that takes one to the other:
$$d(q_1, q_2) = \lVert\log(q_1^{-1}\otimes q_2)\rVert = 2\arccos|\langle q_1,q_2\rangle|$$
The absolute value handles the double cover.

Next: [[Exponential and Log Maps]] · back to [[Quaternions]]
