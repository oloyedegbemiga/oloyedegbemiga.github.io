---
title: PCB for a model rocket flight computer
cover: "[[pcb_layout.svg]]"
year: 2026
role: sole 
skills:
  - "[[PCB Design]]"
---

skills: [[CAD]], [[ROS 2]], [[Computer Vision]]
code: [Libot](https://github.com/virmani11kartik/flex_bot.git)

The first step in any [[PCB Design|PCB design]] is figuring out what functions we need it to perform. In the case of a model rocket, we want our flight computer to monitor the rocket’s orientation and flight state. We also want our rocket to return safely and survive its landing using a parachute recovery system. Ideally, the parachute should be deployed at maximum altitude (apogee) to allow for a controlled descent.

## **Sensor and Actuator Selection**

Now that we have defined our objectives, we need to determine which sensors and actuators are required to achieve them and design our circuit around those requirements.

### **Sensors**

1. **[[6-DoF IMU|IMU]]:** To monitor the rocket’s motion and orientation during flight, we use an inertial measurement unit (IMU).
2. **Barometer:** We also need to measure the rocket’s altitude and identify when it reaches apogee. For this, we use a barometer.
3. **[[Building a Voltmeter Using Voltage Divider and ADC|Voltmeter]]:** This is a useful addition for monitoring the battery voltage and estimating its state of charge.

### **Actuators and Outputs**

1. **Servo motors:** Part of the rocket’s flight control system.
2. **Parachute deployment mechanism:** Used for the rocket’s recovery system.
3. **Pyrotechnic outputs:** Part of the rocket’s ignition system.
4. **Buzzer and RGB LED:** Used to indicate the rocket’s flight state and provide audible and visual feedback.

### **Microcontroller**

For its ease of use and available features, we decided to base our flight computer on an ESP32 microcontroller.

### **Data Logging**

To store flight data for post-flight analysis, we also included a microSD card holder.

## **Component Selection**

Now that we know what peripherals we need, we can select the individual components for our PCB.

**Sensors:**

- BMI088 (3-axis gyroscope and 3-axis accelerometer)
- BMP388 (barometer)
- Voltmeter

**Actuators and Outputs:**

- Servo ports
- Recovery and ignition outputs
- Buzzer
- RGB LED

**Microcontroller:**

- ESP32-WROOM-32E

**Data Storage:**

- MicroSD card holder

**Additional Components:**

- CH340 USB-to-UART bridge, which is relatively straightforward to implement but may require a driver.
- CP2102, which can also be used as an alternative USB-to-UART bridge.
- S8050 BJTs for the automatic reset circuit.

## **Power Management**

Since our components operate at different voltage levels, we need multiple power rails on our PCB. We use a 3.3 V rail for the ESP32 and its associated peripherals and a 5 V rail for the servos. The flight computer is powered by a LiPo battery.

## **Current Draw Analysis**

Before finalizing our power management circuit, we need to estimate how much current each component draws. This helps us understand the power requirements of the flight computer.

|**Component**|**3.3 V Rail (mA)**|
|---|---|
|ESP32 (Bluetooth enabled, Wi-Fi disabled)|130|
|BMI088|5.15|
|BMP388|0.0592|
|RGB LED|30|
|Buzzer|30|
|Estimated subtotal|195.21|

These values represent estimated current consumption rather than measured peak current draw.

## **Results**

After completing the schematic design and PCB layout, we arrived at the following PCB design.

![[final_pcb.png]]

![[pcb.gif]]