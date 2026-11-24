---
title: BULMA
summary: A Semi-Autonomous Differential Drive Robot
cover: "[[rc_car.svg]]"
year: "2024"
featured: true
role: Sensor integration and controls
skills: 
    - "[[Embedded C]]"
    - "[[CAD]]"
---

**Semi-Autonomous Differential Drive Robot**

**Overview**

Designed and built a **semi-autonomous differential-drive mobile robot** capable of navigating a game course using closed-loop motor control, absolute position tracking, and onboard sensors.

The robot used an **ESP32-S2 microcontroller** for control and Wi-Fi communication. An HTC Vive tracking system provided position and orientation data for localization, while wheel encoders enabled PID-based motion control.

Time-of-Flight (ToF) sensors provided additional environmental sensing for wall-following and obstacle detection.

[!info] Robot Overview  
**Image:** Full view of the assembled robot.

  

![[BULMA.jpeg]]

**System Architecture**

**Hardware**

|   |   |
|---|---|
|**Component**|**Function**|
|ESP32-S2|Main controller and Wi-Fi communication|
|HTC Vive Tracker|Absolute XY position and orientation|
|Wheel Encoders|Wheel motion feedback for PID control|
|ToF Sensors|Wall detection and obstacle sensing|
|Differential Drive|Robot locomotion|
|Custom Chassis|Structural support for electronics and drivetrain|

**Control and Localization**

**PID Motor Control**

- Implemented closed-loop control using wheel encoder feedback.
- Used PID control to regulate wheel motion and improve navigation accuracy.

**HTC Vive Localization**

- Used the HTC Vive Lighthouse tracking system for absolute XY localization.
- Obtained position and orientation measurements to support autonomous navigation.
- Integrated localization and sensor feedback into the robot’s control system.

**Environmental Sensing**

- Integrated Time-of-Flight sensors communicating over the **I²C bus**.
- Used distance measurements to support wall-following and obstacle detection.

**Mechanical Design and Fabrication**

Designed and hand-built a custom chassis using a combination of:

- **Laser-cut components** for the primary structural elements.
- **3D-printed parts** for custom mounting and mechanical integration.

The chassis accommodated the differential-drive system, onboard electronics, and sensors.

[!example] Mechanical Design  
**Suggested image:** CAD model, chassis assembly, or fabrication photo.

  

![[robot-chassis-design.png]]

**Key Technical Areas**

- **Embedded Systems:** ESP32-S2 firmware and Wi-Fi communication.
- **Control Systems:** PID control with wheel encoder feedback.
- **Robotics:** Differential-drive kinematics and autonomous navigation.
- **Localization:** HTC Vive Lighthouse position and orientation tracking.
- **Sensor Integration:** I²C communication with ToF distance sensors.
- **Mechanical Fabrication:** Laser cutting, 3D printing, and custom assembly.

**Project Summary**

Developed a semi-autonomous robotic platform combining embedded control, position tracking, distance sensing, and custom mechanical fabrication. The project integrated **PID-based wheel control**, **HTC Vive localization**, and **ToF environmental sensing** to support navigation through a game course.

