---
tags: [theory, ukf, kalman]
aliases: [UKF]
---
# Unscented Kalman Filter

[[Kalman Filter Basics|Kalman filter]] structure + [[Unscented Transform]] for every non-linear step.

## Model
$$x_k = f(x_{k-1}, u_k) + w_k \qquad z_k = h(x_k) + v_k \qquad w\sim\mathcal N(0,Q),\ v\sim\mathcal N(0,R)$$

## Algorithm (additive noise)
**Predict**
1. Sigma points from $(\hat x_{k-1}, P_{k-1})$: $\ \chi_i$
2. Propagate: $\ \mathcal Y_i = f(\chi_i)$
3. Prior: $\ \bar x = \sum W_i\mathcal Y_i,\quad \bar P = \sum W_i(\mathcal Y_i-\bar x)(\cdot)^T + Q$

**Update**
4. Predicted measurements: $\ \mathcal Z_i = h(\mathcal Y_i),\quad \bar z = \sum W_i\mathcal Z_i$
5. $P_{zz} = \sum W_i(\mathcal Z_i-\bar z)(\cdot)^T,\quad P_{vv} = P_{zz} + R,\quad P_{xz} = \sum W_i(\mathcal Y_i-\bar x)(\mathcal Z_i-\bar z)^T$
6. $K = P_{xz}P_{vv}^{-1}$
7. $\hat x = \bar x + K(z-\bar z),\quad P = \bar P - KP_{vv}K^T$

Compare with the linear KF: $P_{xz}$ plays the role of $\bar PH^T$, and $P_{vv}$ that of $S$.

## Where does Q go?
- **Additive after propagation** (above): $\bar P = \ldots + Q$.
- **Before the sigma points** (Kraft, and this project): sigma points are drawn from $P + Q$, so process noise is also pushed through $f$. Slightly more accurate when noise enters non-linearly (orientation noise does).
- **Augmented state**: add the noise to the state, $n \to n + n_w$, and draw sigma points over everything. Most general, most expensive.

## Reusing sigma points
Here the update reuses the propagated points $\mathcal Y_i$ instead of redrawing from $(\bar x, \bar P)$. Cheaper, and it keeps the higher-order information from the prediction. Redrawing is also valid.

## UKF vs EKF
| | EKF | UKF |
|---|---|---|
| Linearisation | Jacobians at the mean | sigma points through real functions |
| Accuracy | 1st order | 2nd order (mean and covariance) |
| Derivatives needed | yes | no |
| Cost | ~1 evaluation of f, h | 2n+1 evaluations |
| Manifold states (quaternions) | error-state EKF | needs ⊞/⊟ → [[Quaternion UKF (Kraft)]] |

Next: [[Quaternion UKF (Kraft)]]
