import type { Entity } from "../entities/entity";
import type { Moon } from "../entities/moon";
import type { RayDebuggerManager } from "./rayDebuggerManager";
import * as THREE from "three";

export interface SurfaceData {
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

export interface SurfaceConstraintResult {
  direction: THREE.Vector3;
  speed: number;
  surfaceRotation?: THREE.Quaternion;
}

export interface PredictiveCollisionResult {
  willCollide: boolean;
  urgency: number;
}

export class SurfaceConstraintsManager {
  private rayDebugger?: RayDebuggerManager;
  private previousSurfaceNormals: Map<string, THREE.Vector3> = new Map();
  private surfaceDataCache: Map<string, { 
    point: THREE.Vector3; 
    normal: THREE.Vector3; 
    timestamp: number; 
    distance: number;
  }> = new Map();
  private readonly CACHE_DURATION = 2000; // Cache for 2 seconds to drastically reduce raycasting
  private raycastScheduler: Map<string, number> = new Map(); // Track when each entity should raycast next
  private entityRaycastQueue: string[] = []; // Round-robin queue for raycasting

  public setRayDebugger(rayDebugger: RayDebuggerManager): void {
    this.rayDebugger = rayDebugger;
  }

  public findClosestPointOnMoonSurface(
    entity: Entity,
    moon: Moon
  ): SurfaceData | null {
    const entityPos = entity.getPosition();
    const moonPos = moon.getPosition();
    const entityId = entity.getId();
    const now = Date.now();
    
    // Calculate distance to moon center
    const distanceToMoon = entityPos.distanceTo(moonPos);
    
    // Check if we have cached data that's still valid
    const cachedData = this.surfaceDataCache.get(entityId);
    if (cachedData && (now - cachedData.timestamp) < this.CACHE_DURATION) {
      // Use cached data
      return {
        point: cachedData.point,
        normal: cachedData.normal
      };
    }
    
    // Determine if we should do expensive raycasting based on distance and schedule
    const shouldRaycast = this.shouldPerformRaycast(entityId, distanceToMoon);
    
    if (shouldRaycast) {
      // Perform actual raycasting (expensive operation)
      const raycastResult = this.performRaycast(entity, moon);
      if (raycastResult) {
        // Cache the result for a long time
        this.surfaceDataCache.set(entityId, {
          point: raycastResult.point,
          normal: raycastResult.normal,
          timestamp: now,
          distance: distanceToMoon
        });
        
        return raycastResult;
      }
    }
    
    // Fallback to fast geometric approximation
    return this.getGeometricSurfaceApproximation(entityPos, moonPos, entityId);
  }

  private shouldPerformRaycast(entityId: string, distanceToMoon: number): boolean {
    const now = Date.now();
    
    // Never raycast if very far from moon
    if (distanceToMoon > 100) return false;
    
    // Check if entity is scheduled for raycasting
    const nextRaycastTime = this.raycastScheduler.get(entityId) || 0;
    if (now < nextRaycastTime) return false;
    
    // Only raycast one entity per frame maximum
    if (this.entityRaycastQueue.length > 0 && this.entityRaycastQueue[0] !== entityId) {
      return false;
    }
    
    // Schedule next raycast based on distance (closer = more frequent)
    let raycastInterval: number;
    if (distanceToMoon < 25) {
      raycastInterval = 100; // Every 100ms when very close
    } else if (distanceToMoon < 50) {
      raycastInterval = 500; // Every 500ms when close
    } else {
      raycastInterval = 2000; // Every 2 seconds when far
    }
    
    this.raycastScheduler.set(entityId, now + raycastInterval);
    
    // Add to queue if not already there
    if (!this.entityRaycastQueue.includes(entityId)) {
      this.entityRaycastQueue.push(entityId);
    }
    
    return true;
  }

  private performRaycast(entity: Entity, moon: Moon): SurfaceData | null {
    const entityPos = entity.getPosition();
    const moonPos = moon.getPosition();

    // Primary raycast for surface point
    const raycaster = new THREE.Raycaster();
    const direction = moonPos.clone().sub(entityPos).normalize();
    raycaster.set(entityPos, direction);

    const intersects = raycaster.intersectObject(moon.object, true);

    if (intersects.length > 0) {
      const intersection = intersects[0];
      const surfacePoint = intersection.point;
      
      // Use face normal if available, otherwise geometric normal
      const surfaceNormal = intersection.face 
        ? intersection.face.normal.clone()
        : surfacePoint.clone().sub(moonPos).normalize();
      
      return {
        point: surfacePoint,
        normal: surfaceNormal
      };
    }

    return null;
  }

