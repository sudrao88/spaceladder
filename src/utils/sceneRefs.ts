import * as THREE from 'three';
import React from 'react';

// Global ref to track the active rocket mesh for camera following
// This avoids complex context passing for high-frequency updates
export const activeRocketRef: React.MutableRefObject<THREE.Group | null> = { current: null };
