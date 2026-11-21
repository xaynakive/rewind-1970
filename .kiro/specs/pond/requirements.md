# Requirements: Pond

## Introduction
A still pond in the front yard glows under a blood moon. A skeleton rests beneath the surface. The user only glimpses it during lightning or right after ripples clear the water. It is the house's quiet secret.

## Requirements

### Requirement 1: The water
#### Acceptance criteria
1. The system SHALL render the pond as a reflective water surface that reflects the blood moon and the sky.
2. WHEN the user clicks or taps the water THEN the system SHALL create a ripple from that point that spreads and fades over about 3 seconds.
3. The system SHALL support at least 8 active ripples at once.

### Requirement 2: The skeleton
**User story:** As a user, I want to sometimes glimpse something beneath the water, so that the pond feels like it is hiding a secret.

#### Acceptance criteria
1. The skeleton SHALL NOT be visible under normal lighting.
2. WHEN lightning strikes THEN the system SHALL show the skeleton through the water for the duration of the flash.
3. WHEN a ripple has spread across the point above the skeleton THEN the system SHALL show the skeleton faintly for 0.3–0.6 seconds as the water settles.
4. The skeleton SHALL be shown as a pale, still, low-poly shape. It SHALL NOT move toward the user or come with a loud sound.
5. WHEN the user has seen the skeleton 3 times while at the pond THEN the system SHALL record, once and on the device, that the pond's secret was noticed, for use by the endings system.

### Requirement 3: The pond tape
#### Acceptance criteria
1. WHEN a tape is placed in the `pond` hiding spot THEN the system SHALL let it float up to the surface slowly when the user is at the pond viewpoint.
2. WHILE a pond tape is still under the water THEN the system SHALL NOT let the user pick it up.