  private getGeometricSurfaceApproximation(
    entityPos: THREE.Vector3, 
    moonPos: THREE.Vector3, 
    entityId: string
  ): SurfaceData {
    // Use sphere approximation with estimated radius
    const moonRadius = 20; // Approximate moon radius
    const directionToMoon = moonPos.clone().sub(entityPos).normalize();
    const surfacePoint = moonPos.clone().add(directionToMoon.clone().multiplyScalar(-moonRadius));
    const surfaceNormal = directionToMoon.clone().negate();
    
    // Apply temporal smoothing for stability
    const prevNormal = this.previousSurfaceNormals.get(entityId);
    let finalNormal = surfaceNormal;
    
    if (prevNormal) {
      // Heavy smoothing for geometric approximation
      finalNormal = prevNormal.clone().lerp(surfaceNormal, 0.1);
    }
    
    this.previousSurfaceNormals.set(entityId, finalNormal.clone());
    
    return {
      point: surfacePoint,
      normal: finalNormal
    };
  }

  public applySurfaceConstraints(
    entity: Entity,
    moon: Moon,
    direction: THREE.Vector3,
    speed: number,
    minDistance: number = 2.0
  ): SurfaceConstraintResult {
    const surfaceData = this.findClosestPointOnMoonSurface(entity, moon);
    if (!surfaceData) return { direction, speed };

    const { point: surfacePoint, normal: surfaceNormal } = surfaceData;
    const entityPos = entity.getPosition();
    
    // Calculate distance to surface
    const entityToSurface = surfacePoint.clone().sub(entityPos);
    const distanceToSurface = entityToSurface.length();
    
    // Use the smoothed surface normal
    const worldNormal = surfaceNormal.clone().normalize();
    
    // Calculate speed-based minimum distance (faster = need more distance)
    const speedBasedMinDistance = minDistance + (speed * 0.1); // Add 0.1 units per speed unit
    
    // Perform predictive collision detection
    const predictiveResults = this.performPredictiveCollisionCheck(
      entity, moon, direction, speed, worldNormal, entityPos
    );
    
    let finalDirection = direction.clone();
    let finalSpeed = speed;
    
    // Apply predictive braking if collision detected ahead
    if (predictiveResults.willCollide) {
      const brakingFactor = Math.max(0.3, 1.0 - predictiveResults.urgency);
      finalSpeed *= brakingFactor;
      
      // Apply stronger upward force to avoid collision
      const avoidanceForce = worldNormal.clone().multiplyScalar(predictiveResults.urgency * 0.5);
      finalDirection = finalDirection.add(avoidanceForce).normalize();
    }
    
    if (distanceToSurface < speedBasedMinDistance) {
      // Project movement direction onto surface plane to prevent going through
      const projectedDirection = finalDirection.clone().sub(
        worldNormal.clone().multiplyScalar(finalDirection.dot(worldNormal))
      );
      
      // Preserve speed when projecting onto surface
      if (projectedDirection.length() > 0.01) {
        projectedDirection.normalize();
        finalDirection = projectedDirection;
        // Keep original speed when projecting (already modified by predictive braking)
        finalSpeed = finalSpeed;
      }
      
      // Add surface push force with speed-based strength
      const speedFactor = Math.min(speed / 20, 2.0); // Scale with speed, cap at 2x
      const pushStrength = Math.pow((speedBasedMinDistance - distanceToSurface) / speedBasedMinDistance, 2);
      const pushForce = worldNormal.clone().multiplyScalar(pushStrength * 0.2 * speedFactor);
      
      // Add push force but maintain speed magnitude
      const combinedDirection = finalDirection.add(pushForce);
      if (combinedDirection.length() > 0.01) {
        finalDirection = combinedDirection.normalize();
        // Apply speed reduction based on how close we are to surface
        const proximityFactor = Math.max(0.5, distanceToSurface / speedBasedMinDistance);
        finalSpeed = Math.max(finalSpeed * proximityFactor, finalSpeed * 0.3);
      }
    } else {
      // When close to surface, project movement to follow surface contour
      if (distanceToSurface < speedBasedMinDistance * 2) {
        const projectedDirection = finalDirection.clone().sub(
          worldNormal.clone().multiplyScalar(finalDirection.dot(worldNormal))
        );
        
        // Calculate slope factor for speed adjustment
        const slopeAngle = Math.acos(Math.abs(worldNormal.dot(new THREE.Vector3(0, 1, 0))));
        const slopeFactor = this.calculateSlopeSpeedFactor(finalDirection, worldNormal, slopeAngle);
        
        // Blend between free movement and surface-following
        const blendFactor = Math.pow(1 - (distanceToSurface - speedBasedMinDistance) / speedBasedMinDistance, 2);
        
        if (projectedDirection.length() > 0.01) {
          projectedDirection.normalize();
          finalDirection = finalDirection.lerp(projectedDirection, blendFactor * 0.7);
          finalDirection.normalize();
          
          // Apply slope-based speed modification with speed-sensitive limits
          const speedSensitiveSlopeFactor = this.getSpeedSensitiveSlopeFactor(slopeFactor, speed);
          finalSpeed = finalSpeed * speedSensitiveSlopeFactor;
        } else {
          // If projection is too small, keep original direction but apply slope factor
          const speedSensitiveSlopeFactor = this.getSpeedSensitiveSlopeFactor(slopeFactor, speed);
          finalSpeed = finalSpeed * speedSensitiveSlopeFactor;
        }
      }
    }
    
    // Calculate surface-aligned rotation with additional smoothing
    const surfaceRotation = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    
    // Blend surface normal with a slight upward bias for stability
    const stabilizedNormal = worldNormal.clone().lerp(up, 0.1).normalize();
    surfaceRotation.setFromUnitVectors(up, stabilizedNormal);
    
    return {
      direction: finalDirection,
      speed: finalSpeed,
      surfaceRotation
    };
  }

