import type { BVHDebugConfig, BVHGroupToggleConfig } from "../bvhDebugger.service";
import { BVHDebuggerService } from "../bvhDebugger.service";

export interface BVHDebugConfigFile {
  groups: {
    [groupName: string]: {
      toggle: BVHGroupToggleConfig;
      config: BVHDebugConfig;
    };
  };
}

export const bvhDebugConfig: BVHDebugConfigFile = {
  groups: {
    moon: {
      toggle: {
        key: "p",
        groupName: "moon",
        description: "Moon BVH visualization",
        defaultEnabled: false,
      },
      config: {
        color: 0x00ff00,
        opacity: 0.3,
        depth: 8,
        showLeafNodes: true,
        showInternalNodes: true,
        wireframe: true,
      },
    },
    train: {
      toggle: {
        key: "o",
        groupName: "train",
        description: "Train head visualization",
        defaultEnabled: false,
      },
      config: {
        color: 0xff0000,
        opacity: 0.3,
        depth: 8,
        showLeafNodes: true,
        showInternalNodes: true,
        wireframe: true,
      },
    },
  },
};

export function setupBVHDebugger(bvhDebuggerService: BVHDebuggerService) {
  Object.values(bvhDebugConfig.groups).forEach(({ toggle, config }) => {
    bvhDebuggerService.registerGroupToggle(toggle);
    bvhDebuggerService.setGroupConfig(toggle.groupName, config);
  });
}
