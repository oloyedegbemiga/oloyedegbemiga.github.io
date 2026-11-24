---
title: Library Robot
cover: "[[robot_overview.svg]]"
year: 2025
role: System Integration
skills:
  - "[[Embedded C]]"
  - "[[PCB Design]]"
  - "[[CAD]]"
  - "[[SLAM]]"
---

skills: [[CAD]], [[ROS 2]], [[Computer Vision]]
code: [Libot](https://github.com/virmani11kartik/flex_bot.git)


A fully operational autonomous mobile service robot designed for libraries, national archives, and document storage facilities. Built on a reverse-engineered Berkshire Grey FlexBot chassis, LiBOT navigates autonomously, avoids obstacles dynamically, interacts with patrons through a touchscreen interface, and performs a full range of library operations — all driven by the **SICK PicoScan 150 LiDAR with integrated IMU**.

## Robot Overview

![[robot_overview.jpeg | robot overview]]

LiBOT is built on a reverse-engineered **Berkshire Grey FlexBot** mobile base — a decommissioned unit from Berkshire Grey's autonomous fulfillment platform. The team disassembled the chassis, reverse engineered its drive electronics and low-level control architecture, and rebuilt it as a hybrid system supporting a custom humanoid service robot superstructure.

At the hardware abstraction layer runs an **NXP iMX7 single-board computer**, bridging the original FlexBot's battle-tested motor control and power management firmware with a fully open ROS 2 software environment above it.

## System Architecture

![[System_Architecture.jpg]]

| Parameter              | Specification                                       |
| ---------------------- | --------------------------------------------------- |
| Primary Sensor         | SICK PicoScan 150 LiDAR + Integrated IMU            |
| Secondary Localization | XSens IMU + Wheel Encoders (EKF fused)              |
| Navigation Mode        | Fully Autonomous (SLAM-based)                       |
| Obstacle Avoidance     | Real-time, LiDAR-driven + Control Barrier Functions |
| Patron Interface       | Touchscreen display + Natural Language AI           |
| Operating Environment  | Indoor, dynamic public spaces                       |
| Deployment Target      | Libraries, archives, document storage facilities    |