  private performPredictiveCollisionCheck(
    entity: Entity,
    moon: Moon,
    direction: THREE.Vector3,
    speed: number,
    surfaceNormal: THREE.Vector3,
    currentPos: THREE.Vector3
  ): PredictiveCollisionResult {
    // Calculate how many frames ahead to check based on speed
    const framesToCheck = Math.min(Math.max(Math.floor(speed / 5), 1), 4);
    
    // Check if we're moving toward the surface
    const velocityTowardSurface = direction.dot(surfaceNormal.clone().negate());
    
    if (velocityTowardSurface <= 0) {
      // Not moving toward surface, no collision risk
      return { willCollide: false, urgency: 0 };
    }
    
    // Predict positions for next few frames
    for (let frame = 1; frame <= framesToCheck; frame++) {
      const frameTime = frame / 60.0; // Assuming 60fps
      const predictedPos = currentPos.clone().add(
        direction.clone().multiplyScalar(speed * frameTime)
      );
      
      // Check distance to surface at predicted position
      const predictedSurfaceData = this.findClosestPointOnMoonSurface(
        { getPosition: () => predictedPos, getId: () => entity.getId() } as Entity,
        moon
      );
      
      if (predictedSurfaceData) {
        const predictedDistance = predictedSurfaceData.point.distanceTo(predictedPos);
        const requiredDistance = 2.0 + (speed * 0.1); // Speed-based minimum distance
        
        if (predictedDistance < requiredDistance) {
          // Collision detected! Calculate urgency based on how soon and how severe
          const urgency = Math.min(1.0, (requiredDistance - predictedDistance) / requiredDistance);
          const timeUrgency = 1.0 - (frame / framesToCheck);
          
          return { 
            willCollide: true, 
            urgency: (urgency + timeUrgency) / 2 
          };
        }
      }
    }
    
    return { willCollide: false, urgency: 0 };
  }

  private getSpeedSensitiveSlopeFactor(baseSlopeFactor: number, speed: number): number {
    // Reduce downhill speed bonuses when moving very fast to prevent surface penetration
    if (baseSlopeFactor > 1.0 && speed > 15) {
      const speedPenalty = Math.min((speed - 15) / 20, 0.5); // Max 50% penalty
      return baseSlopeFactor - (baseSlopeFactor - 1.0) * speedPenalty;
    }
    
    return baseSlopeFactor;
  }

  private calculateSlopeSpeedFactor(
    movementDirection: THREE.Vector3,
    surfaceNormal: THREE.Vector3,
    slopeAngle: number
  ): number {
    // Calculate if we're going uphill or downhill
    const up = new THREE.Vector3(0, 1, 0);
    
    // Project movement onto the slope to get the slope direction
    const slopeDirection = movementDirection.clone().sub(
      surfaceNormal.clone().multiplyScalar(movementDirection.dot(surfaceNormal))
    ).normalize();
    
    // Check if movement is going up or down the slope
    const slopeDotUp = slopeDirection.dot(up);
    
    // Base speed factor based on slope steepness
    const maxSlopeEffect = 0.4; // Maximum 40% speed change
    const slopeEffect = Math.sin(slopeAngle) * maxSlopeEffect;
    
    let speedFactor = 1.0;
    
    if (slopeDotUp > 0.1) {
      // Going uphill - reduce speed
      speedFactor = 1.0 - slopeEffect * 0.7; // Reduce by up to 28%
    } else if (slopeDotUp < -0.1) {
      // Going downhill - increase speed
      speedFactor = 1.0 + slopeEffect * 0.5; // Increase by up to 20%
    }
    
    // Clamp speed factor to reasonable bounds
    return Math.max(0.4, Math.min(1.6, speedFactor));
  }

