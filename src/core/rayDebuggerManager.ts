import * as THREE from "three";

export interface DebugRayConfig {
  color?: number;
  length?: number;
  maxLength?: number;
  scaleFactor?: number;
  headLength?: number;
  headWidth?: number;
  opacity?: number;
}

export interface DebugRay {
  id: string;
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  magnitude: number;
  config?: DebugRayConfig;
}

export interface GroupToggleConfig {
  key: string;
  groupName: string;
  description: string;
  defaultEnabled?: boolean;
}

export class RayDebuggerManager {
  private scene?: THREE.Scene;
  private debugRays = new Map<string, THREE.ArrowHelper>();
  private debugGroups = new Map<string, Set<string>>();
  private groupConfigs = new Map<string, DebugRayConfig>();
  private enabled: boolean = false;
  private groupToggles = new Map<string, boolean>();
  private keyBindings = new Map<string, GroupToggleConfig>();
  private keyListener?: (event: KeyboardEvent) => void;

  public setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  public enable(enabled: boolean = true): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearAllRays();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Register a key binding to toggle a debug group
   */
  public registerGroupToggle(config: GroupToggleConfig): void {
    this.keyBindings.set(config.key.toLowerCase(), config);
    this.groupToggles.set(config.groupName, config.defaultEnabled ?? false);

    // Set up key listener if not already done
    if (!this.keyListener) {
      this.setupKeyListener();
    }
  }

  /**
   * Setup keyboard event listener for group toggles
   */
  private setupKeyListener(): void {
    this.keyListener = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const config = this.keyBindings.get(key);

      if (config) {
        const currentState = this.groupToggles.get(config.groupName) ?? false;
        const newState = !currentState;

        this.groupToggles.set(config.groupName, newState);
        this.enableGroup(config.groupName, newState);

        console.log(
          `${config.description} ${newState ? "enabled" : "disabled"}`
        );
      }
    };

    window.addEventListener("keydown", this.keyListener);
  }

  /**
   * Check if a group is currently toggled on
   */
  public isGroupToggled(groupName: string): boolean {
    return this.groupToggles.get(groupName) ?? false;
  }

  /**
   * Set default configuration for a group of rays
   */
  public setGroupConfig(groupName: string, config: DebugRayConfig): void {
    this.groupConfigs.set(groupName, config);
  }

  /**
   * Add or update a single debug ray
   */
  public setRay(groupName: string, rayId: string, ray: DebugRay): void {
    if (!this.enabled || !this.scene) return;

    // Check if this group is toggled on
    if (!this.isGroupToggled(groupName)) return;

    const fullId = `${groupName}:${rayId}`;

    // Add to group tracking
    if (!this.debugGroups.has(groupName)) {
      this.debugGroups.set(groupName, new Set());
    }
    this.debugGroups.get(groupName)!.add(fullId);

    // Remove existing ray if it exists
    this.removeRayById(fullId);

    // Don't create ray if there's no force/direction
    if (ray.magnitude === 0 || ray.direction.length() === 0) {
      return;
    }

    // Get configuration (ray-specific overrides group config)
    const groupConfig = this.groupConfigs.get(groupName) || {};
    const config = { ...groupConfig, ...ray.config };

    // Apply defaults
    const finalConfig = {
      color: config.color ?? 0xff0000,
      scaleFactor: config.scaleFactor ?? 1,
      maxLength: config.maxLength ?? 50,
      opacity: config.opacity ?? 1,
      ...config,
    };

    // Calculate ray properties
    const direction = ray.direction.clone().normalize();
    const rawLength = ray.magnitude * finalConfig.scaleFactor;
    const length = Math.min(rawLength, finalConfig.maxLength);

    const headLength = finalConfig.headLength ?? length * 0.2;
    const headWidth = finalConfig.headWidth ?? length * 0.1;

    // Create arrow helper
    const arrowHelper = new THREE.ArrowHelper(
      direction,
      ray.origin,
      length,
      finalConfig.color,
      headLength,
      headWidth
    );

    // Set opacity if needed
    if (finalConfig.opacity < 1) {
      const lineMaterial = arrowHelper.line.material as THREE.Material;
      const coneMaterial = arrowHelper.cone.material as THREE.Material;

      lineMaterial.transparent = true;
      lineMaterial.opacity = finalConfig.opacity;
      coneMaterial.transparent = true;
      coneMaterial.opacity = finalConfig.opacity;
    }

    if (!this.scene) return;

    this.scene.add(arrowHelper);
    this.debugRays.set(fullId, arrowHelper);
  }

  /**
   * Update multiple rays at once for a group
   */
  public setRaysForGroup(groupName: string, rays: Map<string, DebugRay>): void {
    if (!this.enabled) return;

    // Clear existing rays for this group
    this.clearGroup(groupName);

    // Add new rays
    for (const [rayId, ray] of rays.entries()) {
      this.setRay(groupName, rayId, ray);
    }
  }

  /**
   * Clear all rays for a specific group
   */
  public clearGroup(groupName: string): void {
    const group = this.debugGroups.get(groupName);
    if (!group) return;

    for (const fullId of group) {
      this.removeRayById(fullId);
    }

    group.clear();
  }

  /**
   * Clear all debug rays
   */
  public clearAllRays(): void {
    if (!this.scene) return;

    for (const [, arrow] of this.debugRays.entries()) {
      this.scene.remove(arrow);
      arrow.dispose();
    }

    this.debugRays.clear();
    this.debugGroups.clear();
  }

  /**
   * Remove a specific ray by its full ID
   */
  private removeRayById(fullId: string): void {
    if (!this.scene) return;

    const arrow = this.debugRays.get(fullId);
    if (arrow) {
      this.scene.remove(arrow);
      arrow.dispose();
      this.debugRays.delete(fullId);
    }
  }

  /**
   * Get all groups currently being debugged
   */
  public getActiveGroups(): string[] {
    return Array.from(this.debugGroups.keys());
  }

  /**
   * Check if a group is active
   */
  public isGroupActive(groupName: string): boolean {
    return (
      this.debugGroups.has(groupName) &&
      this.debugGroups.get(groupName)!.size > 0
    );
  }

  /**
   * Enable/disable a specific group
   */
  public enableGroup(groupName: string, enabled: boolean): void {
    if (!enabled) {
      this.clearGroup(groupName);
    }
    // If enabled, the group will be populated when rays are set
  }

  /**
   * Clean up all resources
   */
  public dispose(): void {
    this.clearAllRays();
    this.groupConfigs.clear();

    // Remove key listener
    if (this.keyListener) {
      window.removeEventListener("keydown", this.keyListener);
      this.keyListener = undefined;
    }

    this.keyBindings.clear();
    this.groupToggles.clear();
  }
}
