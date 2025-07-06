import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";

export interface BVHDebugConfig {
  color?: number;
  opacity?: number;
  depth?: number;
  showLeafNodes?: boolean;
  showInternalNodes?: boolean;
  wireframe?: boolean;
}

export interface BVHGroupToggleConfig {
  key: string;
  groupName: string;
  description: string;
  defaultEnabled?: boolean;
}

/**
 * BVH Debugger Service - Singleton for BVH structure visualization
 */
export class BVHDebuggerService {
  private static instance: BVHDebuggerService;
  private scene?: THREE.Scene;
  private debugBoxes = new Map<string, THREE.Group>();
  private debugGroups = new Map<string, Set<string>>();
  private groupConfigs = new Map<string, BVHDebugConfig>();
  private enabled: boolean = false;
  private groupToggles = new Map<string, boolean>();
  private keyBindings = new Map<string, BVHGroupToggleConfig>();
  private keyListener?: (event: KeyboardEvent) => void;
  private initialized: boolean = false;
  // Track registered objects for automatic updates
  private registeredObjects = new Map<
    string,
    { object: THREE.Object3D; getId: () => string }
  >();
  // Cache for BVH visualizations to avoid recreating them every frame
  private visualizationCache = new Map<
    string,
    {
      meshId: string;
      meshUuid: string;
      configHash: string;
      lastUpdate: number;
    }
  >();

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): BVHDebuggerService {
    if (!BVHDebuggerService.instance) {
      BVHDebuggerService.instance = new BVHDebuggerService();
    }
    return BVHDebuggerService.instance;
  }

  /**
   * Initialize the service
   */
  public initialize(scene: THREE.Scene, enable: boolean): void {
    if (this.initialized) {
      return;
    }

    console.log("Initializing BVHDebuggerService...");
    this.initialized = true;

    // Set up global toggle key for hiding/showing all groups
    this.setupGlobalToggleKey();
    this.setScene(scene);
    this.enable(enable);
  }

  /**
   * Check if the service is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  public setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  public enable(enabled: boolean = true): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearAllBoxes();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Register a key binding to toggle a debug group
   */
  public registerGroupToggle(config: BVHGroupToggleConfig): void {
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

      // Check for global toggle key (B key for BVH)
      if (key === "b") {
        this.toggleAllGroups();
        return;
      }

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
   * Setup global toggle key for hiding/showing all groups
   */
  private setupGlobalToggleKey(): void {
    if (!this.keyListener) {
      this.setupKeyListener();
    }
  }

  /**
   * Check if a group is currently toggled on
   */
  public isGroupToggled(groupName: string): boolean {
    return this.groupToggles.get(groupName) ?? false;
  }

  /**
   * Set default configuration for a group of BVH visualizations
   */
  public setGroupConfig(groupName: string, config: BVHDebugConfig): void {
    this.groupConfigs.set(groupName, config);
    // Clear cache for this group since config changed
    this.clearVisualizationCache(groupName);
  }

  /**
   * Visualize BVH structure for a mesh
   */
  public visualizeBVH(
    groupName: string,
    meshId: string,
    mesh: THREE.Mesh,
    parentObject?: THREE.Object3D
  ): void {
    if (!this.enabled || !this.scene) return;

    // Check if this group is toggled on
    if (!this.isGroupToggled(groupName)) return;

    const fullId = `${groupName}:${meshId}`;

    // Add to group tracking
    if (!this.debugGroups.has(groupName)) {
      this.debugGroups.set(groupName, new Set());
    }
    this.debugGroups.get(groupName)!.add(fullId);

    // Remove existing visualization if it exists
    this.removeVisualizationById(fullId);

    // Check if mesh has BVH
    const geometry = mesh.geometry as any;
    if (!geometry.boundsTree) {
      console.warn(`Mesh ${meshId} does not have a BVH tree`);
      return;
    }

    const bvh = geometry.boundsTree as MeshBVH;

    // Get configuration
    const groupConfig = this.groupConfigs.get(groupName) || {};
    const config = {
      color: groupConfig.color ?? 0x00ff00,
      opacity: groupConfig.opacity ?? 0.3,
      depth: groupConfig.depth ?? 5,
      showLeafNodes: groupConfig.showLeafNodes ?? true,
      showInternalNodes: groupConfig.showInternalNodes ?? true,
      wireframe: groupConfig.wireframe ?? true,
      ...groupConfig,
    };

    // Create group to hold all BVH boxes
    const bvhGroup = new THREE.Group();
    bvhGroup.name = `BVH_${fullId}`;

    // Apply proper world transformations
    if (parentObject) {
      // Get world transform of the parent entity
      const worldMatrix = new THREE.Matrix4();
      parentObject.updateMatrixWorld();
      worldMatrix.copy(parentObject.matrixWorld);

      // Apply mesh local transform
      const meshMatrix = new THREE.Matrix4();
      mesh.updateMatrixWorld();
      meshMatrix.copy(mesh.matrixWorld);

      // Apply the combined transform to the BVH group
      bvhGroup.applyMatrix4(meshMatrix);
    } else {
      // Fallback to mesh transform only
      bvhGroup.position.copy(mesh.position);
      bvhGroup.rotation.copy(mesh.rotation);
      bvhGroup.scale.copy(mesh.scale);
    }

    // Traverse BVH and create boxes
    this.traverseBVH(bvh, bvhGroup, config, 0);

    this.scene.add(bvhGroup);
    this.debugBoxes.set(fullId, bvhGroup);
  }

  /**
   * Traverse BVH tree and create visualization boxes
   */
  private traverseBVH(
    bvh: MeshBVH,
    group: THREE.Group,
    config: BVHDebugConfig,
    depth: number
  ): void {
    if (depth > (config.depth || 5)) return;

    // Use BVH shapecast to traverse the tree structure
    bvh.shapecast({
      intersectsBounds: (box, isLeaf, _score, currentDepth, _nodeIndex) => {
        if (currentDepth > (config.depth || 5)) return false;

        const shouldShow =
          (isLeaf && config.showLeafNodes) ||
          (!isLeaf && config.showInternalNodes);

        if (shouldShow) {
          const boxViz = this.createBoundingBoxFromBox3(
            box,
            config,
            currentDepth
          );
          if (boxViz) {
            group.add(boxViz);
          }
        }

        return true; // Continue traversal
      },
      intersectsTriangle: () => {
        // We don't need to do anything with triangles for visualization
        return false;
      },
    });
  }

  /**
   * Create a bounding box visualization from a THREE.Box3
   */
  private createBoundingBoxFromBox3(
    box: THREE.Box3,
    config: BVHDebugConfig,
    depth: number
  ): THREE.Mesh | null {
    // Calculate size and center
    const size = new THREE.Vector3().subVectors(box.max, box.min);
    const center = new THREE.Vector3()
      .addVectors(box.min, box.max)
      .multiplyScalar(0.5);

    // Create box geometry
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);

    // Create material with depth-based color variation
    const hue = (depth * 0.1) % 1;
    const color = new THREE.Color().setHSL(hue, 0.7, 0.5);

    const material = new THREE.MeshBasicMaterial({
      color: config.color ?? color.getHex(),
      transparent: true,
      opacity: config.opacity ?? 0.3,
      wireframe: config.wireframe ?? true,
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(center);

    return mesh;
  }

  /**
   * Clear all visualizations for a specific group
   */
  public clearGroup(groupName: string): void {
    const group = this.debugGroups.get(groupName);
    if (!group) return;

    for (const fullId of group) {
      this.removeVisualizationById(fullId);
    }

    group.clear();
    // Clear cache for this group
    this.clearVisualizationCache(groupName);
  }

  /**
   * Clear all BVH visualizations
   */
  public clearAllBoxes(): void {
    if (!this.scene) return;

    for (const [, group] of this.debugBoxes.entries()) {
      this.scene.remove(group);
      this.disposeBVHGroup(group);
    }

    this.debugBoxes.clear();
    this.debugGroups.clear();
    // Clear all visualization cache
    this.clearVisualizationCache();
  }

  /**
   * Remove a specific visualization by its full ID
   */
  private removeVisualizationById(fullId: string): void {
    if (!this.scene) return;

    const group = this.debugBoxes.get(fullId);
    if (group) {
      this.scene.remove(group);
      this.disposeBVHGroup(group);
      this.debugBoxes.delete(fullId);
    }
  }

  /**
   * Dispose of a BVH group and all its resources
   */
  private disposeBVHGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
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
    } else {
      // When enabling a group, clear its cache to force recreation
      this.clearVisualizationCache(groupName);
    }
    // If enabled, the group will be populated when visualizations are set
  }

  /**
   * Toggle all groups on/off at once
   */
  public toggleAllGroups(): void {
    this.enable(!this.enabled);

    if (this.enabled) {
      console.log("All BVH debug groups enabled (Press B to disable)");
    } else {
      console.log("All BVH debug groups disabled (Press B to enable)");
    }
  }

  /**
   * Register an object for automatic BVH visualization updates
   */
  public registerObject(
    groupName: string,
    object: THREE.Object3D,
    getId: () => string
  ): void {
    this.registeredObjects.set(groupName, { object, getId });
  }

  /**
   * Unregister an object from automatic updates
   */
  public unregisterObject(groupName: string): void {
    this.registeredObjects.delete(groupName);
  }

  /**
   * Update all registered objects' BVH visualizations
   * Call this once per frame instead of manually checking each group
   */
  public updateAll(): void {
    if (!this.enabled) return;

    for (const [groupName, { object, getId }] of this.registeredObjects) {
      if (this.isGroupToggled(groupName)) {
        object.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry) {
            this.updateBVHVisualization(groupName, getId(), child, object);
          }
        });
      }
    }
  }

  /**
   * Only update BVH visualization if it hasn't been created yet or if something changed
   */
  private updateBVHVisualization(
    groupName: string,
    meshId: string,
    mesh: THREE.Mesh,
    parentObject?: THREE.Object3D
  ): void {
    const fullId = `${groupName}:${meshId}`;
    const configHash = this.getConfigHash(groupName);
    const meshUuid = mesh.uuid;

    const cached = this.visualizationCache.get(fullId);

    // Check if we need to create/update the visualization
    const needsUpdate =
      !cached ||
      cached.meshUuid !== meshUuid ||
      cached.configHash !== configHash ||
      !this.debugBoxes.has(fullId);

    if (needsUpdate) {
      // Create/update the visualization
      this.visualizeBVH(groupName, meshId, mesh, parentObject);

      // Update cache
      this.visualizationCache.set(fullId, {
        meshId,
        meshUuid,
        configHash,
        lastUpdate: Date.now(),
      });
    }
  }

  /**
   * Generate a hash of the current configuration for a group
   */
  private getConfigHash(groupName: string): string {
    const config = this.groupConfigs.get(groupName) || {};
    return JSON.stringify({
      color: config.color ?? 0x00ff00,
      opacity: config.opacity ?? 0.3,
      depth: config.depth ?? 5,
      showLeafNodes: config.showLeafNodes ?? true,
      showInternalNodes: config.showInternalNodes ?? true,
      wireframe: config.wireframe ?? true,
    });
  }

  /**
   * Clear visualization cache for a specific group
   */
  public clearVisualizationCache(groupName?: string): void {
    if (groupName) {
      // Clear cache for specific group
      const keysToDelete = Array.from(this.visualizationCache.keys()).filter(
        (key) => key.startsWith(`${groupName}:`)
      );
      keysToDelete.forEach((key) => this.visualizationCache.delete(key));
    } else {
      // Clear entire cache
      this.visualizationCache.clear();
    }
  }

  /**
   * Invalidate cache for a specific mesh - useful when mesh changes
   */
  public invalidateMeshCache(groupName: string, meshId: string): void {
    const fullId = `${groupName}:${meshId}`;
    this.visualizationCache.delete(fullId);
  }

  /**
   * Get cache statistics for debugging
   */
  public getCacheStats(): {
    totalEntries: number;
    groups: Record<string, number>;
  } {
    const stats = {
      totalEntries: this.visualizationCache.size,
      groups: {} as Record<string, number>,
    };

    for (const fullId of this.visualizationCache.keys()) {
      const groupName = fullId.split(":")[0];
      stats.groups[groupName] = (stats.groups[groupName] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clean up all resources
   */
  public dispose(): void {
    console.log("Disposing BVHDebuggerService...");
    this.clearAllBoxes();
    this.groupConfigs.clear();
    this.clearVisualizationCache();

    // Remove key listener
    if (this.keyListener) {
      window.removeEventListener("keydown", this.keyListener);
      this.keyListener = undefined;
    }

    this.keyBindings.clear();
    this.groupToggles.clear();
    this.initialized = false;
  }
}

// Export convenience function for easy access
export const bvhDebugger = () => BVHDebuggerService.getInstance();