  public checkIfUnderground(
    entityPos: THREE.Vector3,
    moon: Moon,
    surfaceData: SurfaceData
  ): boolean {
    // Method 1: Check if entity is below the closest surface point
    const surfaceToEntity = entityPos.clone().sub(surfaceData.point);
    const distanceToSurface = surfaceToEntity.length();
    
    // Check if the entity is on the "inside" of the surface normal
    const isOnWrongSide = surfaceToEntity.dot(surfaceData.normal) < 0;
    
    // Method 2: Additional check using moon's approximate geometry
    const moonCenter = moon.getPosition();
    
    // Calculate approximate moon radius from bounding box
    const moonRadius = this.calculateApproximateMoonRadius(moon);
    const distanceFromCenter = entityPos.distanceTo(moonCenter);
    
    // If entity is significantly inside the moon's approximate radius, it's underground
    const isInsideApproximateRadius = distanceFromCenter < (moonRadius - 1.0);
    
    // Method 3: Raycast from entity upward to see if it hits the surface
    const upwardRay = new THREE.Raycaster(entityPos, new THREE.Vector3(0, 1, 0));
    
    const intersections = upwardRay.intersectObject(moon.object, true);
    const hasUpwardIntersection = intersections.length > 0;
    
    // If we're below surface and there's geometry above us, we're underground
    if (isOnWrongSide && hasUpwardIntersection && distanceToSurface < 0.5) {
      return true;
    }
    
    // Conservative check: if entity is clearly inside the moon's radius
    return isInsideApproximateRadius;
  }

  public performUndergroundRecovery(
    entity: Entity,
    moon: Moon,
    surfaceData: SurfaceData
  ): { direction: THREE.Vector3; speed: number } {
    const entityPos = entity.getPosition();
    const moonCenter = moon.getPosition();
    
    // Strategy 1: Push directly toward surface along surface normal
    const recoveryDirection = surfaceData.normal.clone().normalize();
    
    // Calculate how far underground we are
    const surfaceToEntity = entityPos.clone().sub(surfaceData.point);
    const undergroundDistance = Math.abs(surfaceToEntity.dot(surfaceData.normal));
    
    // Strategy 2: If normal-based recovery isn't enough, push radially outward from moon center
    const radialDirection = entityPos.clone().sub(moonCenter).normalize();
    const moonRadius = this.calculateApproximateMoonRadius(moon);
    const distanceFromCenter = entityPos.distanceTo(moonCenter);
    
    let finalRecoveryDirection: THREE.Vector3;
    
    if (distanceFromCenter < moonRadius - 2.0) {
      // Far underground - use radial recovery
      finalRecoveryDirection = radialDirection;
    } else {
      // Close to surface - use surface normal with radial bias
      finalRecoveryDirection = recoveryDirection.clone()
        .lerp(radialDirection, 0.3) // 30% radial bias
        .normalize();
    }
    
    // Apply strong upward recovery force
    const recoveryStrength = Math.min(undergroundDistance * 2.0, 10.0); // Cap at 10 units
    
    // Emergency speed reduction during recovery
    const emergencySpeed = 2.0; // Slow down significantly during recovery
    
    // Debug logging for underground recovery
    if (this.rayDebugger) {
      this.rayDebugger.setRay("recovery", entity.getId(), {
        id: entity.getId(),
        origin: entityPos,
        direction: finalRecoveryDirection,
        magnitude: recoveryStrength,
      });
    }
    
    return {
      direction: finalRecoveryDirection,
      speed: emergencySpeed
    };
  }

  private calculateApproximateMoonRadius(moon: Moon): number {
    // Calculate approximate radius from moon's bounding box
    const box = new THREE.Box3().setFromObject(moon.object);
    const size = box.getSize(new THREE.Vector3());
    
    // Use the average of the dimensions as an approximate radius
    const avgRadius = (size.x + size.y + size.z) / 6; // Divide by 6 for radius (diameter/2)
    
    // Return a reasonable minimum radius to prevent division by zero
    return Math.max(avgRadius, 10.0);
  }

  public processRaycastQueue(): void {
    // Process one entity from raycast queue per frame
    if (this.entityRaycastQueue.length > 0) {
      this.entityRaycastQueue.shift(); // Remove processed entity from queue
    }
  }

  public cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.surfaceDataCache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION * 2) {
        this.surfaceDataCache.delete(key);
      }
    }
  }

  public cleanupEntity(entityId: string): void {
    this.previousSurfaceNormals.delete(entityId);
    this.surfaceDataCache.delete(entityId);
    this.raycastScheduler.delete(entityId);
    
    // Remove from raycast queue
    const index = this.entityRaycastQueue.indexOf(entityId);
    if (index > -1) {
      this.entityRaycastQueue.splice(index, 1);
    }
  }
}
