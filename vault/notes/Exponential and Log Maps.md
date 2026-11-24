---
tags: [theory, quaternion, lie-group]
aliases: [exp map, log map, boxplus, boxminus, rotation vector]
---
# Exponential and Log Maps

The bridge between **rotation vectors** $\boldsymbol\phi\in\mathbb R^3$ (where Gaussians, means and covariances work) and **unit quaternions** (where rotations compose).

## Definitions
**exp** — rotation vector → quaternion. With $\theta = \lVert\boldsymbol\phi\rVert$:
$$\exp(\boldsymbol\phi) = \left(\cos\tfrac\theta2,\ \ \frac{\boldsymbol\phi}{\theta}\sin\tfrac\theta2\right)$$
Small angle: $\exp(\boldsymbol\phi) \approx (1,\ \boldsymbol\phi/2)$. Use $\frac{\sin(\theta/2)}{\theta}\to\frac12$ to avoid dividing by 0.

**log** — quaternion → rotation vector. First flip to $w \ge 0$ (shortest rotation), then:
$$\log(q) = 2\,\operatorname{atan2}(\lVert\mathbf v\rVert,\ w)\ \frac{\mathbf v}{\lVert\mathbf v\rVert}$$
`atan2` is accurate at all angles, unlike `2*acos(w)`, which loses precision near 0 and throws when $|w|$ creeps above 1.

| | Original code | `ukf_core` |
|---|---|---|
| exp | `Quaternion.from_axis_angle` | `qexp` |
| log | `Quaternion.axis_angle` | `qlog` |

## ⊞ and ⊟ ("box-plus / box-minus")
These let you treat the rotation manifold as if it were a vector space, locally:
$$q \boxplus \boldsymbol\delta = \exp(\boldsymbol\delta)\otimes q \qquad\qquad q_1 \boxminus q_2 = \log(q_1\otimes q_2^{-1})$$
That's the **left / world-frame** version. The **right / body-frame** version is $q\otimes\exp(\boldsymbol\delta)$ and $\log(q_2^{-1}\otimes q_1)$.

> [!important] Pick one and stick to it
> Within one filter, sigma-point generation, the error vectors and the update must all use the same side. The two versions differ by a rotation of the error vector: $\boldsymbol\delta_{world} = R(q)\,\boldsymbol\delta_{body}$. A covariance written in one frame and applied in the other is wrong whenever $R(q)\neq I$ and $P$ isn't isotropic. → [[Code Review - Bugs and Fixes#1. Sigma points and error vectors in different frames|bug #1]]

## Uses in the UKF
| Step | Operation |
|---|---|
| Sigma points | $\mathcal X_i = q \boxplus W_i$ |
| Process model | $q_{k+1} = q_k\otimes\exp(\boldsymbol\omega\Delta t)$ (body-frame increment) |
| Mean | iterate $\mathbf e_i = q_i\boxminus\bar q$ → [[Quaternion Averaging]] |
| Covariance | $\mathcal W'_i = q_i \boxminus \bar q$ |
| Update | $q^+ = \bar q\boxplus K\nu$ |

## Lie-group view (optional)
Unit quaternions form the Lie group $S^3$; rotation vectors live in its Lie algebra $\mathfrak{so}(3)\cong\mathbb R^3$. exp/log are the standard maps between them. Further reading: Solà, Deray & Atchuthan, *"A micro Lie theory for state estimation in robotics"* (2018).

Next: [[Quaternion Averaging]]
